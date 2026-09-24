'use strict';

import { TAU, TEMPLE, SALA, WORLD } from '../core/constants.js';
import { dist, distToPoly } from '../core/math.js';
import { mulberry32 } from '../core/rng.js';
import { PATH, RIVER, RIVER_WIDTH } from './world-data.js';

/**
 * Dynamic rooms: a fixed skeleton with seed-varied dressing (design §3).
 *
 * Instead of authoring one map, we assemble obstacle clusters along the true
 * path from a seed, then **validate that the assembled world is traversable for
 * the form in play** — the design's guard against unwinnable maps. If a seed
 * fails, another is tried, and an empty (trivially valid) set is the fallback.
 */
export const FEATURE_TYPES = Object.freeze(['thicket', 'boulders', 'pond', 'clearing']);

const MARGIN_FROM_PATH = 46;
const GRID_CELL = 40;
const GRID_MARGIN = 220;
const MAX_SEED_TRIES = 12;

export function routeFor(formId) {
  return formId === 'fish' ? RIVER : PATH;
}

function featureAt(feature, x, y) {
  return dist(x, y, feature.x, feature.y) < feature.r;
}

export function waterAt(features, x, y) {
  if (distToPoly(RIVER, x, y) < RIVER_WIDTH) return true;
  return features.some((feature) => feature.type === 'pond' && featureAt(feature, x, y));
}

export function blockedAt(features, x, y) {
  return features.some(
    (feature) => (feature.type === 'thicket' || feature.type === 'boulders') && featureAt(feature, x, y),
  );
}

function mayPlace(type, x, y, radius) {
  if (x < 80 || y < 80 || x > WORLD.w - 80 || y > WORLD.h - 80) return false;
  if (dist(x, y, TEMPLE.x, TEMPLE.y) < TEMPLE.r + 60) return false;
  if (dist(x, y, SALA.x, SALA.y) < SALA.r + 60) return false;
  // Never cover the road itself; dressing sits beside it.
  if (distToPoly(PATH, x, y) < radius + MARGIN_FROM_PATH) return false;
  void type;
  return true;
}

/** Assemble the seed's dressing: obstacle clusters beside the true path. */
export function assembleRooms(seed) {
  const rng = mulberry32(seed);
  const features = [];

  for (let i = 1; i < PATH.length - 1; i++) {
    for (let k = 0; k < 2; k++) {
      if (rng() < 0.3) continue;
      const type = FEATURE_TYPES[(rng() * FEATURE_TYPES.length) | 0];
      const angle = rng() * TAU;
      const reach = 130 + rng() * 110;
      const x = PATH[i][0] + Math.cos(angle) * reach;
      const y = PATH[i][1] + Math.sin(angle) * reach;
      const radius = type === 'boulders' ? 36 + rng() * 14
        : type === 'thicket' ? 46 + rng() * 18
          : type === 'pond' ? 70 + rng() * 30
            : 62;
      if (!mayPlace(type, x, y, radius)) continue;
      features.push({ type, x, y, r: radius });
    }
  }

  // Occasionally silt builds up in the river — which the route check must catch.
  if (rng() < 0.35) {
    const point = RIVER[1 + ((rng() * (RIVER.length - 2)) | 0)];
    features.push({ type: 'boulders', x: point[0], y: point[1], r: 60 + rng() * 40 });
  }

  return features;
}

function nearestFreeCell(blocked, cols, rows, cell) {
  const index = (c, r) => r * cols + c;
  if (!blocked[index(cell.c, cell.r)]) return cell;
  const maxRing = 6;
  for (let ring = 1; ring <= maxRing; ring++) {
    for (let dc = -ring; dc <= ring; dc++) {
      for (let dr = -ring; dr <= ring; dr++) {
        const c = cell.c + dc;
        const r = cell.r + dr;
        if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
        if (!blocked[index(c, r)]) return { c, r };
      }
    }
  }
  return null;
}

/**
 * Breadth-first check that the route start can reach the route end on a coarse
 * grid, using the *same* rules the player moves by: solids block everyone, and
 * a water-bound form may only cross water.
 */
export function validateRoute(features, formId) {
  const waterBound = formId === 'fish';
  const route = routeFor(formId);
  const start = route[0];
  const goal = route[route.length - 1];

  const xs = route.map((point) => point[0]);
  const ys = route.map((point) => point[1]);
  const minX = Math.min(...xs) - GRID_MARGIN;
  const minY = Math.min(...ys) - GRID_MARGIN;
  const cols = Math.ceil((Math.max(...xs) - minX + GRID_MARGIN) / GRID_CELL);
  const rows = Math.ceil((Math.max(...ys) - minY + GRID_MARGIN) / GRID_CELL);

  const index = (c, r) => r * cols + c;
  const blocked = new Uint8Array(cols * rows);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = minX + c * GRID_CELL + GRID_CELL / 2;
      const y = minY + r * GRID_CELL + GRID_CELL / 2;
      const solid = blockedAt(features, x, y);
      const water = waterAt(features, x, y);
      blocked[index(c, r)] = (solid || (waterBound && !water)) ? 1 : 0;
    }
  }

  const toCell = (point) => ({
    c: Math.floor((point[0] - minX) / GRID_CELL),
    r: Math.floor((point[1] - minY) / GRID_CELL),
  });

  const from = nearestFreeCell(blocked, cols, rows, toCell(start));
  const to = nearestFreeCell(blocked, cols, rows, toCell(goal));
  if (!from || !to) return { ok: false, reachable: 0, cells: cols * rows };

  const seen = new Uint8Array(cols * rows);
  const queue = [from];
  seen[index(from.c, from.r)] = 1;
  let visited = 0;

  while (queue.length) {
    const cell = queue.shift();
    visited++;
    if (cell.c === to.c && cell.r === to.r) {
      return { ok: true, reachable: visited, cells: cols * rows };
    }
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = cell.c + dc;
      const r = cell.r + dr;
      if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
      const i = index(c, r);
      if (blocked[i] || seen[i]) continue;
      seen[i] = 1;
      queue.push({ c, r });
    }
  }

  return { ok: false, reachable: visited, cells: cols * rows };
}

/** Try seeds until one validates for this form; fall back to an empty world. */
export function buildDynamicWorld(seed, formId) {
  for (let attempt = 0; attempt < MAX_SEED_TRIES; attempt++) {
    const trySeed = (seed + attempt) >>> 0;
    const features = assembleRooms(trySeed);
    const validation = validateRoute(features, formId);
    if (validation.ok) return { seed: trySeed, features, validation, attempts: attempt + 1 };
  }
  return {
    seed,
    features: [],
    validation: { ok: true, reachable: 0, cells: 0, fallback: true },
    attempts: MAX_SEED_TRIES,
  };
}
