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
import { SIGNAL } from '../world/world-data.js';
import { animatePlayer, player } from '../entities/player.js';

/**
 * The firefly's swarm (docs/animal-lives-story.md reserve table, "หิ่งห้อย — ส่งแสง
 * เป็นจังหวะ · สื่อสารกับฝูงและนำทางในหมอก").
 *
 * A bramble ring with a thin mist across its gate, and a swarm stone at the middle.
 * The mist is nothing to a body that glows — this life's own, private way in — and a
 * wall to every body that does not. What the life does at the stone is the reserve
 * table's line: it signals, in rhythm, and the swarm answers. From that life on the
 * mist guides everyone (`swarm-lit`): a way only the firefly had becomes a way for
 * all bodies, which is the whole of "นำทางในหมอก".
 */
const ACT_RANGE = 110;

export function signalSite() {
  return SIGNAL;
}

export function swarmLit() {
  return hasEffect('swarm-lit');
}

export function hasSignalled() {
  return state.firefly?.signalled === true;
}

/** Every life arrives to a mist that is still closed to anyone but itself. */
export function resetFirefly() {
  state.firefly = { signalled: false };
}

/** At the stone, the errand is to signal; before that, the stone is only a guide. */
export function fireflyGoal() {
  return {
    x: SIGNAL.stone.x,
    y: SIGNAL.stone.y,
    r: SIGNAL.stoneRadius,
    kind: hasSignalled() || swarmLit() ? 'swarm-answered' : 'swarm-guide',
  };
}

/** The one act: light the rhythm the swarm knows. */
export function updateFirefly() {
  if (state.mode !== MODE.WORLD) return;
  if (state.dialogueOpen || state.choiceOpen || state.interact) return;
  if (getForm().lifeGoal !== 'signal') return;
  if (hasSignalled()) return;
  if (dist(player.x, player.y, SIGNAL.stone.x, SIGNAL.stone.y) > ACT_RANGE) return;
  state.interact = { fn: signalSwarm, labelKey: 'prompt.signalSwarm' };
}

export function signalSwarm() {
  if (hasSignalled()) return false;
  state.firefly.signalled = true;
  recordEffect('swarm-lit');
  recordKarma('give');
  animatePlayer();
  playChime();
  addFloater(player.x, player.y - 110, t('firefly.answer.signalled'), '#f0e0a8', 15);
  return true;
}

/** The swarm answers: the life closes where the answer came. */
export function settleSwarm() {
  animatePlayer();
  playChime();
  addFloater(SIGNAL.stone.x, SIGNAL.stone.y - 70, t('firefly.answer.answered'), '#f0e0a8', 15);
  return swarmLit();
}
