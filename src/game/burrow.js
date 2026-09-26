'use strict';

import { playBird, playChime, playThud } from '../systems/audio.js';
import { addFloater } from '../systems/effects.js';
import { t } from '../systems/i18n.js';
import { recordKarma } from '../systems/karma.js';
import { saveRun } from '../systems/save.js';
import { hasEffect, recordEffect } from '../systems/world-effects.js';
import { BURROW } from '../world/world-data.js';
import { state } from '../core/state.js';
import { player } from '../entities/player.js';
import { MODE } from '../core/constants.js';

const PECK_RADIUS = 54;
const COVERED_PECK_RADIUS = 40;
const chicken = { phase: 'rest', time: 2, patrol: 0, safe: null, hits: 0, struck: false };

export function chickenPeckRadius() {
  // The root a past life watered grows cover over part of the exposed soil.
  return rootWatered() ? COVERED_PECK_RADIUS : PECK_RADIUS;
}

export function chickenState() {
  return { phase: chicken.phase, time: chicken.time, patrol: chicken.patrol,
    radius: chickenPeckRadius(), hits: chicken.hits };
}

export function resetChicken() {
  chicken.phase = 'rest';
  chicken.time = 2;
  chicken.patrol = 0;
  chicken.safe = null;
  chicken.hits = 0;
  chicken.struck = false;
}

function catchWorm(distance) {
  if (chicken.phase !== 'strike' || chicken.struck || distance > chickenPeckRadius()) return;
  const safe = chicken.safe || BURROW.shelter;
  player.x = safe.x;
  player.y = safe.y;
  player.vx = 0;
  player.vy = 0;
  chicken.hits++;
  chicken.struck = true;
}

/** A visible, timed hazard at the mouth. Being pecked does not record karma. */
export function updateChicken(dt) {
  const practising = state.explore?.active === true;
  if (!(state.lifeMode || practising) || state.formId !== 'worm' || (state.teacher && !practising)) {
    resetChicken();
    return;
  }
  if (state.mode !== MODE.WORLD || document.hidden) return;
  const distance = Math.hypot(player.x - BURROW.mouth.x, player.y - BURROW.mouth.y);
  if (distance > 300) {
    // An offscreen warning must not resume with an immediate peck on return.
    chicken.phase = 'rest';
    chicken.time = 2;
    chicken.safe = null;
    chicken.struck = false;
    return;
  }
  if (distance > chickenPeckRadius() + 25) chicken.safe = { x: player.x, y: player.y };
  if (state.dialogueOpen || state.choiceOpen) return;
  if (chicken.phase === 'rest') chicken.patrol += dt;
  chicken.time -= dt;
  if (chicken.time > 0) {
    catchWorm(distance);
    return;
  }
  if (chicken.phase === 'rest') {
    chicken.phase = 'warning';
    chicken.time = 1.4;
    chicken.struck = false;
    playBird();
  } else if (chicken.phase === 'warning') {
    chicken.phase = 'strike';
    chicken.time = 0.35;
    playThud();
  } else {
    chicken.phase = 'rest';
    chicken.time = 2.2;
  }
  // Check throughout the visible strike, including a late step into the ring.
  catchWorm(distance);
}

/**
 * The earthworm's life under the great root (docs/animal-lives-story.md ch.2).
 *
 * The map itself lives in world/rooms.js (`assembleBurrow`) where it can be
 * proven walkable — or, for a walking body, provably *not* walkable. Here sits
 * the consequence: reaching the seed inside records the `root-watered` effect,
 * which every later life then inherits (systems/worldgen.js#worldAbilities).
 */
export function burrowSite() {
  return BURROW;
}

export function rootWatered() {
  return hasEffect('root-watered');
}

/** Reaching the seed waters the root. Returns true when this life did it. */
export function waterRoot() {
  const first = recordEffect('root-watered');
  if (!first) return false;
  recordKarma('give');
  playChime();
  addFloater(BURROW.chamber.x, BURROW.chamber.y - 70, t('effect.rootWatered'), '#bfd9cd', 15);
  saveRun();
  return true;
}
