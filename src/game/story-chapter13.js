'use strict';

import { MODE, SALA, WORLD } from '../core/constants.js';
import { clamp, dist } from '../core/math.js';
import { state } from '../core/state.js';
import { on, EVENTS } from '../core/events.js';
import { playBell, playChime, playThud } from '../systems/audio.js';
import { addFloater } from '../systems/effects.js';
import { isMindful } from '../systems/input.js';
import { t, tList } from '../systems/i18n.js';
import { getKarma, rankedTendencies, recordKarma } from '../systems/karma.js';
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

const MAX_SPIRITS = 5;
const SPLIT_RANGE = 420;
const SPLIT_INTERVAL = 2.4;
const FAR = 560;
const NEAR = 200;
const RELEASE_TIME = 6.0;
const STRIKE_RANGE = 160;
const LOOT_RANGE = 90;
const QUESTION_INTERVAL = 11;
const SALA_TRIGGER = 340;

const BASE_SPEED = 120;
const SPEED_PER_REP = 12;
const SCALE_PER_REP = 0.14;
const SCALE_PER_NOTICE = 0.06;

/**
 * Chapter 13 — all the shadows (the Part Two finale).
 *
 * Everything Part Two taught, at once: the mirror's face and the pair, spirits
 * that divide when pressed and grow with every repetition — stilled only by
 * stepping back and seeing the whole swarm from a distance.
 */
const TENDENCY_RULES = {
  anger: { tint: 'rgba(200,120,110,.55)', temptation: 'retaliate' },
  greed: { tint: 'rgba(232,196,106,.55)', temptation: 'loot', lures: true },
  delusion: { tint: 'rgba(150,150,178,.5)', temptation: 'questions' },
  clinging: { tint: 'rgba(226,214,240,.55)', temptation: 'embrace' },
  balanced: { tint: 'rgba(200,235,225,.5)', temptation: null },
};

const FALLBACK_SECOND = 'clinging';

let ch13 = {
  first: 'balanced',
  second: 'balanced',
  splitTimer: 0,
  release: 0,
  notices: 0,
  reps: 0,
  questionTimer: QUESTION_INTERVAL,
  released: false,
  asked: false,
  hinted: false,
  ended: false,
};

export function startChapter13() {
  const ranked = rankedTendencies();
  ch13 = {
    first: ranked[0] || 'balanced',
    second: ranked[1] || (ranked[0] ? FALLBACK_SECOND : 'balanced'),
    splitTimer: 0,
    release: 0,
    notices: 0,
    reps: 0,
    questionTimer: QUESTION_INTERVAL,
    released: false,
    asked: false,
    hinted: false,
    ended: false,
  };
  state.stats.reps = 0;

  const firstRule = TENDENCY_RULES[ch13.first];
  const secondRule = TENDENCY_RULES[ch13.second];
  resetLures();
  state.luresVisible = Boolean(firstRule.lures || secondRule.lures);

  ghost.tint = firstRule.tint;
  ghost.mindDissolve = false;
  placeGhostAt(ghost, clamp(player.x + 460, 120, WORLD.w - 120), clamp(player.y - 70, 120, WORLD.h - 120));

  const partner = addGhost({
    tint: secondRule.tint,
    mindDissolve: false,
    profile: spiritProfile(114),
  });
  placeGhostAt(partner, clamp(player.x - 420, 120, WORLD.w - 120), clamp(player.y + 90, 120, WORLD.h - 120));

  say('ch13.intro', () => {
    toast(t('ch13.toast.start.title'), t('ch13.toast.start.sub'));
    addFloater(
      player.x,
      player.y - 150,
      t('ch13.pair', { a: t(`tendency.${ch13.first}`), b: t(`tendency.${ch13.second}`) }),
      '#cdc4d6',
      15,
    );
  });
}

function spiritProfile(speed) {
  return {
    baseSpeed: speed,
    fearSpeedBonus: 40,
    mindSpeedBase: 60,
    mindSpeedFearBonus: 28,
    mindDissolveTime: 99,
    enrageSpeedFactor: 1.2,
    standOff: 0,
  };
}

