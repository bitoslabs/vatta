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
import { choose } from '../ui/choices.js';
import { TRAIL } from '../world/world-data.js';
import { animatePlayer, player } from '../entities/player.js';

/**
 * The tiger's life: the trail and the rival (docs/animal-lives-story.md ch.12,
 * "เงาในพุ่ม").
 *
 * Real tracks, read one after another where the last one ended — a body that
 * does not read trails cannot follow them at all. They lead to a hollow where a
 * rival rests, and there the life asks its question: slip away, or take it.
 * Choosing the quiet way records `trust-built`, which leaves the trail readable
 * for every later body and the hollow a place of rest: trust instead of hunting
 * for points, made into something the next life can use.
 */
export function trailSite() {
  return TRAIL;
}

export function trustBuilt() {
  return hasEffect('trust-built');
}

export function isHunted() {
  return state.world?.hunted === true;
}

export function hasDecided() {
  return state.tiger?.decided === true;
}

export function didAvoid() {
  return state.tiger?.avoided === true;
}

export function tracksRead() {
  return state.tiger?.step || 0;
}

/** Every life arrives with the trail unread and the rival unmet. */
export function resetTiger() {
  state.tiger = { step: 0, decided: false, avoided: false };
}

/**
 * Who can read a trail? A body that reads tracks, and — once a tiger has left
 * the fight unpicked — anyone at all: the trust is the road.
 */
export function canTrack() {
  return getForm().abilities?.tracker === true || trustBuilt();
}

/**
 * Where a tiger's life goes next: the next track in order (a guide), then the
 * hollow (a guide, where the question is asked), then its own range — the place
 * the life can end.
 */
export function tigerGoal() {
  const step = tracksRead();
  if (step < TRAIL.tracks.length) {
    const track = TRAIL.tracks[step];
    return { x: track.x, y: track.y, r: TRAIL.trackRadius, kind: 'track' };
  }
  if (!hasDecided()) return { x: TRAIL.hollow.x, y: TRAIL.hollow.y, r: TRAIL.hollowRadius, kind: 'hollow' };
  return { x: TRAIL.range.x, y: TRAIL.range.y, r: TRAIL.rangeRadius, kind: 'range' };
}

/** Reading the trail, and the one question at the end of it. */
export function updateTiger() {
  if (state.mode !== MODE.WORLD) return;
  if (state.dialogueOpen || state.choiceOpen || state.interact) return;
  if (getForm().lifeGoal !== 'trail') return;
  if (!canTrack()) return;

  const step = tracksRead();
  if (step < TRAIL.tracks.length) {
    const track = TRAIL.tracks[step];
    if (dist(player.x, player.y, track.x, track.y) < TRAIL.trackRadius) {
      state.interact = { fn: readTrack, labelKey: 'prompt.readTrack' };
    }
    return;
  }

  if (!hasDecided() && dist(player.x, player.y, TRAIL.hollow.x, TRAIL.hollow.y) < TRAIL.hollowRadius) {
    state.interact = { fn: faceRival, labelKey: 'prompt.faceRival' };
  }
}

function readTrack() {
  const step = tracksRead();
  if (step >= TRAIL.tracks.length) return;
  state.tiger.step = step + 1;
  saveRun();
  animatePlayer();
  playChime();
  addFloater(
    player.x,
    player.y - 110,
    t('tiger.track', { count: state.tiger.step, total: TRAIL.tracks.length }),
    '#d8c8b4',
    14,
  );
}

function faceRival() {
  choose(
    [
      { t: t('tiger.choice.avoid') },
      { t: t('tiger.choice.confront') },
    ],
    (index) => {
      const avoid = index === 0;
      state.tiger.decided = true;
      state.tiger.avoided = avoid;
      state.world.hunted = !avoid;
      if (avoid) {
        recordEffect('trust-built');
        recordKarma('give');
      } else {
        recordKarma('harm');
      }
      saveRun();
      animatePlayer();
      playChime();
      addFloater(
        player.x,
        player.y - 130,
        t(avoid ? 'tiger.answer.avoid' : 'tiger.answer.confront'),
        avoid ? '#d8c8b4' : '#c08f7a',
        15,
      );
      if (!avoid) addFloater(TRAIL.hollow.x, TRAIL.hollow.y - 60, t('tiger.hunted'), '#c08f7a', 13);
    },
  );
}

/**
 * A hollow where a fight was not picked is rest for every body (systems/rest.js).
 */
export function inHollowRest(x, y) {
  if (!trustBuilt() || isHunted()) return false;
  return dist(x, y, TRAIL.hollow.x, TRAIL.hollow.y) < TRAIL.hollowRadius + 40;
}

/** Back in its own range: the life closes. */
export function settleRange() {
  animatePlayer();
  playChime();
  addFloater(TRAIL.range.x, TRAIL.range.y - 80, t('tiger.range'), '#d8c8b4', 15);
  return trustBuilt();
}
