'use strict';

import { state } from '../core/state.js';
import { emit, EVENTS } from '../core/events.js';
import { inheritedEffect } from './world-effects.js';

/**
 * The garden's light (design §7, "สวนแสงไม่เที่ยง — สวนบานแล้วโรย ทางแสงมีอายุ ·
 * ปล่อยดอกไม้เก่าเพื่อให้เมล็ดเดินทางต่อ").
 *
 * The third rhythm of the world, and the fastest: the tide is the river's level,
 * the ground's dampness is the earth's, and this is the *light* — a short round of
 * bright and dim that decides whether the beam over the garden's dark gate is
 * there at all. It is deliberately the quickest of the three, because the light
 * garden's lesson is not patience but impermanence: the path exists, then it does
 * not. Nothing is lost by waiting for it, and nothing stays.
 */
const PERIOD = 9; // seconds for a full dim → bright → dim round
const LIT_AT = 0.5;

function light() {
  if (!state.light) state.light = { phase: 0.5 };
  return state.light;
}

/** 0..1 through the round. 0.5 is the brightest, 0 and 1 the dimmest. */
export function lightPhase() {
  return light().phase;
}

/** 0 (dim) … 1 (bright). */
export function lightLevel() {
  return (1 - Math.cos(lightPhase() * Math.PI * 2)) / 2;
}

/**
 * Lit through the middle of the round (phase 0.25 … 0.75), read from the phase
 * rather than the level so the two halves are exactly equal — the light does not
 * flicker on a floating-point boundary.
 */
export function isLit() {
  const phase = lightPhase();
  return phase >= 0.25 && phase <= 0.75;
}

/** A path shown to a visitor in an earlier life stays visible a little longer. */
export function isGardenGateLit() {
  const phase = lightPhase();
  const margin = inheritedEffect('visitor-guided') ? 0.08 : 0;
  return phase >= 0.25 - margin && phase <= 0.75 + margin;
}

export function isDim() {
  return !isLit();
}

/** Which way the light is going — for the readout and the turning message. */
export function lightTrend() {
  return Math.sin(lightPhase() * Math.PI * 2) >= 0 ? 'brightening' : 'fading';
}

export function setLightPhase(phase) {
  const l = light();
  l.phase = ((phase % 1) + 1) % 1;
  return l.phase;
}

/** A new life starts at the bright hour, so a life is reproducible. */
export function resetLight() {
  state.light = { phase: 0.5 };
}

export function updateLight(dt) {
  const l = light();
  const before = l.phase;
  l.phase = (l.phase + dt / PERIOD) % 1;
  if (crossed(before, l.phase, 0.5)) emit(EVENTS.LIGHT_TURNED, 'lit');
  else if (crossed(before, l.phase, 0)) emit(EVENTS.LIGHT_TURNED, 'dim');
}

function crossed(before, after, mark) {
  if (after === before) return false;
  if (after > before) return before < mark && after >= mark;
  return before < mark || after >= mark;
}

export const LIGHT_CONSTANTS = Object.freeze({ period: PERIOD, litAt: LIT_AT });
