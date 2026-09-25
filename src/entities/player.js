'use strict';

import { MODE, PATH_WIDTH, PLAYER, TEMPLE, SALA, WORLD } from '../core/constants.js';
import { clamp, dist, distToPoly } from '../core/math.js';
import { state } from '../core/state.js';
import { input, isMindful } from '../systems/input.js';
import { formAbilities, getForm, inWater, isWaterBound, speedMultiplier } from '../systems/forms.js';
import { debrisBlocked } from '../game/world-memory.js';
import { dynamicBlocked, dynamicFeatures } from '../systems/worldgen.js';
import { isOnRoute } from '../world/rooms.js';
import { terrainSpeed } from '../systems/terrain.js';
import { currentMapId } from '../systems/biome.js';
import { getRealmModifier } from '../systems/samsara.js';
import { TREES } from '../world/world-data.js';

export const player = {
  x: PLAYER.x,
  y: PLAYER.y,
  vx: 0,
  vy: 0,
  face: 1,
  moving: false,
  bob: 0,
  /** Seconds remaining of an action flourish (ability, interact, build...). */
  actT: 0,
};

/** Trigger the action flourish (design §10: idle / move / ability / interact). */
export function animatePlayer(seconds = 0.55) {
  player.actT = Math.max(player.actT, seconds);
}

export function inSafeZone(x, y) {
  return dist(x, y, TEMPLE.x, TEMPLE.y) < TEMPLE.r || dist(x, y, SALA.x, SALA.y) < SALA.r;
}

function isFrozen() {
  return state.dialogueOpen || state.mode === MODE.TITLE;
}

function isRunning(mind) {
  return (input.keys['shift'] || input.run) && !mind && !isFrozen();
}

/**
 * Advance player movement and collisions.
 * @returns {{ frozen: boolean, mind: boolean, running: boolean, speed: number }}
 */
export function updatePlayer(dt) {
  const frozen = isFrozen();
  const mind = isMindful();
  const running = isRunning(mind);

  let ax = 0;
  let ay = 0;
  if (!frozen) {
    if (input.keys['w'] || input.keys['arrowup']) ay -= 1;
    if (input.keys['s'] || input.keys['arrowdown']) ay += 1;
    if (input.keys['a'] || input.keys['arrowleft']) ax -= 1;
    if (input.keys['d'] || input.keys['arrowright']) ax += 1;
    ax += input.joy.dx;
    ay += input.joy.dy;
  }

  const magnitude = Math.hypot(ax, ay);
  if (magnitude > 1) {
    ax /= magnitude;
    ay /= magnitude;
  }

  // The road belongs to the plane (world/rooms.js#isOnRoute), so a body moves at
  // full speed along the street of its own world.
  const onPath = isOnRoute(player.x, player.y, currentMapId());

  let speed = PLAYER.walkSpeed;
  if (running) speed = PLAYER.runSpeed;
  if (mind) speed = PLAYER.mindSpeed;
  if (!onPath) speed *= PLAYER.offPathSpeedFactor;
  speed *= getRealmModifier().speed;

  // The form (ร่าง) decides how this terrain is crossed.
  speed *= speedMultiplier(player.x, player.y);
  // The ground has its own say: mud costs most bodies more than half their pace,
  // and the buffalo nothing (systems/terrain.js, content/forms.js `wade`).
  speed *= terrainSpeed(dynamicFeatures(), player.x, player.y, formAbilities());

  const nextX = clamp(player.x + ax * speed * dt, PLAYER.margin, WORLD.w - PLAYER.margin);
  const nextY = clamp(player.y + ay * speed * dt, PLAYER.margin, WORLD.h - PLAYER.margin);
  const blocked = (isWaterBound() && !inWater(nextX, nextY))
    || debrisBlocked(nextX, nextY)
    || dynamicBlocked(nextX, nextY);
  if (!blocked) {
    player.x = nextX;
    player.y = nextY;
  }
  if (ax) player.face = ax > 0 ? 1 : -1;
  player.moving = magnitude > 0.1;
  if (player.moving) player.bob += dt * (running ? 11 : 6);
  player.actT = Math.max(0, player.actT - dt);

  resolveTreeCollisions();

  return { frozen, mind, running, speed };
}

/** Push the player out of any overlapping tree trunk (flyers pass over). */
function resolveTreeCollisions() {
  if (getForm().abilities && getForm().abilities.flying) return;
  for (const tree of TREES) {
    const d = dist(player.x, player.y, tree.x, tree.y);
    const minDist = tree.r + PLAYER.radius;
    if (d < minDist && d > 0) {
      player.x += ((player.x - tree.x) / d) * (minDist - d);
      player.y += ((player.y - tree.y) / d) * (minDist - d);
    }
  }
}
