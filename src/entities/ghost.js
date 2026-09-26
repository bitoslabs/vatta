'use strict';

import { GHOST, WORLD } from '../core/constants.js';
import { clamp, dist, lerp } from '../core/math.js';
import { state } from '../core/state.js';
import { emit, EVENTS } from '../core/events.js';
import { getPathModifiers } from '../systems/path.js';
import { getRealmModifier } from '../systems/samsara.js';
import { fade } from '../ui/feedback.js';
import { TREES } from '../world/world-data.js';
import { cam } from '../game/camera.js';
import { STATUS } from './ghost-status.js';
import { inSafeZone, player } from './player.js';

/** Default chase tuning; chapters may override any field. */
export const DEFAULT_GHOST_PROFILE = Object.freeze({
  baseSpeed: GHOST.baseSpeed,
  fearSpeedBonus: GHOST.fearSpeedBonus,
  mindSpeedBase: GHOST.mindSpeedBase,
  mindSpeedFearBonus: GHOST.mindSpeedFearBonus,
  mindDissolveTime: 2.8,
  enrageSpeedFactor: 1.6,
  /** >0 makes the spirit hold its distance instead of chasing to the catch. */
  standOff: 0,
  /** When true the spirit retraces a recorded path (ghost.replayTarget) instead of chasing. */
  replay: false,
});

function createGhostState() {
  return {
    active: false,
    x: 0,
    y: 0,
    alpha: 0,
    stun: 0,
    fade: 0,
    trail: [],
    respawn: 0,
    mode: STATUS.HUNT,
    enraged: 0,
    pacified: false,
    /** Visual size multiplier — the "self" grows as ego grows. */
    scale: 1,
    /** Destination used when profile.replay is set (habit walks the old path). */
    replayTarget: null,
    mindDissolve: true,
    respawnOnFade: true,
    tint: null,
    profile: { ...DEFAULT_GHOST_PROFILE },
    // per-spirit mindfulness bookkeeping
    mindHold: 0,
    mindHoldPrev: false,
  };
}

/**
 * The haunting spirits. `ghost` is the primary and always exists (so chapters
 * 1–10 keep their simple single-spirit API); `ghosts` also holds any additional
 * spirits a chapter summons (e.g. the pair in chapter 11).
 */
export const ghost = createGhostState();
export const ghosts = [ghost];

export function resetGhost(options = {}) {
  const fresh = createGhostState();
  fresh.mindDissolve = options.mindDissolve !== false;
  fresh.respawnOnFade = options.respawnOnFade !== false;
  fresh.tint = options.tint || null;
  fresh.profile = { ...DEFAULT_GHOST_PROFILE, ...(options.profile || {}) };
  Object.assign(ghost, fresh);
  ghosts.length = 1;
}

/** Summon an additional spirit; the primary is always index 0. */
export function addGhost(options = {}) {
  const extra = createGhostState();
  extra.mindDissolve = options.mindDissolve !== false;
  extra.respawnOnFade = false;
  extra.tint = options.tint || null;
  extra.profile = { ...DEFAULT_GHOST_PROFILE, ...(options.profile || {}) };
  ghosts.push(extra);
  return extra;
}

export function removeGhost(target) {
  const index = ghosts.indexOf(target);
  if (index > 0) ghosts.splice(index, 1);
}

function placeAt(target, x, y) {
  target.active = true;
  target.mode = STATUS.HUNT;
  target.alpha = 0;
  target.stun = 0;
  target.enraged = 0;
  target.pacified = false;
  target.x = clamp(x, 100, WORLD.w - 100);
  target.y = clamp(y, 100, WORLD.h - 100);
}

export function placeGhost(x, y) {
  placeAt(ghost, x, y);
}

export function placeGhostAt(target, x, y) {
  placeAt(target, x, y);
}

export function spawnGhostNearPlayer(offsetX = 820, offsetY = -80) {
  placeAt(ghost, player.x + offsetX, player.y + offsetY);
}

export function enrageGhost(seconds, target = ghost) {
  if (!target.active) return;
  target.enraged = Math.max(target.enraged, seconds);
  target.stun = 0;
}

/** Update every spirit (primary and any summoned extras). */
export function updateGhosts(dt, mind, frozen) {
  for (const spirit of [...ghosts]) updateGhost(spirit, dt, mind, frozen);
}

