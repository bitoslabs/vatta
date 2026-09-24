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
import { FIELD } from '../world/world-data.js';
import { animatePlayer, player } from '../entities/player.js';

/**
 * The rabbit's life: the warrens and the storm (docs/animal-lives-story.md
 * ch.10, "ที่หลบก่อนพายุ").
 *
 * This life is a **relay, not a race**. The rabbit joins the warrens of the
 * field one by one (no timer, no deadline — the design is explicit that speed is
 * not a score), leaps the washed rim to the far warren, and there decides
 * whether to leave the storm shelter open for the slow ones. Sharing records the
 * `nest-sheltered` world effect, and from then on every warren of that world is
 * a real shelter: fear settles faster inside one (see game/world-update.js).
 */
const REACH = 120;

export function fieldSite() {
  return FIELD;
}

export function warrenList() {
  return FIELD.warrens;
}

export function isSheltered() {
  return hasEffect('nest-sheltered');
}

/** Has this life joined that warren yet? (Also read by the renderer.) */
export function warrenIsConnected(id) {
  return state.rabbit?.connected?.[id] === true;
}

export function connectedCount() {
  const connected = state.rabbit?.connected || {};
  return FIELD.warrens.filter((warren) => connected[warren.id] === true).length;
}

export function allConnected() {
  return connectedCount() === FIELD.warrens.length;
}

export function hasDecided() {
  return state.rabbit?.decided === true;
}

export function didShare() {
  return state.rabbit?.shared === true;
}

/** Does the world's shelter reach this point? */
export function inShelter(x, y) {
  if (!isSheltered()) return false;
  return FIELD.warrens.some((warren) => dist(x, y, warren.x, warren.y) < FIELD.warrenRadius + 40);
}

/** Every life starts with the warrens unjoined and the shelter undecided. */
export function resetRabbit() {
  state.rabbit = { connected: {}, decided: false, shared: false };
}

function nextWarren() {
  const connected = state.rabbit?.connected || {};
  return FIELD.warrens.find((warren) => connected[warren.id] !== true) || null;
}

/**
 * Where a rabbit's life can end *right now*: the warrens still to join, then the
 * far shelter where the question is asked, then the open field. Only the field
 * completes a life — joining warrens and answering are what the life is for.
 */
export function rabbitGoal() {
  const pending = nextWarren();
  if (pending) return { x: pending.x, y: pending.y, r: FIELD.warrenRadius, kind: 'warren' };
  const far = FIELD.warrens[FIELD.warrens.length - 1];
  if (!hasDecided()) return { x: far.x, y: far.y, r: FIELD.warrenRadius, kind: 'shelter' };
  return { x: FIELD.meadow.x, y: FIELD.meadow.y, r: FIELD.meadowRadius, kind: 'storm' };
}

/** Joining a warren, and the one question at the far shelter. */
export function updateRabbit() {
  if (state.mode !== MODE.WORLD) return;
  if (state.dialogueOpen || state.choiceOpen || state.interact) return;
  if (getForm().lifeGoal !== 'storm') return;
  if (hasDecided()) return;

  const pending = nextWarren();
  if (pending && dist(player.x, player.y, pending.x, pending.y) < REACH) {
    state.interact = { fn: joinWarren, labelKey: 'prompt.connectWarren' };
    return;
  }

  const far = FIELD.warrens[FIELD.warrens.length - 1];
  if (allConnected() && dist(player.x, player.y, far.x, far.y) < REACH) {
    state.interact = { fn: decideShelter, labelKey: 'prompt.shareShelter' };
  }
}

function joinWarren() {
  const pending = nextWarren();
  if (!pending) return;
  state.rabbit.connected[pending.id] = true;
  animatePlayer();
  playChime();
  addFloater(
    player.x,
    player.y - 120,
    t('rabbit.connected', { count: connectedCount(), total: FIELD.warrens.length }),
    '#d9c48f',
    15,
  );
}

function decideShelter() {
  choose(
    [
      { t: t('rabbit.choice.share') },
      { t: t('rabbit.choice.keep') },
    ],
    (index) => {
      const share = index === 0;
      state.rabbit.decided = true;
      state.rabbit.shared = share;
      if (share) {
        recordEffect('nest-sheltered');
        recordKarma('give');
      }
      animatePlayer();
      playChime();
      addFloater(
        player.x,
        player.y - 120,
        t(share ? 'rabbit.answer.share' : 'rabbit.answer.keep'),
        share ? '#d9c48f' : '#b9b2a0',
        15,
      );
    },
  );
}

/** Back in the open field: the survivors tend it. */
export function tendField() {
  animatePlayer();
  playChime();
  addFloater(FIELD.meadow.x, FIELD.meadow.y - 70, t('rabbit.fieldTended'), '#cfe0b4', 15);
  return isSheltered();
}
