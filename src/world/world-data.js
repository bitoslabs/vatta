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
 * The trail, the rival and the tiger's range (docs/animal-lives-story.md ch.12,
 * "เงาในพุ่ม").
 *
 * Real tracks, in order: each one has to be read where the last one ended, and
 * only a body that reads trails can read them at all (`tracker`, or the
 * `trust-built` effect of a life that already chose the quiet way). The tracks
 * lead to a hollow where a rival rests — and the life's question is asked there:
 * slip away, or take it. Nothing here is a wall; the tiger's door is attention.
 */
export const TRAIL = Object.freeze({
  tracks: Object.freeze([
    Object.freeze({ x: 1700, y: 620 }),
    Object.freeze({ x: 2050, y: 760 }),
    Object.freeze({ x: 2400, y: 900 }),
    Object.freeze({ x: 2720, y: 700 }),
    Object.freeze({ x: 2980, y: 520 }),
  ]),
  hollow: Object.freeze({ x: 3200, y: 380 }),
  range: Object.freeze({ x: 1500, y: 400 }),
  trackRadius: 78,
  hollowRadius: 104,
  rangeRadius: 112,
});

/** Seeded dressing keeps off the tracks, the hollow and the tiger's range. */
export const TRAIL_KEEPOUTS = Object.freeze([
  ...TRAIL.tracks.map((track) => Object.freeze({ x: track.x, y: track.y, r: 110 })),
  Object.freeze({ x: TRAIL.hollow.x, y: TRAIL.hollow.y, r: 190 }),
  Object.freeze({ x: TRAIL.range.x, y: TRAIL.range.y, r: 190 }),
]);

/** The tiger's way: its range → the tracks → the hollow → home. Kept clear of trunks. */
export const TRAIL_APPROACH = Object.freeze([
  Object.freeze([1500, 400]),
  Object.freeze([1700, 620]),
  Object.freeze([2050, 760]),
  Object.freeze([2400, 900]),
  Object.freeze([2720, 700]),
  Object.freeze([2980, 520]),
  Object.freeze([3200, 380]),
]);

/**
 * The grove and the fallen log (docs/animal-lives-story.md ch.11, "กำลังที่คุ้มครอง").
 *
 * The gathering grove is walled by stone with two openings: a mouth plugged by a
 * fallen log — which only the elephant's strength can lift — and a crawlway a
 * small body slips through. So the large road and the small road already meet at
 * the same wall, and the elephant's care decides whether the two fragile nests
 * under the log survive the lifting. `world/rooms.js#validateElephantRoute`
 * proves the mouth is shut before the lift and open after it, and that the
 * crawlway works without any lift at all.
 */
export const GROVE = Object.freeze({
  grove: Object.freeze({ x: 3600, y: 560 }),
  ring: 190,
  segments: 22,
  stoneRadius: 46,
  log: Object.freeze({ x: 3600, y: 750 }),
  logRadius: 74,
  crawlAngle: Math.PI * 0.75,
  crawlRadius: 34,
  nests: Object.freeze([
    Object.freeze({ x: 3524, y: 784, id: 'nest-a' }),
    Object.freeze({ x: 3678, y: 786, id: 'nest-b' }),
  ]),
  nestRadius: 38,
  groveRadius: 96,
  /** How far a log shoved the wrong way reaches. */
  fallReach: 200,
});

/** Seeded dressing keeps off the walled grove and the nests beneath the log. */
export const GROVE_KEEPOUTS = Object.freeze([
  Object.freeze({ x: 3600, y: 560, r: 330 }),
  Object.freeze({ x: 3524, y: 784, r: 90 }),
  Object.freeze({ x: 3678, y: 786, r: 90 }),
]);

/** The elephant's way in: the road → the log → the grove. Kept clear of trunks. */
export const GROVE_APPROACH = Object.freeze([
  Object.freeze([3680, 1150]),
  Object.freeze([3640, 940]),
  Object.freeze([3600, 750]),
  Object.freeze([3600, 560]),
]);

