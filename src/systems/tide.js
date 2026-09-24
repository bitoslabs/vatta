'use strict';

import { clamp } from '../core/math.js';
import { state } from '../core/state.js';
import { emit, EVENTS } from '../core/events.js';

/**
 * The tide (docs/animal-lives-story.md reserve table, "ปู — รักษาที่อยู่ท่ามกลาง
 * น้ำขึ้นลง").
 *
 * The game's first *world rhythm*: the river's level rises and falls on its own,
 * slowly enough to read and to wait out. It matters in two ways — the water band
 * the renderer draws and a body swims in grows and shrinks with it, and places
 * that are only passable at one end of the cycle (`causeway` in world/rooms.js)
 * open and close with it.
 *
 * This is not a timed challenge in the sense the design forbids: nothing is lost
 * by waiting, no score depends on being quick, and a past life can even take the
 * rhythm out of a passage for good (`channel-kept`, systems/world-effects.js).
 */
const PERIOD = 26; // seconds for a full high→low→high cycle
const LOW = -0.25;
const HIGH = 0.25;

function tide() {
  if (!state.tide) state.tide = { phase: 0.25, level: 0 };
  return state.tide;
}

/** 0..1 through the cycle. 0.25 is high water, 0.75 is low water. */
export function tidePhase() {
  return tide().phase;
}

/** −1 (lowest) … 1 (highest), the shape a sine gives and a coast understands. */
export function tideLevel() {
  return Math.sin(tidePhase() * Math.PI * 2);
}

export function isLowTide() {
  return tideLevel() <= LOW;
}

export function isHighTide() {
  return tideLevel() >= HIGH;
}

/** How far the water reaches, as a multiplier on the river's own width. */
export function tideWaterScale() {
  return 1 + tideLevel() * 0.18;
}

/** Which way the water is going — for the readout and the turning message. */
export function tideTrend() {
  return Math.cos(tidePhase() * Math.PI * 2) >= 0 ? 'rising' : 'falling';
}

export function setTidePhase(phase) {
  const t = tide();
  t.phase = ((phase % 1) + 1) % 1;
  return t.phase;
}

/**
 * A new life starts at a known point of the cycle — just after high water, so the
 * water is visibly going out and a life is reproducible from its start.
 */
export function resetTide() {
  state.tide = { phase: 0.3 };
}

export function updateTide(dt) {
  const t = tide();
  const before = t.phase;
  t.phase = (t.phase + dt / PERIOD) % 1;
  // Announce the turn of the water once, when it crosses a marker.
  if (crossed(before, t.phase, 0.25)) emit(EVENTS.TIDE_TURNED, 'high');
  else if (crossed(before, t.phase, 0.75)) emit(EVENTS.TIDE_TURNED, 'low');
}

/** Did the phase pass `mark` on its way round? */
function crossed(before, after, mark) {
  if (after === before) return false;
  if (after > before) return before < mark && after >= mark;
  return before < mark || after >= mark; // wrapped past 1.0
}

export const TIDE_CONSTANTS = Object.freeze({ period: PERIOD, low: LOW, high: HIGH });
