'use strict';

import { state } from '../core/state.js';
import { dist } from '../core/math.js';
import { RIVER, routeLength, pointAlongRoute } from '../world/world-data.js';
import { tideLevel } from './tide.js';

/**
 * Things the current carries (docs/animal-lives-story.md reserve table, "นาก —
 * ว่ายน้ำและช่วยจับของลอย").
 *
 * The first bodies in the game that move on their own: three pieces of driftwood
 * riding the river downstream. The river always runs one way — only the tide
 * changes the pace, so a rising tide slows them and a falling one hurries them
 * along — and they *loop*, so nothing is ever lost and no one is ever too late.
 * That is deliberate: the design forbids losing anything to slowness, so a missed
 * piece simply comes round again.
 */
const LENGTH = routeLength(RIVER);
const BASE_SPEED = 130; // px per second, at slack water
const TIDE_PUSH = 0.6;

const NAMES = ['drift-a', 'drift-b', 'drift-c'];
const STARTS = [0.16, 0.48, 0.8];

function drift() {
  if (!state.drift?.items) {
    state.drift = { items: NAMES.map((id, i) => ({ id, t: STARTS[i], caught: false })) };
  }
  return state.drift;
}

export function resetDrift() {
  state.drift = { items: NAMES.map((id, i) => ({ id, t: STARTS[i], caught: false })) };
}

export function drifterCount() {
  return drift().items.length;
}

export function caughtDrifters() {
  return drift().items.filter((item) => item.caught).length;
}

export function allDriftersCaught() {
  return caughtDrifters() === drifterCount();
}

/** Where each uncaught piece of driftwood is right now. */
export function drifterPositions() {
  const items = drift().items;
  return items
    .filter((item) => !item.caught)
    .map((item) => {
      const point = pointAlongRoute(RIVER, item.t);
      return { id: item.id, t: item.t, x: point.x, y: point.y };
    });
}

export function nearestDrifter(x, y, range) {
  let best = null;
  let bestDist = range;
  for (const driftItem of drifterPositions()) {
    const d = dist(x, y, driftItem.x, driftItem.y);
    if (d < bestDist) {
      bestDist = d;
      best = driftItem;
    }
  }
  return best;
}

export function catchDrifter(id) {
  const item = drift().items.find((entry) => entry.id === id);
  if (!item || item.caught) return false;
  item.caught = true;
  return true;
}

/** The current: always downstream, and in a hurry as the water falls. */
export function updateDrift(dt) {
  const speed = BASE_SPEED * (1 - tideLevel() * TIDE_PUSH);
  for (const item of drift().items) {
    if (item.caught) continue;
    item.t -= (speed * dt) / LENGTH;
    // the river round again — and a big step still lands somewhere sane
    item.t = ((item.t % 1) + 1) % 1;
  }
}

export const DRIFT_CONSTANTS = Object.freeze({ length: LENGTH, baseSpeed: BASE_SPEED });