/**
 * The roost and the lost ones (docs/animal-lives-story.md ch.13, "สิ่งที่กลางวัน
 * ไม่เห็น").
 *
 * Nothing here is a wall: the owl flies. What the night hides is the *finding*.
 * Each lost animal is only perceived inside the body's own vision radius
 * (systems/vision.js), which is why the owl's night eyes are a rule and not a
 * tint — and why `night-watched`, the effect of a life that kept watch, leaves
 * every later body a little more light.
 */
export const OWL = Object.freeze({
  roost: Object.freeze({ x: 2450, y: 2450 }),
  lost: Object.freeze([
    Object.freeze({ x: 800, y: 700, id: 'fawn' }),
    Object.freeze({ x: 2500, y: 2760, id: 'lamb' }),
    Object.freeze({ x: 3480, y: 620, id: 'hare' }),
  ]),
  roostRadius: 96,
  lostRadius: 84,
});

/** Seeded dressing keeps off the roost tree and the places the lost ones wait. */
export const OWL_KEEPOUTS = Object.freeze([
  Object.freeze({ x: 2450, y: 2450, r: 190 }),
  Object.freeze({ x: 800, y: 700, r: 90 }),
  Object.freeze({ x: 2500, y: 2760, r: 90 }),
  Object.freeze({ x: 3480, y: 620, r: 90 }),
]);

/**
 * The field and its warrens (docs/animal-lives-story.md ch.10, "ที่หลบก่อนพายุ").
 *
 * A washed-out gully rings the far warren, so the only way in is a leap. The
 * rabbit's life is a *relay*, not a race: join the warrens, leap the washed rim,
 * and decide at the far shelter whether to leave it open for the slow ones.
 * Nothing here is timed — the design is explicit that speed is not a score, so
 * `world/rooms.js#validateRabbitRoute` proves only the leap, never the clock.
 */
export const FIELD = Object.freeze({
  warrens: Object.freeze([
    Object.freeze({ x: 600, y: 2350, id: 'a' }),
    Object.freeze({ x: 860, y: 2560, id: 'b' }),
    Object.freeze({ x: 1150, y: 2700, id: 'c' }),
  ]),
  meadow: Object.freeze({ x: 700, y: 2700 }),
  /** The washed rim around the far warren: unbroken, and only a leap crosses. */
  gully: Object.freeze({ x: 1150, y: 2700, ring: 190, segments: 24, radius: 44 }),
  warrenRadius: 74,
  meadowRadius: 96,
});

/** Keep seeded dressing out of the warrens, the meadow and the washed rim. */
export const FIELD_KEEPOUTS = Object.freeze([
  Object.freeze({ x: 600, y: 2350, r: 150 }),
  Object.freeze({ x: 860, y: 2560, r: 150 }),
  Object.freeze({ x: 1150, y: 2700, r: 330 }),
  Object.freeze({ x: 700, y: 2700, r: 160 }),
]);

/** The rabbit's errand: road → the warrens → the washed rim → the field. Kept clear of trunks. */
export const FIELD_APPROACH = Object.freeze([
  Object.freeze([1130, 1560]),
  Object.freeze([1000, 1880]),
  Object.freeze([820, 2180]),
  Object.freeze([700, 2700]),
  Object.freeze([600, 2350]),
  Object.freeze([860, 2560]),
  Object.freeze([1150, 2700]),
]);

/**
 * The crevice and the sealed spring (docs/animal-lives-story.md ch.6, "ช่องแคบ").
 *
 * A spring is shut inside a ring of stone whose only way in is a narrow crevice:
 * a body that can flatten itself slips through, a walker cannot, and neither can
 * a small body that is not flat (an ant) or one that tunnels (an earthworm).
 * Inside, the snake decides whether to *widen* the crevice so every body may
 * pass and the water links to the river — the `water-linked` world effect — or
 * to keep its own narrow way. `world/rooms.js#validateSnakeRoute` proves the
 * crevice is a door for a slithering body alone.
 */
