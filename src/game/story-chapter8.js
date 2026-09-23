'use strict';

import { MODE, SALA } from '../core/constants.js';
import { clamp, dist } from '../core/math.js';
import { state } from '../core/state.js';
import { on, EVENTS } from '../core/events.js';
import { playChime, playThud } from '../systems/audio.js';
import { addFloater } from '../systems/effects.js';
import { t, tList } from '../systems/i18n.js';
import { recordKarma } from '../systems/karma.js';
import { getKarmaMemory } from '../systems/karma-memory.js';
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
const QUESTION_INTERVAL = 12;

/**
 * Chapter 8 — the mirror of kamma (opening of Part 2).
 *
 * The spirit that meets you is shaped by your own dominant tendency: it wears
 * that face, offers that temptation, and is stilled the same way for all —
 * by mindfulness. What you meet is what you have been.
 */
const MIRRORS = {
  anger: {
    tint: 'rgba(200,120,110,.55)',
    profile: { baseSpeed: 152, fearSpeedBonus: 120, mindSpeedBase: 60, mindSpeedFearBonus: 60, mindDissolveTime: 3.0, enrageSpeedFactor: 1.5, standOff: 0 },
    temptation: 'retaliate',
  },
  greed: {
    tint: 'rgba(232,196,106,.55)',
    profile: { baseSpeed: 132, fearSpeedBonus: 100, mindSpeedBase: 55, mindSpeedFearBonus: 55, mindDissolveTime: 3.0, enrageSpeedFactor: 1.6, standOff: 0 },
    temptation: 'loot',
    lures: true,
  },
  delusion: {
    tint: 'rgba(150,150,178,.5)',
    profile: { baseSpeed: 124, fearSpeedBonus: 90, mindSpeedBase: 55, mindSpeedFearBonus: 45, mindDissolveTime: 2.9, enrageSpeedFactor: 1.4, standOff: 0 },
    temptation: 'questions',
  },
  clinging: {
    tint: 'rgba(226,214,240,.55)',
    profile: { baseSpeed: 96, fearSpeedBonus: 40, mindSpeedBase: 60, mindSpeedFearBonus: 30, mindDissolveTime: 3.2, enrageSpeedFactor: 1.2, standOff: 190 },
    temptation: 'embrace',
  },
  balanced: {
    tint: 'rgba(200,235,225,.5)',
    profile: { baseSpeed: 130, fearSpeedBonus: 90, mindSpeedBase: 50, mindSpeedFearBonus: 45, mindDissolveTime: 2.6, enrageSpeedFactor: 1.3, standOff: 0 },
    temptation: null,
  },
};

let ch8 = { mirror: 'balanced', questionTimer: QUESTION_INTERVAL, asked: false, ended: false };

/** Which face the mirror wears, from the run's own tendencies. */
function dominantMirror() {
  const m = getKarmaMemory();
  const scores = {
    anger: m.harmed,
    greed: m.took,
    delusion: m.lied + m.panicked,
    clinging: m.clung,
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

export function startChapter8() {
  ch8 = { mirror: dominantMirror(), questionTimer: QUESTION_INTERVAL, asked: false, ended: false };
  const mirror = MIRRORS[ch8.mirror];

  resetLures();
  state.luresVisible = Boolean(mirror.lures);
  ghost.tint = mirror.tint;
  Object.assign(ghost.profile, mirror.profile);
  ghost.mindDissolve = true;
  placeGhost(clamp(player.x + 620, 120, 4400), clamp(player.y - 80, 120, 2860));

  say('ch8.intro', () => {
    toast(t('ch8.toast.start.title'), t('ch8.toast.start.sub'));
    addFloater(player.x, player.y - 150, t(`ch8.mirror.${ch8.mirror}`), '#c9c2d6', 15);
  });
}

export function updateChapter8(dt) {
  if (state.mode !== MODE.WORLD) return;
  state.interact = null;
  if (state.dialogueOpen || state.choiceOpen) return;

  const mirror = MIRRORS[ch8.mirror];
  const d = dist(player.x, player.y, ghost.x, ghost.y);

  switch (mirror.temptation) {
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
        ch8.questionTimer -= dt;
        if (ch8.questionTimer <= 0) askQuestion();
      }
      break;
    default:
      break;
  }

  if (!ch8.asked && dist(player.x, player.y, SALA.x, SALA.y) < SALA_TRIGGER) {
    ch8.asked = true;
    state.luresVisible = false;
    say('ch8.arrive', askMirror);
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
  addFloater(player.x, player.y - 120, t('ch8.floater.tempted'), '#c98a7a', 15);
}

function embrace() {
  if (!ghost.active) return;
  state.stats.clung++;
  state.fear = clamp(state.fear + 0.3, 0, 1);
  recordKarma('cling');
  playThud();
  addFloater(player.x, player.y - 120, t('ch8.floater.tempted'), '#c8a2c8', 15);
}

function loot(lure) {
  if (!takeLure(lure)) return;
  state.stats.looted++;
  recordKarma('steal');
  playChime();
  addFloater(player.x, player.y - 120, t('ch8.floater.tempted'), '#e9c46a', 15);
}

function askQuestion() {
  ch8.questionTimer = QUESTION_INTERVAL;
  const options = tList('ch8.question').map((text) => ({ t: text }));
  choose(options, (choice) => {
    if (choice === 0) {
      state.fear = clamp(state.fear + 0.12, 0, 1);
      recordKarma('cling');
      addFloater(player.x, player.y - 150, t('ch8.floater.tempted'), '#8f8fb0', 15);
    } else {
      addFloater(player.x, player.y - 150, t('ch8.floater.seen'), '#bfd9cd', 15);
    }
  });
}

function askMirror() {
  choose(
    [
      { t: t('ch8.choice.aversion') },
      { t: t('ch8.choice.insight') },
      { t: t('ch8.choice.afraid') },
    ],
    (index) => {
      if (index === 0) {
        recordKarma('cling');
        say('ch8.answerCold', finish);
      } else if (index === 2) {
        say('ch8.answerCool', askMirror);
      } else {
        recordKarma('letgo');
        say('ch8.answerWarm', finish);
      }
    },
  );
}

function finish() {
  ch8.ended = true;
  state.luresVisible = false;
  showEndScreen();
}

registerChapterHandler(8, { start: startChapter8, update: updateChapter8 });

on(EVENTS.GHOST_PACIFIED, (cause) => {
  if (state.chapter === 8 && cause === 'mind') recordKarma('mindful');
});
