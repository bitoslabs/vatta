'use strict';

import { MODE } from '../core/constants.js';
import { dist } from '../core/math.js';
import { state } from '../core/state.js';
import { playChime, playThud } from '../systems/audio.js';
import { addFloater } from '../systems/effects.js';
import { getForm } from '../systems/forms.js';
import { t } from '../systems/i18n.js';
import { recordKarma } from '../systems/karma.js';
import { saveRun } from '../systems/save.js';
import { hasEffect, recordEffect } from '../systems/world-effects.js';
import { digFeature, dynamicFeatures } from '../systems/worldgen.js';
import { choose } from '../ui/choices.js';
import { BOAR } from '../world/world-data.js';
import { animatePlayer, player } from '../entities/player.js';

/**
 * The boar's life: the sealed feeding ground (docs/animal-lives-story.md story
 * table, "หมูป่า — ดุนดินหารากอาหาร · ใช้กำลังพร้อมสังเกตชีวิตใต้พื้น").
 *
 * Packed earth rings the ground where four root patches grow, and one of the four
 * is the roof of a colony of small lives. Only the boar roots the ring open; only
 * the boar is heavy enough to tear a patch up. It must eat three of the four, so
 * whichever three it chooses decides whether a life that lives under the ground
 * keeps living — and the ground says so if you look at it: within `TELL_RANGE` a
 * boar can see which patch is only roots and which one is alive underneath. That
 * is the whole of the story table's "strength together with noticing the life
 * under the floor": the perception before the act. A colony crushed here stays
 * crushed for every life after this one; the soil a boar turns when it is done
 * keeps giving, and the roots it ate grow back (`soil-turned`).
 */
const MOUND_RANGE = 110;
const ROOT_RANGE = 100;
const TURN_RANGE = 200;
const TELL_RANGE = 240;

export function boarSite() {
  return BOAR;
}

export function turnedSoil() {
  return hasEffect('soil-turned');
}

/** Ground an earlier life rooted open or ate bare (state.world.dug). */
export function dugGround() {
  return Array.isArray(state.world.dug) ? state.world.dug : [];
}

/** The colonies this run has lost — quiet ground that never comes back. */
export function coloniesLost() {
  return Array.isArray(state.world.coloniesLost) ? state.world.coloniesLost : [];
}

export function eatenNeed() {
  return BOAR.need;
}

export function eatenCount() {
  return state.boar?.eaten || 0;
}

export function hasEaten() {
  return eatenCount() >= BOAR.need;
}

export function hasDecided() {
  return state.boar?.decided === true;
}

export function didTend() {
  return state.boar?.tended === true;
}

/** Every life arrives with the ground whole and the roots uneaten. */
export function resetBoar() {
  state.boar = { eaten: 0, aware: false, decided: false, tended: false };
}

/**
 * Whether a boar has *noticed* a patch of ground is alive underneath. The
 * renderer draws what this returns, so the perception is on the screen, not in
 * the player's head.
 */
export function groundTells() {
  if (getForm().lifeGoal !== 'soil') return [];
  return dynamicFeatures()
    .filter((feature) => feature.type === 'root' && dist(player.x, player.y, feature.x, feature.y) <= TELL_RANGE)
    .map((feature) => ({ x: feature.x, y: feature.y, r: feature.r, colony: feature.colony === true }));
}

/**
 * Where a boar's life goes next: the food (a guide, and the life's work), then the
 * soil it opened — where the one question is — and at last the wallow it set out
 * from, where the life closes.
 */
export function boarGoal() {
  if (!hasEaten()) return { x: BOAR.feed.x, y: BOAR.feed.y, r: BOAR.ring, kind: 'boar-root' };
  if (!hasDecided()) return { x: BOAR.feed.x, y: BOAR.feed.y, r: BOAR.ring, kind: 'boar-soil' };
  return { x: BOAR.wallow.x, y: BOAR.wallow.y, r: BOAR.wallowRadius, kind: 'wallow' };
}

