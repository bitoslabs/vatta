'use strict';

import { MODE } from '../core/constants.js';
import { emit, EVENTS } from '../core/events.js';
import { dist } from '../core/math.js';
import { state } from '../core/state.js';
import { playChime, playDryWarning, playThud } from '../systems/audio.js';
import { addFloater } from '../systems/effects.js';
import { getForm } from '../systems/forms.js';
import { t } from '../systems/i18n.js';
import { recordKarma } from '../systems/karma.js';
import { saveRun } from '../systems/save.js';
import { hasEffect, inheritedEffect, recordEffect } from '../systems/world-effects.js';
import { choose } from '../ui/choices.js';
import { MARSH } from '../world/world-data.js';
import { animatePlayer, player } from '../entities/player.js';

/**
 * The frog's life: the marsh and the blocked channel (docs/animal-lives-story.md
 * ch.4, "ฝนหยดแรก").
 *
 * The forest is short of water, and the gate that would feed the lower forest
 * stands inside deep mire: only a body that can leap gets there. Standing at the
 * gate asks one question — open the channel and share the water, or leave it —
 * and only after answering does the bank where the frog lays its eggs become the
 * place this life can end. Opening the channel records the `water-opened` world
 * effect, so later lives find the water running (systems/world-effects.js).
 */
const INLET_RANGE = 130;
const DRY_RADIUS = 72;
const WATERED_RADIUS = 45;
const dry = { phase: 'rest', time: 2.4, safe: null, hits: 0, struck: false, inherited: false, eggsShaded: false };

function dryRadius() {
  return dry.inherited ? WATERED_RADIUS : DRY_RADIUS;
}

export function dryMarshState() {
  return { phase: dry.phase, time: dry.time, hits: dry.hits,
    x: MARSH.drying.x, y: MARSH.drying.y, radius: dryRadius(), watered: dry.inherited,
    eggsShaded: dry.eggsShaded };
}

export function resetDryMarsh() {
  dry.phase = 'rest';
  dry.time = 2.4;
  dry.safe = null;
  dry.hits = 0;
  dry.struck = false;
  dry.inherited = inheritedEffect('water-opened');
  dry.eggsShaded = inheritedEffect('eggs-shaded');
}

function retreatFromDry(distance) {
  if (dry.phase !== 'dry' || dry.struck || distance > dryRadius()) return;
  const safe = dry.safe || MARSH.refuge;
  player.x = safe.x;
  player.y = safe.y;
  player.vx = 0;
  player.vy = 0;
  dry.hits++;
  dry.struck = true;
}

/** A drying patch on the way to the inlet, with a safe route around it. */
export function updateDryMarsh(dt) {
  const practising = state.explore?.active === true;
  if (!(state.lifeMode || practising) || state.formId !== 'frog' || (state.teacher && !practising)) {
    resetDryMarsh();
    return;
  }
  if (state.mode !== MODE.WORLD || document.hidden) return;
  const distance = dist(player.x, player.y, MARSH.drying.x, MARSH.drying.y);
  if (distance > 290) {
    dry.phase = 'rest';
    dry.time = 2.4;
    dry.safe = null;
    dry.struck = false;
    return;
  }
  if (distance > dryRadius() + 30) dry.safe = { x: player.x, y: player.y };
  if (state.dialogueOpen || state.choiceOpen) return;
  dry.time -= dt;
  if (dry.time > 0) {
    retreatFromDry(distance);
    return;
  }
  if (dry.phase === 'rest') {
    dry.phase = 'warning';
    dry.time = dry.eggsShaded ? 2.3 : 1.5;
    dry.struck = false;
    playDryWarning();
  } else if (dry.phase === 'warning') {
    dry.phase = 'dry';
    dry.time = 0.8;
    playThud();
  } else {
    dry.phase = 'rest';
    dry.time = 2.4;
  }
  retreatFromDry(distance);
}

export function marshSite() {
  return MARSH;
}

export function waterOpened() {
  return hasEffect('water-opened');
}

export function hasDecided() {
  return state.frog?.decided === true;
}

export function didOpen() {
  return state.frog?.opened === true;
}

/** Every life arrives with the channel still blocked; a chapter load clears it. */
export function resetFrog() {
  state.frog = { decided: false, opened: false, eggsAsked: false };
}

/**
 * Where a frog's life can end *right now*: first the inlet (a guide, and the one
 * question the marsh asks), then the bank. `systems/goals.js` reads this, and
 * only the bank completes a life.
 */
export function frogGoal() {
  if (hasDecided()) {
    return { x: MARSH.bank.x, y: MARSH.bank.y, r: MARSH.bankRadius, kind: 'spawn' };
  }
  return { x: MARSH.inlet.x, y: MARSH.inlet.y, r: MARSH.inletRadius, kind: 'inlet' };
}

/** The blocked channel: open it for the lower forest, or leave it be. */
export function updateFrog() {
  if (state.mode !== MODE.WORLD) return;
  if (state.dialogueOpen || state.choiceOpen || state.interact) return;
  if (getForm().lifeGoal !== 'spawn') return;
  if (hasDecided()) return;
  if (dist(player.x, player.y, MARSH.inlet.x, MARSH.inlet.y) > INLET_RANGE) return;
  state.interact = { fn: decideChannel, labelKey: 'prompt.openChannel' };
}

function decideChannel() {
  choose(
    [
      { t: t('frog.choice.open') },
      { t: t('frog.choice.leave') },
    ],
    (index) => {
      const open = index === 0;
      state.frog.decided = true;
      state.frog.opened = open;
      // The act is the choice, so the world changes — or does not — right here.
      if (open) {
        recordEffect('water-opened');
        recordKarma('give');
      }
      animatePlayer();
      playChime();
      addFloater(
        player.x,
        player.y - 120,
        t(open ? 'frog.answer.open' : 'frog.answer.leave'),
        open ? '#9fc6dd' : '#c9c0a8',
        15,
      );
      saveRun();
    },
  );
}

/** The eggs are on the bank: the marsh is a resting place now. */
export function spawnAtBank() {
  if (state.frog?.eggsAsked) return false;
  state.frog.eggsAsked = true;
  choose([
    { t: t('frog.eggs.move') },
    { t: t('frog.eggs.leave') },
  ], (index) => {
    if (index === 0) {
      recordKarma('give');
      recordEffect('eggs-shaded');
    }
    saveRun();
    animatePlayer();
    playChime();
    addFloater(MARSH.bank.x, MARSH.bank.y - 70,
      t(index === 0 ? 'frog.eggs.moved' : 'frog.spawned'), '#cfe0b4', 15);
    emit(EVENTS.LIFE_COMPLETE, 'spawn');
  });
  return false;
}
