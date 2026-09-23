'use strict';

import { LURES } from '../content/lures.js';

/** Runtime lure state for chapter 3 (reset on every chapter load). */
let runtime = LURES.map((lure) => ({ ...lure, taken: false }));

export function resetLures() {
  runtime = LURES.map((lure) => ({ ...lure, taken: false }));
}

export function getLures() {
  return runtime;
}

export function nearestLure(x, y, range) {
  let best = null;
  let bestDist = range;
  for (const lure of runtime) {
    if (lure.taken) continue;
    const d = Math.hypot(lure.x - x, lure.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = lure;
    }
  }
  return best;
}

export function takeLure(lure) {
  if (!lure || lure.taken) return false;
  lure.taken = true;
  return true;
}

export function takenCount() {
  return runtime.filter((lure) => lure.taken).length;
}

export function remainingCount() {
  return runtime.filter((lure) => !lure.taken).length;
}
