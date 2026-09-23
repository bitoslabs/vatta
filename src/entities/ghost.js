'use strict';

import { GATE_OUT, GHOST, SALA, WORLD } from '../core/constants.js';
import { clamp, dist, lerp } from '../core/math.js';
import { state } from '../core/state.js';
import { fade, toast } from '../ui/feedback.js';
import { t } from '../systems/i18n.js';
import { TREES } from '../world/world-data.js';
import { cam } from '../game/camera.js';
import { STATUS } from './ghost-status.js';
import { inSafeZone, player } from './player.js';

/** The haunting spirit that chases the player. */
export const ghost = {
  active: false,
  x: 0,
  y: 0,
  alpha: 0,
  stun: 0,
  fade: 0,
  trail: [],
  respawn: 0,
  mode: 'hunt',
};

let mindHold = 0;
let mindHoldPrev = false;

export function spawnGhostNearPlayer(offsetX = 820, offsetY = -80) {
  ghost.active = true;
  ghost.mode = STATUS.HUNT;
  ghost.alpha = 0;
  ghost.x = clamp(player.x + offsetX, 100, WORLD.w - 100);
  ghost.y = clamp(player.y + offsetY, 100, WORLD.h - 100);
}

export function updateGhost(dt, mind, frozen) {
  if (ghost.respawn > 0) {
    ghost.respawn -= dt;
    if (ghost.respawn <= 0 && !state.story.salaReached) spawnGhostNearPlayer();
    return;
  }

  if (!ghost.active) return;

  ghost.alpha = lerp(ghost.alpha, ghost.mode === STATUS.FADE ? 0 : 1, dt * 1.4);

  if (ghost.mode === STATUS.FADE) {
    ghost.fade -= dt;
    if (ghost.fade <= 0) {
      ghost.active = false;
      ghost.alpha = 0;
      if (!state.story.salaReached) ghost.respawn = GHOST.respawnDelay;
      return;
    }
  }

  if (frozen) return;

  const d = dist(player.x, player.y, ghost.x, ghost.y);
  const playerSafe = inSafeZone(player.x, player.y);

  // The first moment of mindfulness staggers the ghost.
  const justMindful = mind && !mindHoldPrev;
  if (justMindful && d < 560) ghost.stun = GHOST.stunDuration;
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
    if (mindHold > 2.8 && !state.story.salaReached) {
      ghost.mode = STATUS.FADE;
      ghost.fade = GHOST.fadeDuration;
      mindHold = 0;
    }
  } else {
    mindHold = Math.max(0, mindHold - dt * 2);
  }

  if (playerSafe) {
    const dx = player.x - ghost.x;
    const dy = player.y - ghost.y;
    const dd = Math.hypot(dx, dy);
    if (dd < 760) {
      ghost.x -= (dx / dd) * 60 * dt;
      ghost.y -= (dy / dd) * 60 * dt;
    }
    return;
  }

  // Chase speed scales with the player's own fear.
  let speed = GHOST.baseSpeed + state.fear * GHOST.fearSpeedBonus;
  if (mind) speed = GHOST.mindSpeedBase + state.fear * GHOST.mindSpeedFearBonus;
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
  fade(true, () => {
    toast(t('toast.caught.title'), t('toast.caught.sub'));
    const checkpoint = state.story.salaReached
      ? { x: SALA.x - 90, y: SALA.y + 110 }
      : GATE_OUT;
    player.x = checkpoint.x;
    player.y = checkpoint.y;
    state.fear = 0.92;
    cam.x = player.x;
    cam.y = player.y;
    ghost.x = clamp(player.x + 850, 100, WORLD.w - 100);
    ghost.y = player.y - 70;
    ghost.stun = 1.6;
    setTimeout(() => fade(false), 1200);
  });
}