export const CREVICE = Object.freeze({
  spring: Object.freeze({ x: 1780, y: 2380 }),
  outflow: Object.freeze({ x: 1500, y: 2450 }),
  ring: 140,
  walls: 12,
  wallRadius: 42,
  gapRadius: 36,
  gapPlugs: 5,
  springRadius: 80,
  outflowRadius: 86,
});

/** Keep seeded dressing out of the stone ring, or the crevice could close. */
export const CREVICE_KEEPOUT = Object.freeze({
  x: CREVICE.spring.x,
  y: CREVICE.spring.y,
  r: CREVICE.ring + 130,
});

/** The snake's way in: road → stone → the spring → the outflow. Kept clear of trunks. */
export const CREVICE_APPROACH = Object.freeze([
  Object.freeze([1560, 1580]),
  Object.freeze([1600, 1960]),
  Object.freeze([1710, 2260]),
  Object.freeze([CREVICE.spring.x, CREVICE.spring.y]),
  Object.freeze([CREVICE.outflow.x, CREVICE.outflow.y]),
]);

/**
 * The marsh (docs/animal-lives-story.md ch.4, "ฝนหยดแรก").
 *
 * The forest is short of water. A channel that would feed the lower forest is
 * blocked, and the gate to it stands inside a ring of deep mire — the frog leaps
 * in, decides what to do about the channel, and only then does the bank where it
 * lays its eggs become the place its life can end. `world/rooms.js#validateFrogRoute`
 * proves the mire is a door for a leaping body alone.
 */
export const MARSH = Object.freeze({
  inlet: Object.freeze({ x: 2860, y: 2320 }),
  bank: Object.freeze({ x: 3108, y: 2180 }),
  ring: 150,
  walls: 12,
  wallRadius: 44,
  mireRadius: 40,
  mirePlugs: 5,
  inletRadius: 84,
  bankRadius: 92,
});

/** Pools that make the marsh water, not just mud. */
export const MARSH_PONDS = Object.freeze([
  Object.freeze({ x: 3010, y: 2300, r: 96 }),
  Object.freeze({ x: 3160, y: 2380, r: 78 }),
  Object.freeze({ x: 3260, y: 2140, r: 70 }),
]);

/** Keep seeded dressing out of the inlet ring, or the leap gap could close. */
export const MARSH_KEEPOUT = Object.freeze({
  x: MARSH.inlet.x,
  y: MARSH.inlet.y,
  r: MARSH.ring + 130,
});

/** The frog's way in: road → marsh → the inlet → the bank. Kept clear of trunks. */
export const MARSH_APPROACH = Object.freeze([
  Object.freeze([2820, 1520]),
  Object.freeze([2790, 1900]),
  Object.freeze([2820, 2140]),
  Object.freeze([MARSH.inlet.x, MARSH.inlet.y]),
  Object.freeze([MARSH.bank.x, MARSH.bank.y]),
]);

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
    if (dist(x, y, MARSH_KEEPOUT.x, MARSH_KEEPOUT.y) < MARSH_KEEPOUT.r) continue;
    if (distToPoly(MARSH_APPROACH, x, y) < 84) continue;
    if (dist(x, y, CREVICE_KEEPOUT.x, CREVICE_KEEPOUT.y) < CREVICE_KEEPOUT.r) continue;
    if (distToPoly(CREVICE_APPROACH, x, y) < 84) continue;
    if (FIELD_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r)) continue;
    if (distToPoly(FIELD_APPROACH, x, y) < 84) continue;
    if (OWL_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r)) continue;
    if (GROVE_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r)) continue;
    if (distToPoly(GROVE_APPROACH, x, y) < 84) continue;
    if (TRAIL_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r)) continue;
    if (distToPoly(TRAIL_APPROACH, x, y) < 84) continue;
    if (trees.some((tree) => dist(x, y, tree.x, tree.y) < 52)) continue;
    trees.push({ x, y, r: 16 + rng() * 14, c: 52 + rng() * 64, s: rng() });
  }
  return trees;
})();
