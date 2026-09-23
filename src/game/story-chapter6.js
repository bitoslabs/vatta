'use strict';

import { MODE, SALA } from '../core/constants.js';
import { clamp, dist } from '../core/math.js';
import { state } from '../core/state.js';
import { on, EVENTS } from '../core/events.js';
import { playChime } from '../systems/audio.js';
import { addFloater } from '../systems/effects.js';
import { t } from '../systems/i18n.js';
import { recordKarma } from '../systems/karma.js';
import { STATUS } from '../entities/ghost-status.js';
import { ghost, placeGhost } from '../entities/ghost.js';
import { player } from '../entities/player.js';
import { choose } from '../ui/choices.js';
import { say } from '../ui/dialogue.js';
import { showEndScreen } from '../ui/end-screen.js';
import { toast } from '../ui/feedback.js';
import { registerChapterHandler } from './chapters.js';
import { nearestLure, resetLures, takeLure } from './lures.js';

const LOOT_RANGE = 90;
const SALA_TRIGGER = 340;

/**
 * Chapter 6 — the Wheel (Four Noble Truths).
 *
 * A single road walked in four phases, each reusing an earlier lesson:
 *   ทุกข์    dukkha   — a fast ghost; you must keep moving
 *   สมุทัย   samudaya — bait returns; grasping feeds the suffering
 *   นิโรธ    nirodha  — the ghost can only be stilled by mindfulness
 *   มรรค     magga    — no ghost; walk out with a clear mind
 */
const PHASES = [
  {
    id: 'dukkha',
    meterKey: 'hud.suffering',
    at: 1160,
    ghost: true,
    lures: false,
    mind: false,
    tint: 'rgba(200,180,200,.5)',
    profile: { baseSpeed: 150, fearSpeedBonus: 130, mindSpeedBase: 60, mindSpeedFearBonus: 60, mindDissolveTime: 3.2, enrageSpeedFactor: 1.5, standOff: 0 },
  },
  {
    id: 'samudaya',
    meterKey: 'hud.craving',
    at: 1900,
    ghost: true,
    lures: true,
    mind: false,
    tint: 'rgba(232,196,106,.55)',
    profile: { baseSpeed: 132, fearSpeedBonus: 110, mindSpeedBase: 55, mindSpeedFearBonus: 60, mindDissolveTime: 3.0, enrageSpeedFactor: 1.6, standOff: 0 },
  },
  {
    id: 'nirodha',
    meterKey: 'hud.cessation',
    at: 2560,
    ghost: true,
    lures: false,
    mind: true,
    tint: 'rgba(200,235,225,.5)',
    profile: { baseSpeed: 120, fearSpeedBonus: 70, mindSpeedBase: 50, mindSpeedFearBonus: 40, mindDissolveTime: 2.4, enrageSpeedFactor: 1.2, standOff: 0 },
  },
  {
    id: 'magga',
    meterKey: 'hud.path',
    at: 3120,
    ghost: false,
    lures: false,
    mind: false,
    tint: null,
    profile: { baseSpeed: 0, fearSpeedBonus: 0, mindSpeedBase: 0, mindSpeedFearBonus: 0, mindDissolveTime: 9, enrageSpeedFactor: 1, standOff: 0 },
  },
];

let wheel = { phase: -1, ended: false };

export function startChapter6() {
  wheel = { phase: -1, ended: false };
  resetLures();
  state.luresVisible = false;
  state.stats.looted = 0;
  say('ch6.intro', () => enterPhase(0));
}

export function updateChapter6(dt) {
  if (state.mode !== MODE.WORLD) return;
  state.interact = null;
  if (state.dialogueOpen) return;

  if (state.luresVisible) {
    const lure = nearestLure(player.x, player.y, LOOT_RANGE);
    if (lure) state.interact = { fn: () => loot(lure), labelKey: 'prompt.loot' };
  }

  const next = wheel.phase + 1;
  if (next < PHASES.length && player.x >= PHASES[next].at) enterPhase(next);

  if (!wheel.ended && dist(player.x, player.y, SALA.x, SALA.y) < SALA_TRIGGER) {
    wheel.ended = true;
    state.luresVisible = false;
    recordKarma('letgo');
    say('ch6.arrive', askTruths);
  }
}

function enterPhase(index) {
  const previous = PHASES[wheel.phase];
  const phase = PHASES[index];
  wheel.phase = index;
  state.meterKey = phase.meterKey;

  // Leaving the craving phase empty-handed is restraint (ศีล).
  if (previous && previous.id === 'samudaya' && state.stats.looted === 0) {
    recordKarma('precept');
  }

  state.luresVisible = phase.lures;
  ghost.mindDissolve = phase.mind;
  ghost.tint = phase.tint;
  Object.assign(ghost.profile, phase.profile);

  if (phase.ghost) {
    placeGhost(clamp(player.x + 620, 120, 4400), clamp(player.y - 80, 120, 2860));
  } else if (ghost.active) {
    ghost.mode = STATUS.FADE;
    ghost.fade = 1.4;
  }

  toast(t(`ch6.phase.${phase.id}.title`), t(`ch6.phase.${phase.id}.sub`));
}

function loot(lure) {
  if (!takeLure(lure)) return;
  state.stats.looted++;
  recordKarma('steal');
  playChime();
  addFloater(player.x, player.y - 120, t('ch6.floater.looted'), '#e9c46a', 16);
}

function askTruths() {
  choose(
    [
      { t: t('ch6.choice.wrong') },
      { t: t('ch6.choice.right') },
      { t: t('ch6.choice.unknown') },
    ],
    (index) => {
      if (index === 0) {
        recordKarma('cling');
        say('ch6.answerWrong', finish);
      } else if (index === 2) {
        say('ch6.answerUnknown', askTruths);
      } else {
        recordKarma('letgo');
        say('ch6.answerRight', finish);
      }
    },
  );
}

function finish() {
  wheel.ended = true;
  showEndScreen();
}

registerChapterHandler(6, { start: startChapter6, update: updateChapter6 });

// Stilling the ghost in the นิโรธ phase is mindfulness in action.
on(EVENTS.GHOST_PACIFIED, (cause) => {
  if (state.chapter === 6 && cause === 'mind') recordKarma('mindful');
});
