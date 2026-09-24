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
import { canEcho, isEchoing, perceivesPoint } from '../systems/echo.js';
import { visionRadius } from '../systems/vision.js';
import { choose } from '../ui/choices.js';
import { CAVE } from '../world/world-data.js';
import { animatePlayer, player } from '../entities/player.js';

/**
 * The bat's life: the dark cave (docs/animal-lives-story.md reserve table,
 * "ค้างคาว — รับรู้โดยไม่พึ่งภาพเพียงอย่างเดียว").
 *
 * The chamber is almost opaque, so the pup inside is not something the bat can
 * see: it is something the bat must *send for*. A pulse (F) shows what lies
 * within earshot for a moment, and only what a pulse has shown can be found.
 * At the pup (which cannot hear its own way yet) the life asks its question:
 * teach it to send for itself, or simply carry it home. Teaching records
 * `echo-shared`, and everyone who comes after can pulse too — knowing without
 * eyes, passed on.
 */
const REACH = 1;

export function caveSite() {
  return CAVE;
}

export function pulseShared() {
  return hasEffect('echo-shared');
}

export function hasDecided() {
  return state.bat?.decided === true;
}

export function didTeach() {
  return state.bat?.taught === true;
}

export function foundPup() {
  return state.bat?.found === true;
}

/** Every life arrives in the dark with its ears quiet. */
export function resetBat() {
  state.bat = { found: false, decided: false, taught: false };
}

/** Can the bat perceive the pup right now? Nothing else can find it. */
export function perceivesPup() {
  return perceivesPoint(CAVE.pup.x, CAVE.pup.y, player, visionRadius(false) * REACH);
}

/**
 * Where a bat's life goes next: the pup it has not found (a guide, and only
 * visible to a pulse), then the roost — where the life ends.
 */
export function batGoal() {
  if (!foundPup()) return { x: CAVE.pup.x, y: CAVE.pup.y, r: CAVE.pupRadius, kind: 'pup' };
  // not 'roost': that is the owl's *guide* kind (game/owl.js), and a guide must
  // never end a life — this is the bat's ending, so it has its own name.
  return { x: CAVE.roost.x, y: CAVE.roost.y, r: CAVE.roostRadius, kind: 'dark-roost' };
}

/** Finding the pup, and the one question asked there. */
export function updateBat() {
  if (state.mode !== MODE.WORLD) return;
  if (state.dialogueOpen || state.choiceOpen || state.interact) return;
  if (getForm().lifeGoal !== 'echo') return;
  if (hasDecided()) return;

  if (!canEcho()) return;
  if (!foundPup() && perceivesPup() && dist(player.x, player.y, CAVE.pup.x, CAVE.pup.y) < CAVE.pupRadius + 40) {
    state.interact = { fn: findPup, labelKey: 'prompt.findPup' };
    return;
  }
  if (foundPup() && dist(player.x, player.y, CAVE.pup.x, CAVE.pup.y) < CAVE.pupRadius + 40) {
    state.interact = { fn: teachPup, labelKey: 'prompt.teachPup' };
  }
}

function findPup() {
  state.bat.found = true;
  animatePlayer();
  playChime();
  addFloater(player.x, player.y - 110, t('bat.foundPup'), '#cbd6ea', 15);
}

function teachPup() {
  choose(
    [
      { t: t('bat.choice.teach') },
      { t: t('bat.choice.carry') },
    ],
    (index) => {
      const teach = index === 0;
      state.bat.decided = true;
      state.bat.taught = teach;
      if (teach) {
        recordEffect('echo-shared');
        recordKarma('give');
      }
      animatePlayer();
      playChime();
      addFloater(
        player.x,
        player.y - 120,
        t(teach ? 'bat.answer.teach' : 'bat.answer.carry'),
        teach ? '#cbd6ea' : '#a9a48f',
        15,
      );
    },
  );
}

/**
 * Back at the roost: the night's work is done. (The owl's `settleRoost` lives in
 * game/owl.js; this one is imported as `settleBatRoost` in systems/goals.js.)
 */
export function settleRoost() {
  animatePlayer();
  playChime();
  addFloater(CAVE.roost.x, CAVE.roost.y - 70, t('bat.roost'), '#cbd6ea', 15);
  return isEchoing();
}
