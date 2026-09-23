'use strict';

import { MODE, SALA } from '../core/constants.js';
import { clamp, dist } from '../core/math.js';
import { state } from '../core/state.js';
import { on, EVENTS } from '../core/events.js';
import { playChime, playThud } from '../systems/audio.js';
import { addFloater } from '../systems/effects.js';
import { t, tList } from '../systems/i18n.js';
import { rankedTendencies, recordKarma } from '../systems/karma.js';
import { addGhost, enrageGhost, ghost, ghosts, placeGhostAt } from '../entities/ghost.js';
import { player } from '../entities/player.js';
import { choose } from '../ui/choices.js';
import { say } from '../ui/dialogue.js';
import { showEndScreen } from '../ui/end-screen.js';
import { toast } from '../ui/feedback.js';
import { cam } from './camera.js';
import { registerChapterHandler } from './chapters.js';
import { nearestLure, resetLures, takeLure } from './lures.js';

const SALA_TRIGGER = 340;
const CLOSE_RANGE = 150;
const LOOT_RANGE = 90;
const QUESTION_INTERVAL = 11;

/**
 * Chapter 11 — the pair (Part 2).
 *
 * Two spirits rise at once, one for each of your two strongest remaining
 * tendencies. Facing one habit is work; facing two means neither can be
 * escaped by running. They are stilled by mindfulness, as always.
 */
const TENDENCY_RULES = {
  anger: { tint: 'rgba(200,120,110,.55)', temptation: 'retaliate' },
  greed: { tint: 'rgba(232,196,106,.55)', temptation: 'loot', lures: true },
  delusion: { tint: 'rgba(150,150,178,.5)', temptation: 'questions' },
  clinging: { tint: 'rgba(226,214,240,.55)', temptation: 'embrace' },
  balanced: { tint: 'rgba(200,235,225,.5)', temptation: null },
};

/** Fallback second face when the run has only one tendency recorded. */
const FALLBACK_SECOND = 'clinging';

let ch11 = { first: 'balanced', second: 'balanced', partner: null, questionTimer: QUESTION_INTERVAL, asked: false, ended: false };

export function startChapter11() {
  const ranked = rankedTendencies();
  ch11 = {
    first: ranked[0] || 'balanced',
    second: ranked[1] || (ranked[0] ? FALLBACK_SECOND : 'balanced'),
    partner: null,
    questionTimer: QUESTION_INTERVAL,
    asked: false,
    ended: false,
  };

  const firstRule = TENDENCY_RULES[ch11.first];
  const secondRule = TENDENCY_RULES[ch11.second];

  resetLures();
  state.luresVisible = Boolean(firstRule.lures || secondRule.lures);

  // primary spirit
  ghost.tint = firstRule.tint;
  ghost.profile.replay = false;
  ghost.mindDissolve = true;
  placeGhostAt(ghost, clamp(player.x + 460, 120, 4400), clamp(player.y - 70, 120, 2860));

  // second spirit, on the other side
  ch11.partner = addGhost({
    tint: secondRule.tint,
    mindDissolve: true,
    profile: {
      baseSpeed: 126,
      fearSpeedBonus: 60,
      mindSpeedBase: 55,
      mindSpeedFearBonus: 35,
      mindDissolveTime: 3.0,
      enrageSpeedFactor: 1.35,
      standOff: 0,
    },
  });
  placeGhostAt(ch11.partner, clamp(player.x - 420, 120, 4400), clamp(player.y + 90, 120, 2860));

  say('ch11.intro', () => {
    toast(t('ch11.toast.start.title'), t('ch11.toast.start.sub'));
    addFloater(
      player.x,
      player.y - 150,
      t('ch11.pair', { a: t(`tendency.${ch11.first}`), b: t(`tendency.${ch11.second}`) }),
      '#d6c2cd',
      15,
    );
  });
}

