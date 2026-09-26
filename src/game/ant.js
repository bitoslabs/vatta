'use strict';

import { MODE } from '../core/constants.js';
import { dist } from '../core/math.js';
import { state } from '../core/state.js';
import { playChime, playRunoffWarning, playThud } from '../systems/audio.js';
import { addFloater } from '../systems/effects.js';
import { getForm } from '../systems/forms.js';
import { t } from '../systems/i18n.js';
import { recordKarma } from '../systems/karma.js';
import { saveRun } from '../systems/save.js';
import { hasEffect, inheritedEffect, recordEffect } from '../systems/world-effects.js';
import { choose } from '../ui/choices.js';
import { NEST } from '../world/world-data.js';
import { animatePlayer, player } from '../entities/player.js';

/**
 * The ant's life: the fallen seed and the nest (docs/animal-lives-story.md ch.3,
 * "เมล็ดของใคร").
 *
 * The life is an errand, and the errand is the question. The seed lies in the
 * open; picking it up asks how much to leave for the other colonies, and only
 * then does the nest — through its crack, which only a small body fits —
 * become the place this life can end. Delivering the seed records the
 * `seed-carried` world effect, so later lives walk a forest that was planted by
 * the errand (systems/world-effects.js).
 */
const CARRY_RANGE = 120;
const RAIN_POINT = NEST.runoff;
const RAIN_RADIUS = 70;
const ROOTED_RADIUS = 58;
const DRAIN_SITE = NEST.drain;
const DRAINED_RADIUS = 44;
const BOTH_RADIUS = 36;
const rain = { phase: 'rest', time: 2.5, safe: null, hits: 0, struck: false, inherited: false, rooted: false };

function rainRadius() {
  if (rain.inherited && rain.rooted) return BOTH_RADIUS;
  if (rain.inherited) return DRAINED_RADIUS;
  return rain.rooted ? ROOTED_RADIUS : RAIN_RADIUS;
}

export function rainState() {
  return { phase: rain.phase, time: rain.time, hits: rain.hits,
    x: RAIN_POINT.x, y: RAIN_POINT.y, radius: rainRadius(), drained: rain.inherited, rooted: rain.rooted };
}

export function resetRain() {
  rain.phase = 'rest';
  rain.time = 2.5;
  rain.safe = null;
  rain.hits = 0;
  rain.struck = false;
  rain.inherited = inheritedEffect('runoff-drained');
  rain.rooted = inheritedEffect('seed-carried');
}

function washBack(distance) {
  if (rain.phase !== 'flood' || rain.struck || distance > rainRadius()) return;
  const safe = rain.safe || NEST.seed;
  player.x = safe.x;
  player.y = safe.y;
  player.vx = 0;
  player.vy = 0;
  rain.hits++;
  rain.struck = true;
}

/** A short runoff across the return path. Rain is weather, never misconduct. */
export function updateRain(dt) {
  const practising = state.explore?.active === true;
  if (!(state.lifeMode || practising) || state.formId !== 'ant' || (state.teacher && !practising)) {
    resetRain();
    return;
  }
  if (state.mode !== MODE.WORLD || document.hidden) return;
  const distance = dist(player.x, player.y, RAIN_POINT.x, RAIN_POINT.y);
  if (distance > 280) {
    rain.phase = 'rest';
    rain.time = 2.5;
    rain.safe = null;
    rain.struck = false;
    return;
  }
  if (distance > rainRadius() + 30) rain.safe = { x: player.x, y: player.y };
  if (state.dialogueOpen || state.choiceOpen) return;
  rain.time -= dt;
  if (rain.time > 0) {
    washBack(distance);
    return;
  }
  if (rain.phase === 'rest') {
    rain.phase = 'warning';
    rain.time = 1.5;
    rain.struck = false;
    playRunoffWarning();
  } else if (rain.phase === 'warning') {
    rain.phase = 'flood';
    rain.time = 0.65;
    playThud();
  } else {
    rain.phase = 'rest';
    rain.time = 2.5;
  }
  washBack(distance);
}

export function nestSite() {
  return NEST;
}

export function seedCarried() {
  return hasEffect('seed-carried');
}

export function isCarrying() {
  return state.ant?.carrying === true;
}

export function didShare() {
  return state.ant?.shared === true;
}

/** Every life starts empty-handed; called when a chapter (or a life) loads. */
export function resetAnt() {
  state.ant = { carrying: false, shared: false, drainDecided: false };
}

/**
 * Where an ant's life can end *right now*: the seed first (it has nothing to
 * carry home yet), then the nest. `systems/goals.js` reads this, and only the
 * nest step actually completes a life.
 */
export function antGoal() {
  if (isCarrying()) {
    return { x: NEST.chamber.x, y: NEST.chamber.y, r: NEST.goalRadius, kind: 'nest' };
  }
  return { x: NEST.seed.x, y: NEST.seed.y, r: NEST.seedRadius, kind: 'seed' };
}

/** The seed: pick it up, and decide what to leave behind. */
export function updateAnt() {
  if (state.mode !== MODE.WORLD) return;
  if (state.dialogueOpen || state.choiceOpen || state.interact) return;
  if (getForm().lifeGoal !== 'nest') return;
  if (isCarrying()) {
    if (!hasEffect('runoff-drained') && !state.ant.drainDecided
      && dist(player.x, player.y, DRAIN_SITE.x, DRAIN_SITE.y) <= 82) {
      state.interact = { fn: decideDrain, labelKey: 'prompt.antDrain' };
    }
    return;
  }
  if (dist(player.x, player.y, NEST.seed.x, NEST.seed.y) > CARRY_RANGE) return;
  state.interact = { fn: pickUpSeed, labelKey: 'prompt.carrySeed' };
}

function decideDrain() {
  choose([
    { t: t('ant.drain.open') },
    { t: t('ant.drain.leave') },
  ], (index) => {
    state.ant.drainDecided = true;
    if (index !== 0) { saveRun(); return; }
    recordKarma('give');
    recordEffect('runoff-drained');
    animatePlayer();
    playChime();
    addFloater(DRAIN_SITE.x, DRAIN_SITE.y - 55, t('effect.runoffDrained'), '#9fcad6', 15);
    saveRun();
  });
}

function pickUpSeed() {
  choose(
    [
      { t: t('ant.choice.share') },
      { t: t('ant.choice.take') },
    ],
    (index) => {
      const shared = index === 0;
      state.ant.carrying = true;
      state.ant.shared = shared;
      // Intention comes first: how much is left for others is decided here, and
      // that decision — not the delivery — is what the life is remembered by.
      recordKarma(shared ? 'give' : 'cling');
      animatePlayer();
      playChime();
      addFloater(
        player.x,
        player.y - 120,
        t(shared ? 'ant.carry.share' : 'ant.carry.take'),
        shared ? '#cfe0b4' : '#d7bd8c',
        15,
      );
      saveRun();
    },
  );
}

/**
 * Standing in the nest with the seed: the root is planted. Returns true when
 * this life is the one that carried it.
 */
export function deliverSeed() {
  const first = recordEffect('seed-carried');
  animatePlayer();
  playChime();
  addFloater(NEST.chamber.x, NEST.chamber.y - 70, t('effect.seedCarried'), '#d9c48f', 15);
  return first;
}