/** Eaten enough, about to be asked, and always noticing the ground. */
export function updateBoar() {
  if (state.mode !== MODE.WORLD) return;
  noticeGround();
  if (state.dialogueOpen || state.choiceOpen || state.interact) return;
  if (getForm().lifeGoal !== 'soil') return;

  const features = dynamicFeatures();

  if (!hasEaten()) {
    const patch = nearest(features.filter((feature) => feature.type === 'root'), ROOT_RANGE);
    if (patch) {
      state.interact = { fn: () => rootPatch(patch), labelKey: 'prompt.rootSoil' };
      return;
    }
  } else if (!hasDecided()) {
    const soil = nearest(features.filter((feature) => feature.type === 'mound'), TURN_RANGE);
    if (soil) {
      state.interact = { fn: turnSoil, labelKey: 'prompt.turnSoil' };
      return;
    }
  }

  const mound = nearest(features.filter((feature) => feature.type === 'mound' && feature.dug !== true), MOUND_RANGE);
  if (mound) {
    state.interact = { fn: () => rootMound(mound), labelKey: 'prompt.rootMound' };
  }
}

function nearest(candidates, range) {
  let best = null;
  let bestDistance = range;
  for (const feature of candidates) {
    const d = dist(player.x, player.y, feature.x, feature.y);
    if (d <= bestDistance) {
      best = feature;
      bestDistance = d;
    }
  }
  return best;
}

/** Awareness is a recorded act, once in a life: the ground was read before it was broken. */
function noticeGround() {
  if (state.boar?.aware === true) return;
  if (getForm().lifeGoal !== 'soil') return;
  const alive = dynamicFeatures().find((feature) => (
    feature.type === 'root' && feature.colony === true
    && dist(player.x, player.y, feature.x, feature.y) <= TELL_RANGE
  ));
  if (!alive) return;
  state.boar.aware = true;
  recordKarma('mindful');
  saveRun();
  addFloater(player.x, player.y - 110, t('boar.answer.aware'), '#c2a878', 14);
}

/** Root a mound of packed earth open: the ring's one doorway, and it stays open. */
export function rootMound(feature) {
  if (!feature || feature.dug === true) return false;
  const where = { x: feature.x, y: feature.y };
  if (!digFeature(feature.i)) return false;
  state.world.dug = [...dugGround(), where];
  saveRun();
  animatePlayer();
  playThud();
  addFloater(player.x, player.y - 120, t('boar.answer.opened'), '#b5a184', 14);
  return true;
}

/**
 * Tear a patch of roots up for food. If a colony lives under it, the colony dies
 * — and that is recorded where every later life can find it.
 */
export function rootPatch(feature) {
  if (!feature || hasEaten()) return false;
  const where = { x: feature.x, y: feature.y };
  if (!digFeature(feature.i)) return false;
  state.world.dug = [...dugGround(), where];
  state.boar.eaten += 1;
  if (feature.colony === true) {
    state.world.coloniesLost = [...coloniesLost(), where];
    recordKarma('harm');
    addFloater(player.x, player.y - 120, t('boar.answer.crushed'), '#c08a72', 16);
  } else {
    addFloater(player.x, player.y - 120, t('boar.answer.rooted'), '#c2a878', 14);
  }
  saveRun();
  animatePlayer();
  playThud();
  return true;
}

/** The one question: what the boar does with the soil it opened. */
function turnSoil() {
  if (hasDecided()) return false;
  choose(
    [
      { t: t('boar.choice.tend') },
      { t: t('boar.choice.full') },
    ],
    (index) => {
      const tend = index === 0;
      state.boar.decided = true;
      state.boar.tended = tend;
      if (tend) {
        // Turned soil keeps giving: the roots this life ate grow back in the next.
        recordEffect('soil-turned');
        recordKarma('give');
      } else {
        recordKarma('cling');
      }
      saveRun();
      animatePlayer();
      playChime();
      addFloater(
        player.x,
        player.y - 120,
        t(tend ? 'boar.answer.tend' : 'boar.answer.full'),
        tend ? '#c9d0a8' : '#d7c08c',
        15,
      );
    },
  );
  return true;
}

/** Home at the wallow: the life closes where it began. */
export function settleWallow() {
  animatePlayer();
  playChime();
  addFloater(BOAR.wallow.x, BOAR.wallow.y - 70, t('boar.wallow'), '#c2a878', 15);
  return turnedSoil();
}

/** What only a foraging body reads: how far the meal has come. */
export function forageReadout() {
  return { eaten: eatenCount(), need: BOAR.need, tended: turnedSoil() };
}

/** Only the life that lives by rooting reads it. */
export function readsForage() {
  return getForm().lifeGoal === 'soil';
}
