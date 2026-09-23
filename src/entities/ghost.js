'use strict';

import { GHOST, WORLD } from '../core/constants.js';
import { clamp, dist, lerp } from '../core/math.js';
import { state } from '../core/state.js';
import { emit, EVENTS } from '../core/events.js';
import { recordKarma } from '../systems/karma.js';
import { getRealmModifier, rebirth } from '../systems/samsara.js';
import { fade } from '../ui/feedback.js';
import { hideRebirthInterlude, showRebirthInterlude } from '../ui/rebirth-interlude.js';
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
});

/**
 * The haunting spirit. Its behaviour is configured per chapter:
 * - `mindDissolve`   — sustained mindfulness can dissolve it
 * - `respawnOnFade`  — respawn in the forest after dissolving/caught
 * - `enraged`        — temporary speed surge (chapter 2's retaliation)
 */
export const ghost = {
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
  mindDissolve: true,
  respawnOnFade: true,
  tint: null,
  profile: { ...DEFAULT_GHOST_PROFILE },
};

let mindHold = 0;
let mindHoldPrev = false;

export function resetGhost(options = {}) {
  ghost.active = false;
  ghost.x = 0;
  ghost.y = 0;
  ghost.alpha = 0;
  ghost.stun = 0;
  ghost.fade = 0;
  ghost.trail = [];
  ghost.respawn = 0;
  ghost.mode = STATUS.HUNT;
  ghost.enraged = 0;
  ghost.pacified = false;
  ghost.scale = 1;
  ghost.mindDissolve = options.mindDissolve !== false;
  ghost.respawnOnFade = options.respawnOnFade !== false;
  ghost.tint = options.tint || null;
  ghost.profile = { ...DEFAULT_GHOST_PROFILE, ...(options.profile || {}) };
  mindHold = 0;
  mindHoldPrev = false;
}

function place(x, y) {
  ghost.active = true;
  ghost.mode = STATUS.HUNT;
  ghost.alpha = 0;
  ghost.stun = 0;
  ghost.enraged = 0;
  ghost.pacified = false;
  ghost.x = clamp(x, 100, WORLD.w - 100);
  ghost.y = clamp(y, 100, WORLD.h - 100);
}

export function spawnGhostNearPlayer(offsetX = 820, offsetY = -80) {
  place(player.x + offsetX, player.y + offsetY);
}

export function placeGhost(x, y) {
  place(x, y);
}

export function enrageGhost(seconds) {
  if (!ghost.active) return;
  ghost.enraged = Math.max(ghost.enraged, seconds);
  ghost.stun = 0;
}

