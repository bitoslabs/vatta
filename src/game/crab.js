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
import { isHighTide, isLowTide, tideLevel, tideTrend } from '../systems/tide.js';
import { choose } from '../ui/choices.js';
import { TIDE } from '../world/world-data.js';
import { animatePlayer, player } from '../entities/player.js';

/**
 * The crab's life: the flooded channel and the home pool
 * (docs/animal-lives-story.md reserve table, "ปู — รักษาที่อยู่ท่ามกลางน้ำขึ้นลง").
 *
 * The spawning pool is walled by stone with one way in: the channel the river runs
 * through. At high water that channel is deep — a swimmer like the crab goes
 * through, a walking body cannot; at low water anyone can wade. So the crab's life
 * is the first one shaped by a *world rhythm* rather than by its own tools, and the
 * decision at the far pool is about the water itself: keep the channel shallow for
 * every life that follows (`channel-kept`), or let it stay deep.
 *
 * Then it goes home through the place it just changed — and the life ends at the
 * home pool it kept, which is what "keeping a home through the tides" means here.
 */
export function tideSite() {
  return TIDE;
}

export function channelKept() {
  return hasEffect('channel-kept');
}

export function hasDecided() {
  return state.crab?.decided === true;
}

export function didKeep() {
  return state.crab?.kept === true;
}

/** Every life arrives with the channel as the river left it. */
export function resetCrab() {
  state.crab = { reached: false, decided: false, kept: false };
}

export function reachedFarPool() {
  return state.crab?.reached === true;
}

/**
 * Where a crab's life goes next: the far pool through the channel (a guide), then
 * home once the water has been decided about — where the life ends.
 */
export function crabGoal() {
  if (!hasDecided()) {
    return { x: TIDE.farPool.x, y: TIDE.farPool.y, r: TIDE.poolRadius, kind: 'far-pool' };
  }
  return { x: TIDE.home.x, y: TIDE.home.y, r: TIDE.homeRadius, kind: 'home' };
}

/** The far pool asks its question; the home pool ends the life. */
export function updateCrab() {
  if (state.mode !== MODE.WORLD) return;
  if (state.dialogueOpen || state.choiceOpen || state.interact) return;
  if (getForm().lifeGoal !== 'tide') return;
  if (hasDecided()) return;

  const { farPool, poolRadius } = TIDE;
  if (dist(player.x, player.y, farPool.x, farPool.y) > poolRadius + 30) return;
  if (!reachedFarPool()) {
    state.crab.reached = true;
    addFloater(player.x, player.y - 110, t('crab.reached'), '#9fc6dd', 15);
    playChime();
  }
  state.interact = { fn: decideChannel, labelKey: 'prompt.keepChannel' };
}

function decideChannel() {
  choose(
    [
      { t: t('crab.choice.keep') },
      { t: t('crab.choice.leave') },
    ],
    (index) => {
      const keep = index === 0;
      state.crab.decided = true;
      state.crab.kept = keep;
      if (keep) {
        recordEffect('channel-kept');
        recordKarma('give');
      }
      animatePlayer();
      playChime();
      addFloater(
        player.x,
        player.y - 120,
        t(keep ? 'crab.answer.keep' : 'crab.answer.leave'),
        keep ? '#9fc6dd' : '#c9c0a8',
        15,
      );
    },
  );
}

/** Home again: the pool the life kept. */
export function settleHome() {
  animatePlayer();
  playChime();
  addFloater(TIDE.home.x, TIDE.home.y - 70, t('crab.home'), '#9fc6dd', 15);
  return channelKept();
}

/**
 * What the water is doing, for the readout: the crab (and any body that lives by
 * a river) can tell whether it is coming in or going out, and whether the channel
 * over the bar is deep.
 */
export function tideReadout() {
  if (isHighTide()) return { key: 'hud.tide.high', depth: 'hud.tide.deep' };
  if (isLowTide()) return { key: 'hud.tide.low', depth: 'hud.tide.shallow' };
  return { key: tideTrend() === 'rising' ? 'hud.tide.rising' : 'hud.tide.falling', depth: 'hud.tide.mid' };
}

/** A body that lives in or by the water reads it; a walker in the forest does not. */
export function readsTide() {
  const form = getForm();
  return form.waterBound === true || form.abilities?.swimDeep === true || form.id === 'otter';
}

/** The water's own level, for the renderer's band along the river. */
export function waterLevel() {
  return tideLevel();
}
