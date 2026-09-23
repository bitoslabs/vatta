'use strict';

import { MODE, SALA } from '../core/constants.js';
import { clamp, dist } from '../core/math.js';
import { state } from '../core/state.js';
import { on, EVENTS } from '../core/events.js';
import { playChime, playThud } from '../systems/audio.js';
import { addFloater } from '../systems/effects.js';
import { t, tList } from '../systems/i18n.js';
import { getKarma, recordKarma } from '../systems/karma.js';
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
const TRAIL_LENGTH = 75;      // ~1.25s of the player's own path
const QUESTION_INTERVAL = 12;
const RETALIATE_RANGE = 150;
const EMBRACE_RANGE = 150;
const LOOT_RANGE = 90;

/**
 * Chapter 9 — the remaining tendency (Part 2).
 *
 * This spirit does not chase: it retraces the path you have already walked.
 * Its rule and its face come from whichever tendency (อนุสัย) is strongest in
 * you, and it is stilled the same way for all — by mindfulness.
 */
const TENDENCY_RULES = {
  anger: { tint: 'rgba(200,120,110,.55)', temptation: 'retaliate' },
  greed: { tint: 'rgba(232,196,106,.55)', temptation: 'loot', lures: true },
  delusion: { tint: 'rgba(150,150,178,.5)', temptation: 'questions' },
  clinging: { tint: 'rgba(226,214,240,.55)', temptation: 'embrace' },
  balanced: { tint: 'rgba(200,235,225,.5)', temptation: null },
};

let ch9 = { tendency: 'balanced', trail: [], questionTimer: QUESTION_INTERVAL, asked: false, ended: false };

/** Strongest remaining tendency, from the accumulated อนุสัย (not action counts). */
function dominantTendency() {
  const tendencies = getKarma().tendencies;
  const scores = {
    anger: Math.max(0, tendencies.anger || 0),
    greed: Math.max(0, tendencies.greed || 0),
    delusion: Math.max(0, tendencies.delusion || 0),
    clinging: Math.max(0, tendencies.clinging || 0),
  };
  let best = null;
  let bestValue = 0;
  for (const [id, value] of Object.entries(scores)) {
    if (value > bestValue) {
      bestValue = value;
      best = id;
    }
  }
  return best || 'balanced';
}

export function startChapter9() {
  ch9 = {
    tendency: dominantTendency(),
    trail: [],
    questionTimer: QUESTION_INTERVAL,
    asked: false,
    ended: false,
  };
  const rule = TENDENCY_RULES[ch9.tendency];

  resetLures();
  state.luresVisible = Boolean(rule.lures);
  ghost.tint = rule.tint;
  ghost.profile.replay = true;
  ghost.mindDissolve = true;
  placeGhost(clamp(player.x + 320, 120, 4400), clamp(player.y - 40, 120, 2860));

  say('ch9.intro', () => {
    toast(t('ch9.toast.start.title'), t('ch9.toast.start.sub'));
    addFloater(player.x, player.y - 150, t(`ch9.tendency.${ch9.tendency}`), '#c9c2d6', 15);
  });
}

export function updateChapter9(dt) {
  if (state.mode !== MODE.WORLD) return;
  state.interact = null;

  // Record the path being walked — the habit retraces it.
  ch9.trail.push({ x: player.x, y: player.y });
  if (ch9.trail.length > TRAIL_LENGTH) ch9.trail.shift();
  ghost.replayTarget = ch9.trail[0];

  if (state.dialogueOpen || state.choiceOpen) return;

  const rule = TENDENCY_RULES[ch9.tendency];
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
        ch9.questionTimer -= dt;
        if (ch9.questionTimer <= 0) askQuestion();
      }
      break;
    default:
      break;
  }

  if (!ch9.asked && dist(player.x, player.y, SALA.x, SALA.y) < SALA_TRIGGER) {
    ch9.asked = true;
    state.luresVisible = false;
    say('ch9.arrive', askHabit);
  }
}

function retaliate() {
  if (!ghost.active) return;
  state.stats.retaliations++;
  state.fear = clamp(state.fear + 0.28, 0, 1);
  recordKarma('harm');
  ghost.enraged = 6;
  ghost.stun = 0;
  cam.shake = 0.5;
  playThud();
  addFloater(player.x, player.y - 120, t('ch9.floater.tempted'), '#c98a7a', 15);
}

function embrace() {
  if (!ghost.active) return;
  state.stats.clung++;
  state.fear = clamp(state.fear + 0.3, 0, 1);
  recordKarma('cling');
  playThud();
  addFloater(player.x, player.y - 120, t('ch9.floater.tempted'), '#c8a2c8', 15);
}

function loot(lure) {
  if (!takeLure(lure)) return;
  state.stats.looted++;
  recordKarma('steal');
  playChime();
  addFloater(player.x, player.y - 120, t('ch9.floater.tempted'), '#e9c46a', 15);
}

function askQuestion() {
  ch9.questionTimer = QUESTION_INTERVAL;
  const options = tList('ch9.question').map((text) => ({ t: text }));
  choose(options, (choice) => {
    if (choice === 0) {
      state.fear = clamp(state.fear + 0.12, 0, 1);
      recordKarma('cling');
      addFloater(player.x, player.y - 150, t('ch9.floater.tempted'), '#8f8fb0', 15);
    } else {
      addFloater(player.x, player.y - 150, t('ch9.floater.seen'), '#bfd9cd', 15);
    }
  });
}

function askHabit() {
  choose(
    [
      { t: t('ch9.choice.self') },
      { t: t('ch9.choice.habit') },
      { t: t('ch9.choice.unsure') },
    ],
    (index) => {
      if (index === 0) {
        recordKarma('cling');
        say('ch9.answerCold', finish);
      } else if (index === 2) {
        say('ch9.answerCool', askHabit);
      } else {
        recordKarma('letgo');
        say('ch9.answerWarm', finish);
      }
    },
  );
}

function finish() {
  ch9.ended = true;
  state.luresVisible = false;
  showEndScreen();
}

registerChapterHandler(9, { start: startChapter9, update: updateChapter9 });

on(EVENTS.GHOST_PACIFIED, (cause) => {
  if (state.chapter === 9 && cause === 'mind') recordKarma('mindful');
});
