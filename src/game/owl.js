'use strict';

import { MODE } from '../core/constants.js';
import { dist } from '../core/math.js';
import { state } from '../core/state.js';
import { playChime } from '../systems/audio.js';
import { addFloater } from '../systems/effects.js';
import { getForm } from '../systems/forms.js';
import { t } from '../systems/i18n.js';
import { recordKarma } from '../systems/karma.js';
import { visionRadius } from '../systems/vision.js';
import { hasEffect, recordEffect } from '../systems/world-effects.js';
import { choose } from '../ui/choices.js';
import { OWL } from '../world/world-data.js';
import { animatePlayer, player } from '../entities/player.js';

/**
 * The owl's life: the night and the lost ones (docs/animal-lives-story.md ch.13,
 * "สิ่งที่กลางวันไม่เห็น").
 *
 * This life has no wall in it — the owl flies over everything. What it has is the
 * dark: a lost animal is only *perceived* inside this body's vision radius
 * (systems/vision.js), so the owl's night eyes are the door. Finding all three
 * and leading them home leads to the roost, where the life asks whether to keep
 * the watch. Keeping it records `night-watched`, which leaves every later body a
 * little more light — knowing how the forest connects, made usable.
 */
const LEAD_RANGE = 1.0; // multiples of the vision radius

export function owlSite() {
  return OWL;
}

export function nightWatched() {
  return hasEffect('night-watched');
}

export function hasDecided() {
  return state.owl?.decided === true;
}

export function didWatch() {
  return state.owl?.watched === true;
}

/** Every life arrives with the night unwatched and no one found. */
export function resetOwl() {
  state.owl = { found: {}, decided: false, watched: false };
}

/**
 * Can this body perceive that lost one right now? This is the whole gate: not a
 * wall, not an ability, only what the dark lets the body see.
 */
export function perceivesLost(lost) {
  return dist(player.x, player.y, lost.x, lost.y) < visionRadius(false) * LEAD_RANGE;
}

/** Was this one already led home? (Also read by the renderer.) */
export function owlFound(id) {
  return state.owl?.found?.[id] === true;
}

export function foundCount() {
  const found = state.owl?.found || {};
  return OWL.lost.filter((lost) => found[lost.id] === true).length;
}

export function allFound() {
  return foundCount() === OWL.lost.length;
}

function nextLost() {
  const found = state.owl?.found || {};
  return OWL.lost.find((lost) => found[lost.id] !== true) || null;
}

/**
 * Where an owl's life goes next: the lost ones it has not found (a guide, felt
 * only when they come into the light), then the roost (a guide, where the night
 * is decided), then the roost again as the ending.
 */
export function owlGoal() {
  const pending = nextLost();
  if (pending) return { x: pending.x, y: pending.y, r: OWL.lostRadius, kind: 'lost' };
  if (!hasDecided()) return { x: OWL.roost.x, y: OWL.roost.y, r: OWL.roostRadius, kind: 'roost' };
  return { x: OWL.roost.x, y: OWL.roost.y, r: OWL.roostRadius, kind: 'watch' };
}

/** Leading a lost one home — offered only where the body can actually see it. */
export function updateOwl() {
  if (state.mode !== MODE.WORLD) return;
  if (state.dialogueOpen || state.choiceOpen || state.interact) return;
  if (getForm().lifeGoal !== 'watch') return;
  if (hasDecided()) return;

  const pending = nextLost();
  if (pending && perceivesLost(pending)) {
    state.interact = { fn: leadHome, labelKey: 'prompt.leadHome' };
    return;
  }

  if (allFound() && dist(player.x, player.y, OWL.roost.x, OWL.roost.y) < OWL.roostRadius + 40) {
    state.interact = { fn: decideWatch, labelKey: 'prompt.watchNight' };
  }
}

function leadHome() {
  const pending = nextLost();
  if (!pending) return;
  state.owl.found[pending.id] = true;
  animatePlayer();
  playChime();
  addFloater(
    player.x,
    player.y - 120,
    t('owl.found', { count: foundCount(), total: OWL.lost.length }),
    '#cbd6ea',
    15,
  );
}

function decideWatch() {
  choose(
    [
      { t: t('owl.choice.watch') },
      { t: t('owl.choice.sleep') },
    ],
    (index) => {
      const watch = index === 0;
      state.owl.decided = true;
      state.owl.watched = watch;
      if (watch) {
        recordEffect('night-watched');
        recordKarma('give');
      }
      animatePlayer();
      playChime();
      addFloater(
        player.x,
        player.y - 120,
        t(watch ? 'owl.answer.watch' : 'owl.answer.sleep'),
        watch ? '#cbd6ea' : '#a9a48f',
        15,
      );
    },
  );
}

/** Settled on the roost: the night is over, and it is someone's to keep. */
export function settleRoost() {
  animatePlayer();
  playChime();
  addFloater(OWL.roost.x, OWL.roost.y - 80, t('owl.roost'), '#cbd6ea', 15);
  return nightWatched();
}