export function updateChapter11(dt) {
  if (state.mode !== MODE.WORLD) return;
  state.interact = null;
  if (state.dialogueOpen || state.choiceOpen) return;

  const rules = [TENDENCY_RULES[ch11.first], TENDENCY_RULES[ch11.second]];

  if (rules.some((rule) => rule.lures)) {
    const lure = nearestLure(player.x, player.y, LOOT_RANGE);
    if (lure) state.interact = { fn: () => loot(lure), labelKey: 'prompt.loot' };
  }

  if (state.interact === null && rules.some((rule) => rule.temptation === 'retaliate')) {
    const spirit = nearestSpirit(CLOSE_RANGE);
    if (spirit) state.interact = { fn: retaliate, labelKey: 'prompt.retaliate' };
  }

  if (state.interact === null && rules.some((rule) => rule.temptation === 'embrace')) {
    const spirit = nearestSpirit(CLOSE_RANGE);
    if (spirit) state.interact = { fn: embrace, labelKey: 'prompt.embrace' };
  }

  if (rules.some((rule) => rule.temptation === 'questions') && ghosts.some((s) => s.active)) {
    ch11.questionTimer -= dt;
    if (ch11.questionTimer <= 0) askQuestion();
  }

  if (!ch11.asked && dist(player.x, player.y, SALA.x, SALA.y) < SALA_TRIGGER) {
    ch11.asked = true;
    state.luresVisible = false;
    say('ch11.arrive', askPair);
  }
}

function nearestSpirit(range) {
  let best = null;
  let bestDist = range;
  for (const spirit of ghosts) {
    if (!spirit.active) continue;
    const d = dist(player.x, player.y, spirit.x, spirit.y);
    if (d < bestDist) {
      bestDist = d;
      best = spirit;
    }
  }
  return best;
}

function retaliate() {
  const spirit = nearestSpirit(CLOSE_RANGE) || ghost;
  state.stats.retaliations++;
  state.fear = clamp(state.fear + 0.28, 0, 1);
  recordKarma('harm');
  enrageGhost(6, spirit);
  cam.shake = 0.5;
  playThud();
  addFloater(player.x, player.y - 120, t('ch11.floater.tempted'), '#c98a7a', 15);
}

function embrace() {
  const spirit = nearestSpirit(CLOSE_RANGE) || ghost;
  state.stats.clung++;
  state.fear = clamp(state.fear + 0.3, 0, 1);
  recordKarma('cling');
  enrageGhost(3, spirit);
  playThud();
  addFloater(player.x, player.y - 120, t('ch11.floater.tempted'), '#c8a2c8', 15);
}

function loot(lure) {
  if (!takeLure(lure)) return;
  state.stats.looted++;
  recordKarma('steal');
  playChime();
  addFloater(player.x, player.y - 120, t('ch11.floater.tempted'), '#e9c46a', 15);
}

function askQuestion() {
  ch11.questionTimer = QUESTION_INTERVAL;
  const options = tList('ch11.question').map((text) => ({ t: text }));
  choose(options, (choice) => {
    if (choice === 0) {
      state.fear = clamp(state.fear + 0.12, 0, 1);
      recordKarma('cling');
      addFloater(player.x, player.y - 150, t('ch11.floater.tempted'), '#8f8fb0', 15);
    } else {
      addFloater(player.x, player.y - 150, t('ch11.floater.seen'), '#bfd9cd', 15);
    }
  });
}

function askPair() {
  choose(
    [
      { t: t('ch11.choice.one') },
      { t: t('ch11.choice.both') },
      { t: t('ch11.choice.unsure') },
    ],
    (index) => {
      if (index === 0) {
        recordKarma('cling');
        say('ch11.answerCold', finish);
      } else if (index === 2) {
        say('ch11.answerCool', askPair);
      } else {
        recordKarma('letgo');
        say('ch11.answerWarm', finish);
      }
    },
  );
}

function finish() {
  ch11.ended = true;
  state.luresVisible = false;
  showEndScreen();
}

registerChapterHandler(11, { start: startChapter11, update: updateChapter11 });

on(EVENTS.GHOST_PACIFIED, (cause) => {
  if (state.chapter === 11 && cause === 'mind') recordKarma('mindful');
});
