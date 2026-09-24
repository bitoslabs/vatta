'use strict';

import { TEMPLE, SALA, WORLD, TAU } from '../core/constants.js';
import { dist, distToPoly } from '../core/math.js';
import { rng } from '../core/rng.js';

/** The real path — the only one with footprints. */
export const PATH = [
  [1130, 1560], [1560, 1580], [1900, 1400], [2250, 1180], [2560, 1240],
  [2820, 1520], [3120, 1650], [3420, 1500], [3680, 1150], [3880, 1000], [3960, 940],
];

/** A winding river, crossed by the true path; fish lives are bound to it. */
export const RIVER = [
  [1520, 3000], [1420, 2430], [1620, 1930], [1310, 1420],
  [1460, 900], [1260, 430], [1360, 0],
];
export const RIVER_WIDTH = 95;

/** False branches that lead to light gates. */
export const FALSE_A = [[2250, 1180], [2280, 860], [2380, 560], [2470, 340]];
export const FALSE_B = [[3120, 1650], [3260, 1980], [3420, 2280]];

/**
 * The great root behind the temple, and its sealed seed chamber
 * (docs/animal-lives-story.md ch.2, "ทางใต้ราก").
 *
 * The chamber is a ring of hard root with a single mouth of soft soil: a body
 * that can tunnel enters and reaches the seed inside; a walking body cannot get
 * in at all. `world/rooms.js#validateBurrowExit` proves both halves, and
 * `game/burrow.js` records the `root-watered` effect when the seed is reached.
 */
export const BURROW = Object.freeze({
  mouth: Object.freeze({ x: 700, y: 1120 }),
  chamber: Object.freeze({ x: 520, y: 900 }),
  ring: 150,
  walls: 14,
  wallRadius: 46,
  gapRadius: 42,
  exitRadius: 92,
});

/**
 * The ant's nest and the fallen seed (docs/animal-lives-story.md ch.3,
 * "เมล็ดของใคร").
 *
 * A shallow dome of hard root with one narrow crack: only a body small enough to
 * slip through reaches the nest, and the seed lies out in the open first, so the
 * life is an errand — pick the seed up, decide how much to leave for others, and
 * carry it home. `world/rooms.js#validateNestRoute` proves the crack is a door
 * for small bodies and a wall for everyone else.
 */
export const NEST = Object.freeze({
  seed: Object.freeze({ x: 980, y: 1440 }),
  chamber: Object.freeze({ x: 1300, y: 1960 }),
  ring: 130,
  walls: 12,
  wallRadius: 40,
  crackRadius: 34,
  crackPlugs: 5,
  seedRadius: 110,
  goalRadius: 78,
});

/** Keep seeded dressing out of the nest ring, or the crack could leak. */
export const NEST_KEEPOUT = Object.freeze({
  x: NEST.chamber.x,
  y: NEST.chamber.y,
  r: NEST.ring + 120,
});

/** The ant's errand: gate → the fallen seed → home. Kept clear of trunks. */
export const NEST_APPROACH = Object.freeze([
  Object.freeze([1120, 1560]),
  Object.freeze([1060, 1500]),
  Object.freeze([NEST.seed.x, NEST.seed.y]),
  Object.freeze([1200, 1720]),
  Object.freeze([NEST.chamber.x, NEST.chamber.y]),
]);

/** Keep seeded dressing out of the chamber, or the ring could leak. */
export const BURROW_KEEPOUT = Object.freeze({
  x: BURROW.chamber.x,
  y: BURROW.chamber.y,
  r: BURROW.ring + 130,
});

/**
 * The way in: a clear approach from the temple gate to the mouth and down to the
 * seed. Tree scatter keeps off this line, so a slow body is never walled out of
 * the only route its life has (the design's rule that no body is born where it
 * cannot finish).
 */
export const BURROW_APPROACH = Object.freeze([
  Object.freeze([1120, 1560]),
  Object.freeze([900, 1340]),
  Object.freeze([760, 1180]),
  Object.freeze([BURROW.mouth.x, BURROW.mouth.y]),
  Object.freeze([BURROW.chamber.x, BURROW.chamber.y]),
]);

const makeGateParts = () => Array.from({ length: 14 }, () => ({
  a: rng() * TAU,
  r: 40 + rng() * 55,
  s: 0.5 + rng() * 1.2,
}));

/** Illusory light gates — they only appear when fear is high. */
export const GATES = [
  { x: 2490, y: 300, from: { x: 2250, y: 1180 }, parts: makeGateParts() },
  { x: 3450, y: 2330, from: { x: 3120, y: 1650 }, parts: makeGateParts() },
];

/** Alternating left/right footprints along the real path. */
export const FOOT = (() => {
  const foot = [];
  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PATH[i];
    const b = PATH[i + 1];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    const nx = -dy / len;
    const ny = dx / len;
    const steps = Math.floor(len / 46);
    const angle = Math.atan2(dy, dx);
    for (let s = 0; s < steps; s++) {
      const progress = s / steps;
      const side = (i + s) % 2 ? 1 : -1;
      foot.push({
        x: a[0] + (b[0] - a[0]) * progress + nx * 9 * side,
        y: a[1] + (b[1] - a[1]) * progress + ny * 9 * side,
        ang: angle,
        side,
      });
    }
  }
  return foot;
})();

/** Seeded tree scatter that avoids paths, the temple and the sala. */
export const TREES = (() => {
  const trees = [];
  let tries = 0;
  while (trees.length < 920 && tries < 6000) {
    tries++;
    const x = 60 + rng() * (WORLD.w - 120);
    const y = 60 + rng() * (WORLD.h - 120);
    if (dist(x, y, TEMPLE.x, TEMPLE.y) < TEMPLE.r + 50) continue;
    if (dist(x, y, SALA.x, SALA.y) < 240) continue;
    if (distToPoly(PATH, x, y) < 135) continue;
    if (distToPoly(FALSE_A, x, y) < 92) continue;
    if (distToPoly(FALSE_B, x, y) < 92) continue;
    // Leave the roads to the seed and the nest clear: roots, not trunks, own this ground.
    if (dist(x, y, BURROW_KEEPOUT.x, BURROW_KEEPOUT.y) < BURROW_KEEPOUT.r) continue;
    if (distToPoly(BURROW_APPROACH, x, y) < 84) continue;
    if (dist(x, y, NEST_KEEPOUT.x, NEST_KEEPOUT.y) < NEST_KEEPOUT.r) continue;
    if (distToPoly(NEST_APPROACH, x, y) < 84) continue;
    if (trees.some((tree) => dist(x, y, tree.x, tree.y) < 52)) continue;
    trees.push({ x, y, r: 16 + rng() * 14, c: 52 + rng() * 64, s: rng() });
  }
  return trees;
})();
