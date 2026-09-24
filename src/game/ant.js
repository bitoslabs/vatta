'use strict';

import { MODE } from '../core/constants.js';
import { dist } from '../core/math.js';
import { state } from '../core/state.js';
import { playChime } from '../systems/audio.js';
import { addFloater } from '../systems/effects.js';
import { getForm } from '../systems/forms.js';
import { t } from '../systems/i18n.js';
import { recordKarma } from '../systems/karma.js';
import { hasEffect, recordEffect } from '../systems/world-effects.js';
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
  state.ant = { carrying: false, shared: false };
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
  if (isCarrying()) return;
  if (dist(player.x, player.y, NEST.seed.x, NEST.seed.y) > CARRY_RANGE) return;
  state.interact = { fn: pickUpSeed, labelKey: 'prompt.carrySeed' };
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