function updateGhost(g, dt, mind, frozen) {
  if (g.respawn > 0) {
    g.respawn -= dt;
    if (g.respawn <= 0) spawnGhostNearPlayer();
    return;
  }

  if (!g.active) return;

  g.alpha = lerp(g.alpha, g.mode === STATUS.FADE ? 0 : 1, dt * 1.4);

  if (g.mode === STATUS.FADE) {
    g.fade -= dt;
    if (g.fade <= 0) {
      g.active = false;
      g.alpha = 0;
      g.pacified = true;
      if (g.respawnOnFade) g.respawn = GHOST.respawnDelay;
      return;
    }
  }

  if (frozen) return;

  if (g.enraged > 0) g.enraged = Math.max(0, g.enraged - dt);

  const d = dist(player.x, player.y, g.x, g.y);
  const playerSafe = inSafeZone(player.x, player.y);

  // The first moment of mindfulness staggers the spirit (unless it is enraged).
  const justMindful = mind && !g.mindHoldPrev;
  if (justMindful && d < 560 && g.enraged <= 0) g.stun = GHOST.stunDuration;
  g.mindHoldPrev = mind;
  if (g.stun > 0) {
    g.stun -= dt;
    return;
  }

  // Sustained mindfulness makes it retreat and dissolve.
  if (mind && d < 520) {
    g.mindHold += dt;
    const away = Math.atan2(g.y - player.y, g.x - player.x);
    g.x += Math.cos(away) * GHOST.retreatSpeed * dt;
    g.y += Math.sin(away) * GHOST.retreatSpeed * dt;
    // Higher planes and an unfolding path of practice need less mindfulness.
    const dissolveTime = g.profile.mindDissolveTime
      * getRealmModifier().mindDissolve
      * getPathModifiers().mindDissolve;
    if (g.mindDissolve && g.enraged <= 0 && g.mindHold > dissolveTime) {
      g.mode = STATUS.FADE;
      g.fade = GHOST.fadeDuration;
      g.mindHold = 0;
      emit(EVENTS.GHOST_PACIFIED, 'mind');
    }
  } else {
    g.mindHold = Math.max(0, g.mindHold - dt * 2);
  }

  if (playerSafe) {
    const dx = player.x - g.x;
    const dy = player.y - g.y;
    const dd = Math.hypot(dx, dy);
    if (dd > 0.001 && dd < 760) {
      g.x -= (dx / dd) * 60 * dt;
      g.y -= (dy / dd) * 60 * dt;
    }
    return;
  }

  // A spirit that keeps its distance (attachment) never closes in to catch you.
  if (g.profile.standOff > 0 && d <= g.profile.standOff) {
    const away = Math.atan2(g.y - player.y, g.x - player.x);
    g.x += Math.cos(away) * 18 * dt;
    g.y += Math.sin(away) * 18 * dt;
    pushTrail(g);
    return;
  }

  // Chase speed scales with the player's own agitation.
  let speed = g.profile.baseSpeed + state.fear * g.profile.fearSpeedBonus;
  if (mind) speed = g.profile.mindSpeedBase + state.fear * g.profile.mindSpeedFearBonus;
  if (g.enraged > 0) speed *= g.profile.enrageSpeedFactor;

  const ang = Math.atan2(player.y - g.y, player.x - g.x);

  if (g.profile.replay && g.replayTarget) {
    // Habit: it walks the path you already walked, not the one you are on.
    const tx = g.replayTarget.x - g.x;
    const ty = g.replayTarget.y - g.y;
    const td = Math.hypot(tx, ty) || 1;
    const step = Math.min(td, speed * dt);
    g.x += (tx / td) * step;
    g.y += (ty / td) * step;
  } else {
    g.x += Math.cos(ang) * speed * dt;
    g.y += Math.sin(ang) * speed * dt;
  }

  for (const tree of TREES) {
    const td = dist(g.x, g.y, tree.x, tree.y);
    const minDist = tree.r + 18;
    if (td < minDist && td > 0) {
      g.x += ((g.x - tree.x) / td) * (minDist - td) * 0.5;
      g.y += ((g.y - tree.y) / td) * (minDist - td) * 0.5;
    }
  }

  // Never let it fall impossibly far behind (chasing spirits only).
  if (d > 1400 && !g.profile.replay) {
    g.x = player.x - Math.cos(ang) * 900;
    g.y = player.y - Math.sin(ang) * 900;
  }

  pushTrail(g);

  if (d < GHOST.catchDistance && g.mode === STATUS.HUNT) onCaught(g);
}

function pushTrail(g) {
  g.trail.unshift({ x: g.x, y: g.y });
  if (g.trail.length > 10) g.trail.pop();
}

function onCaught(g) {
  state.stats.caught++;
  // A catch is a checkpoint setback. Only a completed life resolves kamma and
  // changes realm/body; a missed dodge must not silently rebirth the player.
  fade(true, () => {
    const checkpoint = state.checkpoint;
    player.x = checkpoint.x;
    player.y = checkpoint.y;
    state.fear = 0.92;
    cam.x = player.x;
    cam.y = player.y;
    g.x = clamp(player.x + 850, 100, WORLD.w - 100);
    g.y = player.y - 70;
    g.stun = 1.6;
    g.enraged = 0;
    setTimeout(() => {
      fade(false);
    }, 2400);
  });
}
