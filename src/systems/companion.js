'use strict';

import { MODE } from '../core/constants.js';
import { dist } from '../core/math.js';
import { state } from '../core/state.js';
import { addFloater } from './effects.js';
import { inWater } from './forms.js';
import { t } from './i18n.js';
import { hasEffect, recordEffect } from './world-effects.js';
import { blockedAt } from '../world/rooms.js';
import { GATE_OUT } from '../core/constants.js';
import { player } from '../entities/player.js';

/**
 * A companion (docs/player-interactions.md "เพื่อนร่วมทาง").
 *
 * One dog, and three visible facts about it: it follows at a distance, it is
 * *afraid of water* (it stops at the bank and barks rather than swimming), and it
 * remembers being called — three calls while you are beside it and the friendship
 * is a leaving in the world, so a later life is met at the gate by a dog that
 * already knows you (`friend-kept`).
 *
 * It is not a feature and not a wall: it never blocks the player (you can walk
 * through it), it refuses to step into water or stone, and if it is ever truly
 * stuck — a life later, a wall between you — it quietly comes back to your side
 * instead of pathfinding forever. "ตอบสนองชัด ไม่ติดผู้เล่นหรือกีดทาง" is the whole
 * brief, so both of those are tested (tests/companion.test.mjs).
 */
const LEASH_MIN = 58;
const LEASH_MAX = 132;
const SPEED = 84;
const REHOME_AFTER = 2.6;
const CALL_RANGE = 190;
const BOND_CALLS = 3;

function companion() {
  if (!state.companion) {
    state.companion = {
      active: false, bonded: false, mode: 'following', x: 0, y: 0, face: 1,
      calls: 0, stuck: 0, bark: 0, metLifeId: null,
    };
  }
  return state.companion;
}

/** Is a companion with this life at all? */
export function companionWanted() {
  // The first meeting is chapter one, by the gate. Afterwards it is only there if a
  // life kept the friendship (systems/world-effects.js `friend-kept`).
  if (hasEffect('friend-kept')) return true;
  return state.chapter === 1 && state.liberated !== true;
}

/** Put (or put back) the dog beside the player, on free, dry ground. */
export function placeCompanion() {
  const dog = companion();
  dog.active = true;
  dog.bonded = hasEffect('friend-kept');
  const spot = freeSpotBeside(player.x, player.y);
  placeCompanionAt(spot.x, spot.y);
  dog.mode = 'following';
  return dog;
}

/**
 * Put the dog at a given point — used when it is placed beside a life, when it
 * rehomes, and (with the same meaning) by tests and teacher tools.
 */
export function placeCompanionAt(x, y) {
  const dog = companion();
  dog.active = true;
  dog.x = x;
  dog.y = y;
  dog.stuck = 0;
  return dog;
}

/** Called when a chapter loads: the dog is there, or it is not. */
export function resetCompanion() {
  const dog = companion();
  dog.active = false;
  dog.mode = 'following';
  dog.stuck = 0;
  dog.bark = 0;
  // Calls are a *life's* count ("this life called it three times"), so a new life
  // starts its own; the friendship itself stays, because the world remembers it.
  dog.calls = 0;
  if (companionWanted()) placeCompanion();
  return dog;
}

/**
 * A free, dry spot near a point: the dog may not stand in water or in stone, and it
 * must not be underfoot. Searched in a fixed ring order so it is reproducible.
 */
export function freeSpotBeside(x, y, features = state.dynamic?.features || []) {
  for (const radius of [70, 100, 130, 160]) {
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const spot = { x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius };
      if (inWater(spot.x, spot.y)) continue;
      if (blockedAt(features, spot.x, spot.y, {})) continue;
      return spot;
    }
  }
  return { x: x + 70, y };
}

/**
 * The player's own act: a call. Beside the dog it answers (a tone, a turn) and the
 * friendship counts up; from far away it still comes. A second call while it is
 * beside you asks it to wait, and a third asks it to follow again — one key, one
 * meaning: "call".
 */
export function callCompanion() {
  const dog = companion();
  if (!dog.active) return false;
  const near = dist(dog.x, dog.y, player.x, player.y) <= CALL_RANGE;

  // Every call beside it counts towards the friendship, whichever way the call then
  // turns: three calls and the friendship is a leaving in the world, so a later life
  // is met at the gate by a dog that remembers.
  if (near && !dog.bonded) {
    dog.calls += 1;
    if (dog.calls >= BOND_CALLS) {
      dog.bonded = true;
      dog.metLifeId = state.lifeId;
      recordEffect('friend-kept');
    }
  }

  if (dog.mode === 'waiting' && near) {
    dog.mode = 'following';
    bark(false, 'companion.answer.come');
    return true;
  }
  if (near && dog.mode === 'following' && dog.calls > 1) {
    dog.mode = 'waiting';
    bark(false, 'companion.answer.wait');
    return true;
  }
  dog.mode = 'following';
  bark(false, 'companion.answer.call');
  return true;
}

function bark(deep = false, key = 'companion.bark') {
  const dog = companion();
  dog.bark = deep ? 1.1 : 0.8;
  addFloater(dog.x, dog.y - 46, t(key), '#e6d8a8', 13);
}

export function companionState() {
  return { ...companion() };
}

/** The dog's own frame: follow at a distance, never into water, never stuck. */
export function updateCompanion(dt) {
  const dog = companion();
  if (!dog.active || state.mode !== MODE.WORLD) return;
  if (dog.bark > 0) dog.bark = Math.max(0, dog.bark - dt);
  if (dog.mode === 'waiting') { dog.stuck = 0; return; }

  const gap = dist(dog.x, dog.y, player.x, player.y);
  let want = null;
  if (gap > LEASH_MAX) {
    const angle = Math.atan2(player.y - dog.y, player.x - dog.x);
    want = { x: dog.x + Math.cos(angle) * SPEED * dt, y: dog.y + Math.sin(angle) * SPEED * dt };
  } else if (gap < LEASH_MIN) {
    const angle = Math.atan2(dog.y - player.y, dog.x - player.x);
    want = { x: dog.x + Math.cos(angle) * SPEED * dt * 0.6, y: dog.y + Math.sin(angle) * SPEED * dt * 0.6 };
  }
  if (!want) { dog.stuck = 0; return; }

  const features = state.dynamic?.features || [];
  dog.face = want.x >= dog.x ? 1 : -1;
  const dry = !inWater(want.x, want.y);
  const clear = !blockedAt(features, want.x, want.y, {});
  if (dry && clear) {
    dog.x = want.x;
    dog.y = want.y;
    dog.stuck = 0;
    return;
  }
  // Afraid of water: it says so once and waits at the bank rather than swimming.
  if (!dry && dog.bark <= 0) bark(true, 'companion.answer.water');
  dog.stuck += dt;
  if (dog.stuck > REHOME_AFTER) {
    // Not pathfinding forever: it comes back to your side.
    const spot = freeSpotBeside(player.x, player.y, features);
    placeCompanionAt(spot.x, spot.y);
  }
}

/** Where a life's friendship began, for the world book: the gate. */
export const COMPANION_PLACE = Object.freeze({ x: GATE_OUT.x, y: GATE_OUT.y });
