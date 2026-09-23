'use strict';

import { MODE, SALA } from '../core/constants.js';
import { clamp, dist } from '../core/math.js';
import { state } from '../core/state.js';
import { on, EVENTS } from '../core/events.js';
import { playChime, playThud } from '../systems/audio.js';
import { addFloater } from '../systems/effects.js';
import { isMindful } from '../systems/input.js';
import { t, tList } from '../systems/i18n.js';
import { dominantTendencyId, recordKarma } from '../systems/karma.js';
import { ghost, placeGhost } from '../entities/ghost.js';
import { player } from '../entities/player.js';
import { choose } from '../ui/choices.js';
import { say } from '../ui/dialogue.js';
import { showEndScreen } from '../ui/end-screen.js';
import { toast } from '../ui/feedback.js';
import { cam } from './camera.js';
import { registerChapterHandler } from './chapters.js';
import { nearestLure, resetLures, takeLure } from './lures.js';

const SALA_TRIGGER = 340;
const RETALIATE_RANGE = 150;
const EMBRACE_RANGE = 150;
const LOOT_RANGE = 90;
const QUESTION_INTERVAL = 11;

const BASE_SPEED = 120;
const SPEED_PER_REP = 14;
const SCALE_PER_REP = 0.18;
const SCALE_PER_NOTICE = 0.08;

/**
 * Chapter 10 — the growing shadow.
 *
 * This spirit grows larger and faster every time you feed it, and shrinks when
 * you notice it. The temptation is still chosen from your strongest remaining
 * tendency, but the lesson is about repetition itself: what we do again, we
 * become.
 */
const TENDENCY_RULES = {
  anger: { tint: 'rgba(200,120,110,.55)', temptation: 'retaliate' },
  greed: { tint: 'rgba(232,196,106,.55)', temptation: 'loot', lures: true },
  delusion: { tint: 'rgba(150,150,178,.5)', temptation: 'questions' },
  clinging: { tint: 'rgba(226,214,240,.55)', temptation: 'embrace' },
  balanced: { tint: 'rgba(200,235,225,.5)', temptation: null },
};

let ch10 = { tendency: 'balanced', notices: 0, questionTimer: QUESTION_INTERVAL, asked: false, ended: false };

export function startChapter10() {
  ch10 = {
    tendency: dominantTendencyId() || 'balanced',
    notices: 0,
    questionTimer: QUESTION_INTERVAL,
    asked: false,
    ended: false,
  };
  state.stats.reps = 0;
  const rule = TENDENCY_RULES[ch10.tendency];

  resetLures();
  state.luresVisible = Boolean(rule.lures);
  ghost.tint = rule.tint;
  ghost.profile.replay = false;
  ghost.mindDissolve = true;
  placeGhost(clamp(player.x + 480, 120, 4400), clamp(player.y - 60, 120, 2860));

  say('ch10.intro', () => {
    toast(t('ch10.toast.start.title'), t('ch10.toast.start.sub'));
    addFloater(player.x, player.y - 150, t(`ch10.tendency.${ch10.tendency}`), '#d6c2cd', 15);
  });
}

export function updateChapter10(dt) {
  if (state.mode !== MODE.WORLD) return;
  state.interact = null;

  applyGrowth(dt);
  if (state.dialogueOpen || state.choiceOpen) return;

  const rule = TENDENCY_RULES[ch10.tendency];
  const d = dist(player.x, player.y, ghost.x, ghost.y);

  switch (rule.temptation) {
    case 'retaliate':
      if (ghost.active && d < RETALIATE_RANGE) {
        state.interact = { fn: retaliate, labelKey: 'prompt.retaliate' };
      }
      break;
    case 'embrace':
      if (ghost.active && d < EMBRACE_RANGE) {
        state.interact = { fn: embrace, labelKey: 'prompt.embrace' };
      }
      break;
    case 'loot': {
      const lure = nearestLure(player.x, player.y, LOOT_RANGE);
      if (lure) state.interact = { fn: () => loot(lure), labelKey: 'prompt.loot' };
      break;
    }
    case 'questions':
      if (ghost.active) {
        ch10.questionTimer -= dt;
        if (ch10.questionTimer <= 0) askQuestion();
      }
      break;
    default:
      break;
  }

  if (!ch10.asked && dist(player.x, player.y, SALA.x, SALA.y) < SALA_TRIGGER) {
    ch10.asked = true;
    state.luresVisible = false;
    if (state.stats.reps === 0) recordKarma('precept');
    say('ch10.arrive', askRepetition);
  }
}

/** The shadow grows with every repetition and thins as it is noticed. */
function applyGrowth(dt) {
  const mind = isMindful();
  if (mind && ghost.active && dist(player.x, player.y, ghost.x, ghost.y) < 520) {
    ch10.notices += dt;
  }

  const reps = state.stats.reps;
  ghost.scale = clamp(1 + reps * SCALE_PER_REP - ch10.notices * SCALE_PER_NOTICE, 0.7, 2.4);
  ghost.profile.baseSpeed = BASE_SPEED + reps * SPEED_PER_REP;
  // Noticing also makes it easier to still.
  ghost.profile.mindDissolveTime = Math.max(1.6, 3.2 - ch10.notices * 0.25);
}

function repeat() {
  state.stats.reps++;
  ghost.enraged = Math.max(ghost.enraged, 2.5);
  addFloater(player.x, player.y - 120, t('ch10.floater.grown', { reps: state.stats.reps }), '#d68a9a', 15);
}

function retaliate() {
  if (!ghost.active) return;
  state.stats.retaliations++;
  state.fear = clamp(state.fear + 0.28, 0, 1);
  recordKarma('harm');
  ghost.stun = 0;
  cam.shake = 0.5;
  playThud();
  repeat();
}

function embrace() {
  if (!ghost.active) return;
  state.stats.clung++;
  state.fear = clamp(state.fear + 0.3, 0, 1);
  recordKarma('cling');
  playThud();
  repeat();
}

function loot(lure) {
  if (!takeLure(lure)) return;
  state.stats.looted++;
  recordKarma('steal');
  playChime();
  repeat();
}

function askQuestion() {
  ch10.questionTimer = QUESTION_INTERVAL;
  const options = tList('ch10.question').map((text) => ({ t: text }));
  choose(options, (choice) => {
    if (choice === 0) {
      state.fear = clamp(state.fear + 0.12, 0, 1);
      recordKarma('cling');
      repeat();
    } else {
      addFloater(player.x, player.y - 150, t('ch10.floater.noticed'), '#bfd9cd', 15);
    }
  });
}

function askRepetition() {
  choose(
    [
      { t: t('ch10.choice.self') },
      { t: t('ch10.choice.stop') },
      { t: t('ch10.choice.unsure') },
    ],
    (index) => {
      if (index === 0) {
        recordKarma('cling');
        repeat();
        say('ch10.answerCold', finish);
      } else if (index === 2) {
        say('ch10.answerCool', askRepetition);
      } else {
        recordKarma('letgo');
        say('ch10.answerWarm', finish);
      }
    },
  );
}

function finish() {
  ch10.ended = true;
  state.luresVisible = false;
  showEndScreen();
}

registerChapterHandler(10, { start: startChapter10, update: updateChapter10 });

on(EVENTS.GHOST_PACIFIED, (cause) => {
  if (state.chapter === 10 && cause === 'mind') recordKarma('mindful');
});
