'use strict';

import { MODE } from '../core/constants.js';
import { dist } from '../core/math.js';
import { state } from '../core/state.js';
import { playChime } from '../systems/audio.js';
import { addFloater } from '../systems/effects.js';
import { getForm } from '../systems/forms.js';
import { t } from '../systems/i18n.js';
import { recordKarma } from '../systems/karma.js';
import { saveRun } from '../systems/save.js';
import { hasEffect, recordEffect } from '../systems/world-effects.js';
import { allDriftersCaught, catchDrifter, caughtDrifters, drifterCount, nearestDrifter } from '../systems/drift.js';
import { choose } from '../ui/choices.js';
import { OTTER } from '../world/world-data.js';
import { animatePlayer, player } from '../entities/player.js';

/**
 * The otter's life: what the current carries (docs/animal-lives-story.md reserve
 * table, "นาก — ว่ายน้ำและช่วยจับของลอย · การเล่นร่วมกับการดูแลกัน").
 *
 * Three pieces of driftwood ride the river, and the otter swims out to bring them
 * in — the first life whose objects move on their own (systems/drift.js). They
 * loop, so nothing is ever lost and no one is ever too late; the tide only changes
 * the pace. At the holt the question is what to do with what it gathered: let it
 * travel down to the sea and never pile up (`river-tended`), or pile it beside the
 * holt — and a pile beside a river ends up in the river, so the *next* life finds
 * the channel jammed with it (state.world.snags, and the crab's crossing closes).
 */
const CATCH_RANGE = 110;

export function holtSite() {
  return OTTER;
}

export function riverTended() {
  return hasEffect('river-tended');
}

export function hasDecided() {
  return state.otter?.decided === true;
}

export function didTend() {
  return state.otter?.tended === true;
}

export function caughtCount() {
  return caughtDrifters();
}

export function totalDrifters() {
  return drifterCount();
}

/** Every life arrives with three pieces still riding the water. */
export function resetOtter() {
  state.otter = { decided: false, tended: false };
}

/**
 * Where an otter's life goes next: the driftwood it has not caught (a guide and a
 * chase), then the holt — where the question is, and where the life ends.
 */
export function otterGoal() {
  if (!allDriftersCaught()) {
    const next = nearestDrifter(player.x, player.y, Infinity) || { x: OTTER.holt.x, y: OTTER.holt.y };
    return { x: next.x, y: next.y, r: CATCH_RANGE, kind: 'drift' };
  }
  if (!hasDecided()) return { x: OTTER.holt.x, y: OTTER.holt.y, r: OTTER.holtRadius, kind: 'holt-guide' };
  return { x: OTTER.holt.x, y: OTTER.holt.y, r: OTTER.holtRadius, kind: 'holt' };
}

/** Catching driftwood, and the one question asked at the holt. */
export function updateOtter() {
  if (state.mode !== MODE.WORLD) return;
  if (state.dialogueOpen || state.choiceOpen || state.interact) return;
  if (getForm().lifeGoal !== 'current') return;
  if (hasDecided()) return;

  if (!allDriftersCaught()) {
    const near = nearestDrifter(player.x, player.y, CATCH_RANGE);
    if (near) state.interact = { fn: () => catchOne(near), labelKey: 'prompt.catchDrift' };
    return;
  }

  if (dist(player.x, player.y, OTTER.holt.x, OTTER.holt.y) < OTTER.holtRadius + 30) {
    state.interact = { fn: decideRiver, labelKey: 'prompt.tendRiver' };
  }
}

function catchOne(drift) {
  if (!catchDrifter(drift.id)) return;
  saveRun();
  animatePlayer();
  playChime();
  addFloater(
    player.x,
    player.y - 110,
    t('otter.caught', { count: caughtCount(), total: totalDrifters() }),
    '#9fd6b8',
    14,
  );
}

function decideRiver() {
  choose(
    [
      { t: t('otter.choice.tend') },
      { t: t('otter.choice.keep') },
    ],
    (index) => {
      const tend = index === 0;
      state.otter.decided = true;
      state.otter.tended = tend;
      if (tend) {
        recordEffect('river-tended');
        state.world.snags = [];
        recordKarma('give');
      } else {
        // A pile beside a river ends up in the river.
        state.world.snags = ['drift-a', 'drift-b', 'drift-c'];
        recordKarma('cling');
      }
      saveRun();
      animatePlayer();
      playChime();
      addFloater(
        player.x,
        player.y - 120,
        t(tend ? 'otter.answer.tend' : 'otter.answer.keep'),
        tend ? '#9fd6b8' : '#d7bd8c',
        15,
      );
    },
  );
}

/** The holt: the life ends where the driftwood was decided about. */
export function settleHolt() {
  animatePlayer();
  playChime();
  addFloater(OTTER.holt.x, OTTER.holt.y - 80, t('otter.holt'), '#9fd6b8', 15);
  return riverTended();
}
