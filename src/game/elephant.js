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
import { dynamicFeatures, removeFeature } from '../systems/worldgen.js';
import { choose } from '../ui/choices.js';
import { GROVE } from '../world/world-data.js';
import { animatePlayer, player } from '../entities/player.js';

/**
 * The elephant's life: the fallen log and the nests beneath it
 * (docs/animal-lives-story.md ch.11, "กำลังที่คุ้มครอง").
 *
 * Strength is not the question — where it is put is. The grove is walled, and the
 * only way in for a large body is the mouth the log lies across; the small ones
 * have their own crawlway either way. Lifting the log *clear* of the two fragile
 * nests keeps them whole and joins the large and small ways for good
 * (`ways-joined`, and the log never returns); shoving it the quick way over them
 * crushes them and is remembered as harm. Both ways open the road: nothing here
 * punishes, but the world keeps what was done to it.
 */
const LOG_RANGE = 130;

export function groveSite() {
  return GROVE;
}

export function waysJoined() {
  return hasEffect('ways-joined');
}

export function isLifted() {
  return state.elephant?.lifted === true;
}

export function crushedNests() {
  return state.elephant?.crushed || [];
}

export function nestCrashed(id) {
  return crushedNests().includes(id);
}

/** Every life arrives at a log that is still across the mouth. */
export function resetElephant() {
  state.elephant = { lifted: false, crushed: [] };
}

/**
 * A whole nest is cover for small bodies once the ways are joined: the same
 * "shelter is felt" rule the rabbit's warrens follow (see game/world-update.js).
 */
export function inNestCover(x, y) {
  if (!waysJoined()) return false;
  return GROVE.nests.some((nest) => (
    !nestCrashed(nest.id) && dist(x, y, nest.x, nest.y) < GROVE.nestRadius + 30
  ));
}

/** The log across the mouth: offered to a strong body, and to no other. */
export function updateElephant() {
  if (state.mode !== MODE.WORLD) return;
  if (state.dialogueOpen || state.choiceOpen || state.interact) return;
  if (getForm().lifeGoal !== 'grove') return;
  if (isLifted()) return;
  if (dist(player.x, player.y, GROVE.log.x, GROVE.log.y) > LOG_RANGE) return;
  state.interact = { fn: chooseLift, labelKey: 'prompt.liftLog' };
}

function chooseLift() {
  choose(
    [
      { t: t('elephant.choice.careful') },
      { t: t('elephant.choice.quick') },
    ],
    (index) => {
      // The first option lifts the log clear of the nests; the second shoves it
      // the short way — which is the way the nests are on.
      liftLog(index === 0);
    },
  );
}

/**
 * Put the strength somewhere. Returns what the act did: whether the road opened
 * (it always does) and which nests did not survive it.
 */
export function liftLog(careful = true) {
  if (isLifted()) return { opened: false, crushed: [] };
  // Its own log, not the ford's: there is more than one log in this forest now.
  const log = dynamicFeatures().find((feature) => feature.type === 'log' && feature.site === 'grove');
  if (!log) return { opened: false, crushed: [] };

  const crushed = careful ? [] : GROVE.nests
    .filter((nest) => dist(log.x, log.y, nest.x, nest.y) < GROVE.fallReach)
    .map((nest) => nest.id);

  state.elephant.lifted = true;
  state.elephant.crushed = [...crushed];
  // The log leaves the world for good, whichever way it was moved.
  removeFeature(log.i);
  animatePlayer();
  if (crushed.length) playThud(); else playChime();

  for (const id of crushed) {
    if (!state.world.crushed.includes(id)) state.world.crushed.push(id);
    recordKarma('harm');
  }
  if (!crushed.length) {
    // The way is open for the large and the small, and the little homes are whole.
    recordEffect('ways-joined');
    recordKarma('give');
  }
  saveRun();

  const nest = GROVE.nests.find((entry) => entry.id === crushed[0]);
  addFloater(
    player.x,
    player.y - 130,
    crushed.length
      ? t('elephant.nestCrushed')
      : t('elephant.answer.careful'),
    crushed.length ? '#c08f7a' : '#c9b78f',
    15,
  );
  if (nest) addFloater(nest.x, nest.y - 60, t('elephant.nestBroken'), '#c08f7a', 13);
  return { opened: true, crushed };
}

/** Standing in the grove the strength opened: the life can end here. */
export function gatherInGrove() {
  animatePlayer();
  playChime();
  addFloater(GROVE.grove.x, GROVE.grove.y - 80, t('elephant.grove'), '#c9b78f', 15);
  return waysJoined();
}
