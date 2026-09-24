'use strict';

import { MODE, TEMPLE, WORLD } from '../core/constants.js';
import { clamp, dist } from '../core/math.js';
import { state } from '../core/state.js';
import { on, EVENTS } from '../core/events.js';
import { playBell, playChime, playThud } from '../systems/audio.js';
import { addFloater } from '../systems/effects.js';
import { isMindful } from '../systems/input.js';
import { t, tList } from '../systems/i18n.js';
import { getKarma, rankedTendencies, recordKarma } from '../systems/karma.js';
import { unlockedCount } from '../systems/path.js';
import { keptPreceptCount } from '../systems/precepts.js';
import { STATUS } from '../entities/ghost-status.js';
import { addGhost, enrageGhost, ghost, ghosts, placeGhostAt } from '../entities/ghost.js';
import { player } from '../entities/player.js';
import { choose } from '../ui/choices.js';
import { say } from '../ui/dialogue.js';
import { showEndScreen } from '../ui/end-screen.js';
import { toast } from '../ui/feedback.js';
import { cam } from './camera.js';
import { registerChapterHandler } from './chapters.js';
import { nearestLure, resetLures, takeLure } from './lures.js';

const MAX_SPIRITS = 4;
const SPLIT_RANGE = 420;
const SPLIT_INTERVAL = 3.0;
const STRIKE_RANGE = 160;
const LOOT_RANGE = 90;
const QUESTION_INTERVAL = 12;
const TEMPLE_TRIGGER = 340;

/**
 * Chapter 14 — the wheel and the way out (Part Three capstone).
 *
 * The composite of everything: a pair that divides and grows, and that cannot
 * be destroyed by any technique the player has learned. The wheel is not beaten;
 * it is left. Endure to the bodhi tree, and the ending is decided by the whole
 * run — the path opened, the precepts kept, and kamma not outweighed by harm.
 */
const TENDENCY_RULES = {
  anger: { tint: 'rgba(200,120,110,.55)', temptation: 'retaliate' },
  greed: { tint: 'rgba(232,196,106,.55)', temptation: 'loot', lures: true },
  delusion: { tint: 'rgba(150,150,178,.5)', temptation: 'questions' },
  clinging: { tint: 'rgba(226,214,240,.55)', temptation: 'embrace' },
  balanced: { tint: 'rgba(200,235,225,.5)', temptation: null },
};

const FALLBACK_SECOND = 'delusion';

let ch14 = { first: 'balanced', second: 'balanced', reps: 0, splitTimer: 0, questionTimer: QUESTION_INTERVAL, asked: false, ended: false };

export function startChapter14() {
  const ranked = rankedTendencies();
  ch14 = {
    first: ranked[0] || 'balanced',
    second: ranked[1] || (ranked[0] ? FALLBACK_SECOND : 'balanced'),
    reps: 0,
    splitTimer: 0,
    questionTimer: QUESTION_INTERVAL,
    asked: false,
    ended: false,
  };
  state.stats.reps = 0;
  state.liberated = false;

  const firstRule = TENDENCY_RULES[ch14.first];
  const secondRule = TENDENCY_RULES[ch14.second];
  resetLures();
  state.luresVisible = Boolean(firstRule.lures || secondRule.lures);

  ghost.tint = firstRule.tint;
  ghost.mindDissolve = false;
  placeGhostAt(ghost, clamp(player.x + 520, 120, WORLD.w - 120), clamp(player.y - 60, 120, WORLD.h - 120));

  const partner = addGhost({ tint: secondRule.tint, mindDissolve: false, profile: spiritProfile(112) });
  placeGhostAt(partner, clamp(player.x + 520, 120, WORLD.w - 120), clamp(player.y + 220, 120, WORLD.h - 120));

  say('ch14.intro', () => {
    toast(t('ch14.toast.start.title'), t('ch14.toast.start.sub'));
    addFloater(
      player.x,
      player.y - 150,
      t('ch14.pair', { a: t(`tendency.${ch14.first}`), b: t(`tendency.${ch14.second}`) }),
      '#cdc4d6',
      15,
    );
  });
}

function spiritProfile(speed) {
  return {
    baseSpeed: speed,
    fearSpeedBonus: 42,
    mindSpeedBase: 58,
    mindSpeedFearBonus: 26,
    mindDissolveTime: 99,
    enrageSpeedFactor: 1.2,
    standOff: 0,
  };
}