export function updateChapter13(dt) {
  if (state.mode !== MODE.WORLD) return;
  state.interact = null;

  const mind = isMindful();
  const nearest = closestDistance();
  applyGrowth(dt, mind, nearest);

  if (state.dialogueOpen || state.choiceOpen) return;

  const rules = [TENDENCY_RULES[ch13.first], TENDENCY_RULES[ch13.second]];

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
    ch13.questionTimer -= dt;
    if (ch13.questionTimer <= 0) askQuestion();
  }

  if (!ch13.released) updateRelease(dt, mind, nearest);
  else if (!ch13.asked && dist(player.x, player.y, SALA.x, SALA.y) < SALA_TRIGGER) {
    ch13.asked = true;
    state.luresVisible = false;
    const karma = getKarma();
    say(karma.merit >= karma.demerit ? 'ch13.arrive.clear' : 'ch13.arrive.heavy', askFinal);
  }

  if (!ch13.released && !ch13.hinted && dist(player.x, player.y, SALA.x, SALA.y) < SALA_TRIGGER) {
    ch13.hinted = true;
    addFloater(player.x, player.y - 150, t('ch13.floater.blocked'), '#cdc4d6', 15);
  }
}

/** Every repetition grows the whole swarm; pressing it close divides it. */
function applyGrowth(dt, mind, nearest) {
  if (mind && nearest < SPLIT_RANGE) {
    ch13.notices += dt;
    if (!ch13.released && ghosts.length < MAX_SPIRITS) {
      ch13.splitTimer += dt;
      if (ch13.splitTimer >= SPLIT_INTERVAL) {
        ch13.splitTimer = 0;
        split();
      }
    }
  } else {
    ch13.splitTimer = Math.max(0, ch13.splitTimer - dt * 0.5);
  }

  for (const spirit of ghosts) {
    spirit.scale = clamp(1 + ch13.reps * SCALE_PER_REP - ch13.notices * SCALE_PER_NOTICE, 0.7, 2.6);
    spirit.profile.baseSpeed = BASE_SPEED + ch13.reps * SPEED_PER_REP;
    spirit.profile.mindDissolveTime = 99;
  }
}

/** Distance + mindfulness releases the whole swarm at once. */
function updateRelease(dt, mind, nearest) {
  if (mind && nearest > FAR) {
    ch13.release += dt / RELEASE_TIME;
    if (ch13.release >= 1) releaseAll();
  } else if (nearest < NEAR) {
    state.fear = clamp(state.fear + 0.3 * dt, 0, 1);
    ch13.release = Math.max(0, ch13.release - dt * 0.6);
  } else {
    ch13.release = Math.max(0, ch13.release - dt * 0.2);
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
  const spirit = addGhost({ tint: source.tint, mindDissolve: false, profile: spiritProfile(112) });
  placeGhostAt(
    spirit,
    clamp(player.x + Math.cos(angle) * 240, 120, WORLD.w - 120),
    clamp(player.y + Math.sin(angle) * 240, 120, WORLD.h - 120),
  );
  playChime();
  addFloater(player.x, player.y - 140, t('ch13.floater.split', { n: ghosts.length }), '#cdc4d6', 15);
}

function repeat() {
  ch13.reps++;
  state.stats.reps = ch13.reps;
  for (const spirit of ghosts) enrageGhost(2.5, spirit);
  addFloater(player.x, player.y - 120, t('ch13.floater.grown', { reps: ch13.reps }), '#d68a9a', 15);
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
  ch13.questionTimer = QUESTION_INTERVAL;
  const options = tList('ch13.question').map((text) => ({ t: text }));
  choose(options, (choice) => {
    if (choice === 0) {
      state.fear = clamp(state.fear + 0.12, 0, 1);
      recordKarma('cling');
      repeat();
    } else {
      addFloater(player.x, player.y - 150, t('ch13.floater.seen'), '#bfd9cd', 15);
    }
  });
}

function releaseAll() {
  ch13.released = true;
  for (const spirit of ghosts) {
    if (!spirit.active) continue;
    spirit.mode = STATUS.FADE;
    spirit.fade = 1.6;
  }
  recordKarma('letgo');
  playBell();
  toast(t('ch13.toast.release.title'), t('ch13.toast.release.sub'));
  say('ch13.release');
}

function askFinal() {
  choose(
    [
      { t: t('ch13.choice.hold') },
      { t: t('ch13.choice.see') },
      { t: t('ch13.choice.unsure') },
    ],
    (index) => {
      if (index === 0) {
        recordKarma('cling');
        say('ch13.answerCold', finish);
      } else if (index === 2) {
        say('ch13.answerCool', askFinal);
      } else {
        recordKarma('letgo');
        say('ch13.answerWarm', finish);
      }
    },
  );
}

function finish() {
  ch13.ended = true;
  state.luresVisible = false;
  showEndScreen();
}

registerChapterHandler(13, { start: startChapter13, update: updateChapter13 });

on(EVENTS.GHOST_PACIFIED, (cause) => {
  if (state.chapter === 13 && cause === 'mind') recordKarma('mindful');
});
