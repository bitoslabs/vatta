'use strict';

import { clamp } from '../core/math.js';
import { state } from '../core/state.js';
import { emit, EVENTS } from '../core/events.js';

/**
 * How damp the ground is (docs/animal-lives-story.md story table, "หอยทาก — ผ่าน
 * พื้นที่ชื้นและพักเมื่อแห้ง · รู้ข้อจำกัดและจังหวะของตัวเอง").
 *
 * A body's *limitation* as the mechanic, for the first time: the snail may cross a
 * dry ridge only while the ground is damp, so the world's own slow rhythm — not a
 * stopwatch, not a score — decides when its life can move. Waiting costs nothing
 * and nothing is missed: the damp always comes round again, which is the whole
 * lesson of the snail's chapter ("knowing your limits and pace").
 *
 * It is a different scale from the tide (systems/tide.js): the tide is the river's
 * level, this is the ground's dampness.
 */
const PERIOD = 22; // seconds for a full dry → damp → dry round
const DAMP_AT = 0.45;

function moisture() {
  if (!state.moisture) state.moisture = { phase: 0.5 };
  return state.moisture;
}

/** 0..1 through the round. 0.5 is the dampest, 0 and 1 the driest. */
export function moisturePhase() {
  return moisture().phase;
}

/** 0 (dry) … 1 (damp). */
export function moistureLevel() {
  return (1 - Math.cos(moisturePhase() * Math.PI * 2)) / 2;
}

export function isDamp() {
  return moistureLevel() >= DAMP_AT;
}

export function isDry() {
  return !isDamp();
}

/** Which way the ground is going — for the readout and the turning message. */
export function moistureTrend() {
  return Math.sin(moisturePhase() * Math.PI * 2) >= 0 ? 'wetting' : 'drying';
}

export function setMoisturePhase(phase) {
  const m = moisture();
  m.phase = ((phase % 1) + 1) % 1;
  return m.phase;
}

/** A new life starts at a known hour of the round, so a life is reproducible. */
export function resetMoisture() {
  state.moisture = { phase: 0.5 };
}

export function updateMoisture(dt) {
  const m = moisture();
  const before = m.phase;
  m.phase = (m.phase + dt / PERIOD) % 1;
  if (crossed(before, m.phase, 0.5)) emit(EVENTS.MOISTURE_TURNED, 'damp');
  else if (crossed(before, m.phase, 0)) emit(EVENTS.MOISTURE_TURNED, 'dry');
}

function crossed(before, after, mark) {
  if (after === before) return false;
  if (after > before) return before < mark && after >= mark;
  return before < mark || after >= mark;
}

export const MOISTURE_CONSTANTS = Object.freeze({ period: PERIOD, dampAt: DAMP_AT });
