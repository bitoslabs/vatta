'use strict';

import { LURES } from '../content/lures.js';
import { anchoredPoint } from '../world/world-data.js';
import { currentMapId } from '../systems/biome.js';

/** Runtime lure state for chapter 3 (reset on every chapter load). */
let runtime = LURES.map((lure) => ({ ...lure, taken: false }));
/** Which plane the lures are currently standing in (see placeLures). */
let placedFor = null;

/**
 * Lures belong to the road, not to the forest: when a life is born in another
 * plane they are carried onto that plane's road (world-data.js#anchoredPoint), so
 * a greedy life in the market still finds them along its own alleys. The lure
 * objects keep their identity — `taken` lives on them.
 */
function placeLures() {
  const plane = currentMapId();
  if (placedFor === plane) return;
  placedFor = plane;
  runtime.forEach((lure, i) => {
    const spot = anchoredPoint(plane, LURES[i].x, LURES[i].y);
    lure.x = spot.x;
    lure.y = spot.y;
  });
}

export function resetLures() {
  runtime = LURES.map((lure) => ({ ...lure, taken: false }));
  placedFor = null;
  placeLures();
}

export function getLures() {
  placeLures();
  return runtime;
}

export function nearestLure(x, y, range) {
  placeLures();
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
