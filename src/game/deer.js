'use strict';

import { MODE } from '../core/constants.js';
import { state } from '../core/state.js';
import { player } from '../entities/player.js';
import { playChime, playHeart, playThud } from '../systems/audio.js';
import { addFloater } from '../systems/effects.js';
import { t } from '../systems/i18n.js';
import { recordKarma } from '../systems/karma.js';
import { saveRun } from '../systems/save.js';
import { hasEffect, inheritedEffect, recordEffect } from '../systems/world-effects.js';
import { choose } from '../ui/choices.js';
import { DEER } from '../world/world-data.js';

const CROSSING_RADIUS = 80;
const SHELTERED_RADIUS = 52;
const hunter = { phase: 'rest', time: 2.3, safe: null, hits: 0, struck: false, inherited: false };

function dangerRadius() {
  return hunter.inherited ? SHELTERED_RADIUS : CROSSING_RADIUS;
}

export function herdSheltered() {
  return hasEffect('herd-sheltered');
}

export function deerHazardState() {
  return { phase: hunter.phase, time: hunter.time, hits: hunter.hits,
    x: DEER.crossing.x, y: DEER.crossing.y, radius: dangerRadius(), sheltered: hunter.inherited };
}

export function resetDeerHazard() {
  hunter.phase = 'rest';
  hunter.time = 2.3;
  hunter.safe = null;
  hunter.hits = 0;
  hunter.struck = false;
  hunter.inherited = inheritedEffect('herd-sheltered');
}

export function resetDeer() {
  state.deer = { decided: false, waited: false };
}

function retreat(distance) {
  if (hunter.phase !== 'rush' || hunter.struck || distance > dangerRadius()) return;
  const safe = hunter.safe || DEER.refuge;
  player.x = safe.x;
  player.y = safe.y;
  player.vx = 0;
  player.vy = 0;
  hunter.hits++;
  hunter.struck = true;
}

/** A predator passes the exposed crossing; being chased is not misconduct. */
export function updateDeerHazard(dt) {
  const practising = state.explore?.active === true;
  if (!(state.lifeMode || practising) || state.formId !== 'deer' || (state.teacher && !practising)) {
    resetDeerHazard();
    return;
  }
  if (state.mode !== MODE.WORLD || document.hidden) return;
  const distance = Math.hypot(player.x - DEER.crossing.x, player.y - DEER.crossing.y);
  if (distance > 310) {
    hunter.phase = 'rest';
    hunter.time = 2.3;
    hunter.safe = null;
    hunter.struck = false;
    return;
  }
  if (distance > dangerRadius() + 30) hunter.safe = { x: player.x, y: player.y };
  if (state.dialogueOpen || state.choiceOpen) return;
  hunter.time -= dt;
  if (hunter.time > 0) {
    retreat(distance);
    return;
  }
  if (hunter.phase === 'rest') {
    hunter.phase = 'warning';
    hunter.time = 1.5;
    hunter.struck = false;
    playHeart();
  } else if (hunter.phase === 'warning') {
    hunter.phase = 'rush';
    hunter.time = 0.5;
    playThud();
  } else {
    hunter.phase = 'rest';
    hunter.time = 2.5;
  }
  retreat(distance);
}

/** Wait for the slow member of the herd, or go on alone. */
export function updateDeer() {
  if (state.mode !== MODE.WORLD || state.formId !== 'deer') return;
  if (state.dialogueOpen || state.choiceOpen || state.interact) return;
  if (hasEffect('herd-sheltered') || state.deer?.decided) return;
  if (Math.hypot(player.x - DEER.herd.x, player.y - DEER.herd.y) > 95) return;
  state.interact = { fn: decideHerd, labelKey: 'prompt.deerHerd' };
}

function decideHerd() {
  choose([
    { t: t('deer.choice.wait') },
    { t: t('deer.choice.go') },
  ], (index) => {
    state.deer.decided = true;
    state.deer.waited = index === 0;
    if (index !== 0) { saveRun(); return; }
    recordKarma('give');
    recordEffect('herd-sheltered');
    playChime();
    addFloater(DEER.herd.x, DEER.herd.y - 70, t('effect.herdSheltered'), '#bad3a7', 15);
    saveRun();
  });
}
