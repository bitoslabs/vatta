'use strict';

import { MODE, SALA } from '../core/constants.js';
import { clamp, dist } from '../core/math.js';
import { state } from '../core/state.js';
import { addFloater } from '../systems/effects.js';
import { t } from '../systems/i18n.js';
import { recordKarma } from '../systems/karma.js';
import { QUESTIONS } from '../content/questions.js';
import { ghost, placeGhost } from '../entities/ghost.js';
import { player } from '../entities/player.js';
import { choose } from '../ui/choices.js';
import { say } from '../ui/dialogue.js';
import { showEndScreen } from '../ui/end-screen.js';
import { toast } from '../ui/feedback.js';
import { registerChapterHandler } from './chapters.js';

const QUESTION_INTERVAL = 11; // seconds between questions on the road
const SALA_TRIGGER = 340;
const EGO_FEAR = 0.12;
const WISDOM_FEAR = -0.14;

/**
 * Chapter 5 — non-self.
 *
 * The voice has no mouth and no body of its own: it asks who is running. Every
 * answer that builds a "me" feeds the shadow; seeing conditionality thins it.
 */
let ch5 = { index: 0, arriving: false, ended: false };
let questionTimer = QUESTION_INTERVAL;

export function startChapter5() {
  ch5 = { index: 0, arriving: false, ended: false };
  questionTimer = QUESTION_INTERVAL;
  placeGhost(clamp(player.x + 520, 120, 4400), clamp(player.y - 80, 120, 2860));
  say('ch5.intro', () => toast(t('ch5.toast.start.title'), t('ch5.toast.start.sub')));
}

export function updateChapter5(dt) {
  if (state.mode !== MODE.WORLD) return;

  // The self visibly grows with ego.
  ghost.scale = 1 + state.fear * 0.6;

  state.interact = null;
  if (state.dialogueOpen) return;

  if (!state.choiceOpen && !ch5.arriving && ghost.active) {
    questionTimer -= dt;
    if (questionTimer <= 0) askNext();
  }

  if (!ch5.arriving && !state.choiceOpen
    && dist(player.x, player.y, SALA.x, SALA.y) < SALA_TRIGGER) {
    ch5.arriving = true;
    say('ch5.arrive', askFinal);
  }
}

function askNext() {
  if (ch5.index >= QUESTIONS.length) return;
  const question = QUESTIONS[ch5.index++];
  questionTimer = QUESTION_INTERVAL;
  const options = [0, 1, 2].map((i) => ({ t: t(`q.${question.id}.a${i}`) }));
  choose(options, (choice) => resolveAnswer(question.ego[choice]));
}

function resolveAnswer(ego) {
  if (ego >= 2) {
    state.stats.selfish++;
    state.fear = clamp(state.fear + EGO_FEAR, 0, 1);
    recordKarma('cling');
    addFloater(player.x, player.y - 150, t('ch5.floater.self'), '#8f8fb0', 15);
  } else if (ego === 0) {
    state.fear = clamp(state.fear + WISDOM_FEAR, 0, 1);
    recordKarma('mindful');
    addFloater(player.x, player.y - 150, t('ch5.floater.notSelf'), '#bfd9cd', 15);
  } else {
    addFloater(player.x, player.y - 150, t('ch5.floater.neutral'), '#b9b2a0', 14);
  }
}

function askFinal() {
  choose(
    [
      { t: t('ch5.choice.self') },
      { t: t('ch5.choice.notSelf') },
      { t: t('ch5.choice.unknown') },
    ],
    (index) => {
      if (index === 0) {
        state.stats.selfish++;
        state.fear = clamp(state.fear + EGO_FEAR, 0, 1);
        recordKarma('cling');
        say('ch5.answerSelf', finish);
      } else if (index === 2) {
        say('ch5.answerUnknown', askFinal);
      } else {
        recordKarma('letgo');
        say('ch5.answerNotSelf', finish);
      }
    },
  );
}

function finish() {
  ch5.ended = true;
  showEndScreen();
}

registerChapterHandler(5, { start: startChapter5, update: updateChapter5 });
