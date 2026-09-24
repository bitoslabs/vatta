'use strict';

/** Deterministic PRNG so world generation is stable across reloads. */
export function mulberry32(seed) {
  let a = seed;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rng = mulberry32(20250607);

export const pick = (items) => items[(rng() * items.length) | 0];

/**
 * A *counter-based* draw: the same seed and index always give the same number, and
 * nothing but the index needs to be remembered. Rebirth uses this instead of a
 * stream so that reopening a summary, reloading a save or skipping a scene can
 * never advance the sequence — the draw happened once, when the life was reserved
 * (systems/rebirth.js, systems/transition.js).
 */
export function hashUnit(seed, index) {
  let a = (seed ^ Math.imul(index + 1, 0x9e3779b1)) | 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** A stable 32-bit seed from a string (a run id, a slot name). */
export function seedFrom(text) {
  let h = 2166136261;
  const value = String(text);
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