export function updateGhost(dt, mind, frozen) {
  if (ghost.respawn > 0) {
    ghost.respawn -= dt;
    if (ghost.respawn <= 0) spawnGhostNearPlayer();
    return;
  }

  if (!ghost.active) return;

  ghost.alpha = lerp(ghost.alpha, ghost.mode === STATUS.FADE ? 0 : 1, dt * 1.4);

  if (ghost.mode === STATUS.FADE) {
    ghost.fade -= dt;
    if (ghost.fade <= 0) {
      ghost.active = false;
      ghost.alpha = 0;
      ghost.pacified = true;
      if (ghost.respawnOnFade) ghost.respawn = GHOST.respawnDelay;
      return;
    }
  }

  if (frozen) return;

  if (ghost.enraged > 0) ghost.enraged = Math.max(0, ghost.enraged - dt);

  const d = dist(player.x, player.y, ghost.x, ghost.y);
  const playerSafe = inSafeZone(player.x, player.y);

  // The first moment of mindfulness staggers the ghost (unless it is enraged).
  const justMindful = mind && !mindHoldPrev;
  if (justMindful && d < 560 && ghost.enraged <= 0) ghost.stun = GHOST.stunDuration;
  mindHoldPrev = mind;
  if (ghost.stun > 0) {
    ghost.stun -= dt;
    return;
  }

  // Sustained mindfulness makes the ghost retreat and dissolve.
  if (mind && d < 520) {
    mindHold += dt;
    const away = Math.atan2(ghost.y - player.y, ghost.x - player.x);
    ghost.x += Math.cos(away) * GHOST.retreatSpeed * dt;
    ghost.y += Math.sin(away) * GHOST.retreatSpeed * dt;
    // Higher planes need less mindfulness to still the ghost; lower planes more.
    const dissolveTime = ghost.profile.mindDissolveTime * getRealmModifier().mindDissolve;
    if (ghost.mindDissolve && ghost.enraged <= 0 && mindHold > dissolveTime) {
      ghost.mode = STATUS.FADE;
      ghost.fade = GHOST.fadeDuration;
      mindHold = 0;
      emit(EVENTS.GHOST_PACIFIED, 'mind');
    }
  } else {
    mindHold = Math.max(0, mindHold - dt * 2);
  }

  if (playerSafe) {
    const dx = player.x - ghost.x;
    const dy = player.y - ghost.y;
    const dd = Math.hypot(dx, dy);
    if (dd > 0.001 && dd < 760) {
      ghost.x -= (dx / dd) * 60 * dt;
      ghost.y -= (dy / dd) * 60 * dt;
    }
    return;
  }

  // A spirit that keeps its distance (attachment) never closes in to catch you.
  if (ghost.profile.standOff > 0 && d <= ghost.profile.standOff) {
    const away = Math.atan2(ghost.y - player.y, ghost.x - player.x);
    ghost.x += Math.cos(away) * 18 * dt;
    ghost.y += Math.sin(away) * 18 * dt;
    ghost.trail.unshift({ x: ghost.x, y: ghost.y });
    if (ghost.trail.length > 10) ghost.trail.pop();
    return;
  }

  // Chase speed scales with the player's own agitation.
  let speed = ghost.profile.baseSpeed + state.fear * ghost.profile.fearSpeedBonus;
  if (mind) speed = ghost.profile.mindSpeedBase + state.fear * ghost.profile.mindSpeedFearBonus;
  if (ghost.enraged > 0) speed *= ghost.profile.enrageSpeedFactor;

  const ang = Math.atan2(player.y - ghost.y, player.x - ghost.x);
  ghost.x += Math.cos(ang) * speed * dt;
  ghost.y += Math.sin(ang) * speed * dt;

  for (const tree of TREES) {
    const td = dist(ghost.x, ghost.y, tree.x, tree.y);
    const minDist = tree.r + 18;
    if (td < minDist && td > 0) {
      ghost.x += ((ghost.x - tree.x) / td) * (minDist - td) * 0.5;
      ghost.y += ((ghost.y - tree.y) / td) * (minDist - td) * 0.5;
    }
  }

  if (d > 1400) {
    ghost.x = player.x - Math.cos(ang) * 900;
    ghost.y = player.y - Math.sin(ang) * 900;
  }

  ghost.trail.unshift({ x: ghost.x, y: ghost.y });
  if (ghost.trail.length > 10) ghost.trail.pop();

  if (d < GHOST.catchDistance && ghost.mode === STATUS.HUNT) onCaught();
}

function onCaught() {
  state.stats.caught++;
  recordKarma('panic');

  // จุติ–ปฏิสนธิ: this life ends, kamma chooses the next plane.
  const { realm, reasonKey } = rebirth();

  fade(true, () => {
    showRebirthInterlude(realm, reasonKey);
    const checkpoint = state.checkpoint;
    player.x = checkpoint.x;
    player.y = checkpoint.y;
    state.fear = 0.92;
    cam.x = player.x;
    cam.y = player.y;
    ghost.x = clamp(player.x + 850, 100, WORLD.w - 100);
    ghost.y = player.y - 70;
    ghost.stun = 1.6;
    ghost.enraged = 0;
    setTimeout(() => {
      hideRebirthInterlude();
      fade(false);
    }, 2400);
  });
}