export function updateChapter14(dt) {
  if (state.mode !== MODE.WORLD) return;
  state.interact = null;

  const mind = isMindful();
  const nearest = closestDistance();
  applyGrowth(dt, mind, nearest);

  if (state.dialogueOpen || state.choiceOpen) return;

  const rules = [TENDENCY_RULES[ch14.first], TENDENCY_RULES[ch14.second]];

  if (rules.some((rule) => rule.lures)) {
    const lure = nearestLure(player.x, player.y, LOOT_RANGE);
    if (lure) state.interact = { fn: () => loot(lure), labelKey: 'prompt.loot' };
  }
  if (state.interact === null && nearest < STRIKE_RANGE) {
    state.interact = { fn: strike, labelKey: 'prompt.retaliate' };
  }
  if (state.interact === null && rules.some((rule) => rule.temptation === 'embrace') && nearest < STRIKE_RANGE) {
    state.interact = { fn: embrace, labelKey: 'prompt.embrace' };
  }
  if (rules.some((rule) => rule.temptation === 'questions') && ghosts.some((s) => s.active)) {
    ch14.questionTimer -= dt;
    if (ch14.questionTimer <= 0) askQuestion();
  }

  if (!ch14.asked && dist(player.x, player.y, TEMPLE.x, TEMPLE.y) < TEMPLE_TRIGGER) {
    ch14.asked = true;
    state.luresVisible = false;
    for (const spirit of ghosts) {
      if (spirit.active) {
        spirit.mode = STATUS.FADE;
        spirit.fade = 2.0;
      }
    }
    playBell();
    say('ch14.arrive', askFinale);
  }
}

function applyGrowth(dt, mind, nearest) {
  if (mind && nearest < SPLIT_RANGE && ghosts.length < MAX_SPIRITS) {
    ch14.splitTimer += dt;
    if (ch14.splitTimer >= SPLIT_INTERVAL) {
      ch14.splitTimer = 0;
      split();
    }
  } else {
    ch14.splitTimer = Math.max(0, ch14.splitTimer - dt * 0.5);
  }

  for (const spirit of ghosts) {
    spirit.scale = clamp(1 + ch14.reps * 0.12, 0.8, 2.4);
    spirit.profile.baseSpeed = 112 + ch14.reps * 10;
    spirit.profile.mindDissolveTime = 99;
  }
}

function closestDistance() {
  let nearest = Infinity;
  for (const spirit of ghosts) {
    if (!spirit.active) continue;
    nearest = Math.min(nearest, dist(player.x, player.y, spirit.x, spirit.y));
  }
  return nearest;
}

function split() {
  const source = ghosts[0];
  const angle = ghosts.length * 2.1;
  const spirit = addGhost({ tint: source.tint, mindDissolve: false, profile: spiritProfile(110) });
  placeGhostAt(
    spirit,
    clamp(player.x + Math.cos(angle) * 240, 120, WORLD.w - 120),
    clamp(player.y + Math.sin(angle) * 240, 120, WORLD.h - 120),
  );
  playChime();
  addFloater(player.x, player.y - 140, t('ch14.floater.split', { n: ghosts.length }), '#cdc4d6', 15);
}

function repeat() {
  ch14.reps++;
  state.stats.reps = ch14.reps;
  for (const spirit of ghosts) enrageGhost(2.5, spirit);
  addFloater(player.x, player.y - 120, t('ch14.floater.grown', { reps: ch14.reps }), '#d68a9a', 15);
}

function strike() {
  state.stats.retaliations++;
  state.fear = clamp(state.fear + 0.28, 0, 1);
  recordKarma('harm');
  cam.shake = 0.5;
  playThud();
  repeat();
  if (ghosts.length < MAX_SPIRITS) split();
}

function embrace() {
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
  ch14.questionTimer = QUESTION_INTERVAL;
  const options = tList('ch14.question').map((text) => ({ t: text }));
  choose(options, (choice) => {
    if (choice === 0) {
      state.fear = clamp(state.fear + 0.12, 0, 1);
      recordKarma('cling');
      repeat();
    } else {
      addFloater(player.x, player.y - 150, t('ch14.floater.seen'), '#bfd9cd', 15);
    }
  });
}

/** The complete path: the eight factors open, the precepts kept, kamma unowed. */
function canCompletePath() {
  const karma = getKarma();
  return unlockedCount() >= 8 && keptPreceptCount() >= 5 && karma.merit >= karma.demerit;
}

function canRelease() {
  const karma = getKarma();
  return unlockedCount() >= 5 || karma.merit >= karma.demerit;
}

function askFinale() {
  const options = [];
  const keys = [];
  if (canCompletePath()) {
    options.push({ t: t('ch14.choice.free') });
    keys.push('free');
  }
  if (canRelease()) {
    options.push({ t: t('ch14.choice.release') });
    keys.push('release');
  }
  options.push({ t: t('ch14.choice.bound') });
  keys.push('bound');

  choose(options, (index) => {
    const choice = keys[index];
    if (choice === 'free') {
      recordKarma('letgo');
      state.liberated = true;
      say('ch14.answerFree', finish);
    } else if (choice === 'release') {
      recordKarma('letgo');
      state.liberated = getKarma().merit >= getKarma().demerit;
      say('ch14.answerRelease', finish);
    } else {
      recordKarma('cling');
      state.liberated = false;
      say('ch14.answerBound', finish);
    }
  });
}

function finish() {
  ch14.ended = true;
  state.luresVisible = false;
  showEndScreen();
}

registerChapterHandler(14, { start: startChapter14, update: updateChapter14 });

on(EVENTS.GHOST_PACIFIED, (cause) => {
  if (state.chapter === 14 && cause === 'mind') recordKarma('mindful');
});
