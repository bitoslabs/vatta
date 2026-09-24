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
import { CREVICE } from '../world/world-data.js';
import { animatePlayer, player } from '../entities/player.js';

/**
 * The snake's life: the crevice and the sealed spring (docs/animal-lives-story.md
 * ch.6, "ช่องแคบ").
 *
 * A spring is shut inside a ring of stone whose only way in is a slot that a body
 * can slip through only by flattening itself — the snake's own tool. Inside, the
 * one question is whether to *widen* the slot so every body may pass and the
 * water links to the river, or to keep its narrow way to itself. Widening records
 * the `water-linked` world effect, which opens the stone for every later life
 * (systems/worldgen.js#worldAbilities), so the choice has a consequence you can
 * walk through centuries later.
 */
const SPRING_RANGE = 120;

export function creviceSite() {
  return CREVICE;
}

export function isLinked() {
  return hasEffect('water-linked');
}

export function hasDecided() {
  return state.snake?.decided === true;
}

export function didWiden() {
  return state.snake?.widened === true;
}

/** Every life arrives at stone that is still shut; a chapter load clears it. */
export function resetSnake() {
  state.snake = { decided: false, widened: false };
}

/**
 * Where a snake's life can end *right now*: first the spring inside the stone (a
 * guide, and the one question the crevice asks), then the outflow where the
 * water leaves for the river — the place its life can end.
 */
export function snakeGoal() {
  if (hasDecided()) {
    return { x: CREVICE.outflow.x, y: CREVICE.outflow.y, r: CREVICE.outflowRadius, kind: 'link' };
  }
  return { x: CREVICE.spring.x, y: CREVICE.spring.y, r: CREVICE.springRadius, kind: 'spring' };
}

/** The slot in the stone: widen it for every body, or keep the narrow way. */
export function updateSnake() {
  if (state.mode !== MODE.WORLD) return;
  if (state.dialogueOpen || state.choiceOpen || state.interact) return;
  if (getForm().lifeGoal !== 'crevice') return;
  if (hasDecided()) return;
  if (dist(player.x, player.y, CREVICE.spring.x, CREVICE.spring.y) > SPRING_RANGE) return;
  state.interact = { fn: decideCrevice, labelKey: 'prompt.openCrevice' };
}

function decideCrevice() {
  choose(
    [
      { t: t('snake.choice.widen') },
      { t: t('snake.choice.keep') },
    ],
    (index) => {
      const widen = index === 0;
      state.snake.decided = true;
      state.snake.widened = widen;
      // The choice is the act: the stone either opens for everyone, or stays a
      // way only this body knows.
      if (widen) {
        recordEffect('water-linked');
        recordKarma('give');
      }
      animatePlayer();
      playChime();
      addFloater(
        player.x,
        player.y - 120,
        t(widen ? 'snake.answer.widen' : 'snake.answer.keep'),
        widen ? '#8fd0c4' : '#b9b2a0',
        15,
      );
    },
  );
}

/** Out by the linked water: the spring now runs to the river. */
export function linkWater() {
  animatePlayer();
  playChime();
  addFloater(CREVICE.outflow.x, CREVICE.outflow.y - 70, t('snake.linked'), '#8fd0c4', 15);
  return isLinked();
}
