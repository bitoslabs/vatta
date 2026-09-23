'use strict';

import { TEMPLE, SALA, WORLD, TAU } from '../core/constants.js';
import { dist, distToPoly } from '../core/math.js';
import { rng } from '../core/rng.js';

/** The real path — the only one with footprints. */
export const PATH = [
  [1130, 1560], [1560, 1580], [1900, 1400], [2250, 1180], [2560, 1240],
  [2820, 1520], [3120, 1650], [3420, 1500], [3680, 1150], [3880, 1000], [3960, 940],
];

/** False branches that lead to light gates. */
export const FALSE_A = [[2250, 1180], [2280, 860], [2380, 560], [2470, 340]];
export const FALSE_B = [[3120, 1650], [3260, 1980], [3420, 2280]];

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
    if (trees.some((tree) => dist(x, y, tree.x, tree.y) < 52)) continue;
    trees.push({ x, y, r: 16 + rng() * 14, c: 52 + rng() * 64, s: rng() });
  }
  return trees;
})();
