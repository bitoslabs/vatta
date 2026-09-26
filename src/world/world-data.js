'use strict';

import { mapProfile, baseBiomeId } from '../content/realm-maps.js';

import { TEMPLE, SALA, WORLD, TAU } from '../core/constants.js';
import { dist, distToPoly } from '../core/math.js';
import { mulberry32, rng, seedFrom } from '../core/rng.js';

/** The real path — the only one with footprints. */
export const PATH = [
  [1130, 1560], [1560, 1580], [1900, 1400], [2250, 1180], [2560, 1240],
  [2820, 1520], [3120, 1650], [3420, 1500], [3680, 1150], [3880, 1000], [3960, 940],
];

/** A herd crossing on the forest road, with cover before the exposed ground. */
export const DEER = Object.freeze({
  crossing: Object.freeze({ x: 1900, y: 1400 }),
  herd: Object.freeze({ x: 1730, y: 1500 }),
  refuge: Object.freeze({ x: 1600, y: 1540 }),
  preview: Object.freeze({ x: 1810, y: 1490 }),
});

/**
 * Every plane walks its own road (design §7).
 *
 * The road is the spine of a map: the dressing is placed beside it, the route
 * checker walks it, and being on it is what keeps a body moving at full speed
 * (world/rooms.js#isOnRoute). So the plane a life is born into does not merely
 * re-tint one road — it lays a different one:
 *
 *   memory-forest  the winding forest road (the original, unchanged)
 *   under-root     straighter and lower: a tunnelled line under the roots
 *   woeful         cramped switchbacks, doubling back on itself
 *   asura-city     streets with square corners and long straight runs
 *   light-garden   one wide, gentle arc of terraces
 *   craving-market a serpentine alley that keeps turning you around
 *   formless       the shortest possible line: there is nothing to hold on to
 *
 * All of them start at the temple gate and end at the sala's door, so the same
 * life still has the same destination; only the way there changes.
 */
export const ROUTE_SOIL = [
  [1130, 1560], [1500, 1500], [1850, 1440], [2180, 1420], [2500, 1380],
  [2830, 1300], [3150, 1240], [3450, 1150], [3700, 1060], [3960, 940],
];
export const ROUTE_WOEFUL = [
  [1130, 1560], [1420, 1560], [1400, 1320], [1700, 1300], [1680, 1080],
  [1980, 1080], [1960, 860], [2260, 880], [2240, 1120], [2540, 1120],
  [2520, 1340], [2820, 1340], [2820, 1580], [3140, 1580], [3140, 1320],
  [3440, 1320], [3440, 1080], [3720, 1080], [3960, 940],
];
export const ROUTE_CITY = [
  [1130, 1560], [1560, 1560], [1560, 1180], [1980, 1180], [1980, 1520],
  [2400, 1520], [2400, 1120], [2820, 1120], [2820, 1460], [3240, 1460],
  [3240, 1060], [3660, 1060], [3660, 940], [3960, 940],
];
export const ROUTE_GARDEN = [
  [1130, 1560], [1500, 1700], [1900, 1760], [2300, 1700], [2650, 1560],
  [3000, 1420], [3300, 1240], [3560, 1080], [3780, 980], [3960, 940],
];
export const ROUTE_MARKET = [
  [1130, 1560], [1400, 1620], [1660, 1500], [1920, 1620], [2180, 1480],
  [2440, 1600], [2700, 1460], [2960, 1580], [3220, 1440], [3480, 1300],
  [3700, 1140], [3860, 1020], [3960, 940],
];
export const ROUTE_FORMLESS = [
  [1130, 1560], [3960, 940],
];

/** The road each plane lays. Unknown planes fall back to the forest road. */
export const ROUTES = Object.freeze({
  'memory-forest': PATH,
  'under-root': ROUTE_SOIL,
  woeful: ROUTE_WOEFUL,
  'asura-city': ROUTE_CITY,
  'light-garden': ROUTE_GARDEN,
  'craving-market': ROUTE_MARKET,
  formless: ROUTE_FORMLESS,
});

/** The road this plane walks (a plane with no road of its own walks the forest's). */
const realmRoutes = new Map();
export function routeForPlane(biomeId) {
  const profile = mapProfile(biomeId);
  if (!profile) return ROUTES[biomeId] || PATH;
  if (realmRoutes.has(biomeId)) return realmRoutes.get(biomeId);
  const base = ROUTES[baseBiomeId(biomeId)] || PATH;
  // Keep chapter-one tutorial junctions intact in the human forest.
  if (profile.id === 'manussa' && base === PATH) return PATH;
  const random = mulberry32(seedFrom(biomeId));
  const spine = base.length === 2 ? [base[0], ...[.25,.5,.75].map(t => [
    base[0][0] + (base[1][0]-base[0][0])*t,
    base[0][1] + (base[1][1]-base[0][1])*t,
  ]), base[1]] : base;
  const route = spine.map((point,i) => i === 0 || i === spine.length-1 ? [...point]
    : [point[0] + Math.round((random()-.5)*110), point[1] + Math.round((random()-.5)*140)]);
  realmRoutes.set(biomeId, route);
  return route;
}

/** The point on this plane's road closest to (x, y). */
export function nearestOnRoute(biomeId, x, y) {
  const route = routeForPlane(biomeId);
  let best = { x: route[0][0], y: route[0][1] };
  let bestDist = Infinity;
  for (let i = 0; i < route.length - 1; i++) {
    const [ax, ay] = route[i];
    const [bx, by] = route[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = (dx * dx) + (dy * dy) || 1;
    const t = Math.max(0, Math.min(1, (((x - ax) * dx) + ((y - ay) * dy)) / len2));
    const px = ax + dx * t;
    const py = ay + dy * t;
    const d = Math.hypot(x - px, y - py);
    if (d < bestDist) {
      bestDist = d;
      best = { x: px, y: py };
    }
  }
  return best;
}

/**
 * Carry a point that belongs beside the *forest* road onto this plane's road.
 *
 * The temple, the gate and the sala stand in every plane, so a chapter can start
 * anywhere it likes; but a lure, a roadside being or the guardian belongs to the
 * road itself (design §7). In the forest this is the identity; elsewhere the
 * point is carried to the nearest place on that plane's road, so a life born in
 * the asura city still meets them along *its* streets instead of on a forest
 * path that does not exist there.
 */
export function anchoredPoint(biomeId, x, y) {
  if (!biomeId || biomeId === 'memory-forest' || biomeId === 'manussa@memory-forest') return { x, y };
  return nearestOnRoute(biomeId, x, y);
}

/** A winding river, crossed by the true path; fish lives are bound to it. */
export const RIVER = [
  [1520, 3000], [1420, 2430], [1620, 1930], [1310, 1420],
  [1460, 900], [1260, 430], [1360, 0],
];


/** The river point nearest a place: where a water-bound body enters and where it goes. */
export function nearestRiverPoint(target) {
  let best = RIVER[0];
  let bestDist = Infinity;
  for (const point of RIVER) {
    const d = Math.hypot(point[0] - target.x, point[1] - target.y);
    if (d < bestDist) {
      bestDist = d;
      best = point;
    }
  }
  return { x: best[0], y: best[1] };
}
export const RIVER_WIDTH = 95;

/** A fish swims from the upper river to a downstream pool past the shallows. */
export const FISH = Object.freeze({
  pool: Object.freeze({ x: 1420, y: 2430 }),
  shallows: Object.freeze({ x: 1620, y: 1930 }),
  refuge: Object.freeze({ x: 1310, y: 1420 }),
  channel: Object.freeze({ x: 1510, y: 1800 }),
  preview: Object.freeze({ x: 1540, y: 1810 }),
});

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
  shelter: Object.freeze({ x: 740, y: 1210 }),
  chamber: Object.freeze({ x: 520, y: 900 }),
  ring: 150,
  walls: 14,
  wallRadius: 46,
  gapRadius: 42,
  exitRadius: 92,
});

/**
 * The dry ridge and the damp garden (docs/animal-lives-story.md story table,
 * "หอยทาก — ผ่านพื้นที่ชื้นและพักเมื่อแห้ง · รู้ข้อจำกัดและจังหวะของตัวเอง").
 *
 * A ridge of dry ground rings the garden at its end. For every body but one it is
 * simply ground — nothing is sealed, and no one else notices it. For a body that
 * needs the damp (`needsDamp`, content/forms.js) it is a wall except while the
 * ground is damp (systems/moisture.js), so the snail crosses in the world's own
 * rhythm, waits when it is dry, and loses nothing by waiting. A trail left damp by
 * a snail that went before makes the crossing open to it at any hour
 * (`damp-trail`).
 *
 * The only barrier in the game that exists for *one body*.
 */
export const DAMP = Object.freeze({
  /** The damp hollow the life starts from. */
  hollow: Object.freeze({ x: 700, y: 400 }),
  /** The garden at the end of the crossing. */
  garden: Object.freeze({ x: 1300, y: 600 }),
  gardenRadius: 100,
  ring: 150,
  segments: 18,
  ridgeRadius: 44,
});

/** Seeded dressing keeps off the hollow, the garden and the ridge between them. */
export const DAMP_KEEPOUTS = Object.freeze([
  Object.freeze({ x: DAMP.hollow.x, y: DAMP.hollow.y, r: 220 }),
  Object.freeze({ x: DAMP.garden.x, y: DAMP.garden.y, r: DAMP.ring + 160 }),
]);

/** The snail's crawl: the hollow → across the ridge → the garden. */
export const DAMP_APPROACH = Object.freeze([
  Object.freeze([900, 1000]),
  Object.freeze([DAMP.hollow.x, DAMP.hollow.y]),
  Object.freeze([DAMP.garden.x, DAMP.garden.y]),
]);

/**
 * The market's alley (design §7, "ตลาดความอยาก — ร้านแตกแขนงเมื่อรับข้อเสนอบ่อย ·
 * ผ่านช่องทางออกด้วยมือที่ว่าง").
 *
 * A walled alley off the craving plane's own street, and its one gate is a
 * *narrow* gate: it lets a body through only while its hands are empty. Inside,
 * the alley narrows into chambers behind curtains, and each curtain opens to a
 * heavier pair of hands — take an offer, and the next curtain parts; carry
 * nothing, and the only way on is out. So the design's line is the whole shape of
 * the place: the shops branch as the offers accumulate, and the way through is
 * passed with empty hands — a life can always put down what it picked up
 * (`game/market.js`), and a life that did is remembered by the market itself: the
 * first curtain does not stand in the next world (`hands-emptied`).
 */
/**
 * The spider's web (docs/animal-lives-story.md reserve table "แมงมุม — ขึงใยเชื่อม
 * จุดยึด · สร้างสะพานให้ตัวเล็กโดยไม่ปิดทางผู้อื่น").
 *
 * A fissure runs across the way to a far hollow, and nothing that cannot leap or fly
 * crosses it. Two anchors stand either side of it, and a life that spins a thread
 * between them leaves a *bridge for small bodies* — a crossing that did not exist
 * before, and that takes nothing away from anyone: a leaping or flying body was never
 * stopped by the fissure, and still is not (`validateSpiderRoute` proves the
 * no-closure clause as well as the crossing).
 */
/**
 * The swarm field (docs/animal-lives-story.md reserve table "หิ่งห้อย — ส่งแสงเป็น
 * จังหวะ · สื่อสารกับฝูงและนำทางในหมอก").
 *
 * A ring of bramble with a thin mist across its gate, and a swarm stone at the
 * middle. The mist is nothing to a body that glows — the firefly walks in — and
 * walls out every body that does not. What the life does at the stone (signal in
 * rhythm, so the swarm answers) turns that private way into a common one: with
 * `swarm-lit`, the mist no longer stops anyone, and the field is a way through for
 * every life after it.
 */
/**
 * The beetle's groove and trench (docs/animal-lives-story.md reserve table "ด้วง —
 * ผลักวัตถุด้วยแรงและทิศ · ร่วมกับมดขนเมล็ดใหญ่ข้ามร่อง").
 *
 * A trench rings a far hollow, and nothing that cannot leap crosses it. Outside the
 * ring lies a groove with a *big seed* on it, and the seed is pushed — one step at a
 * time, in the direction the body stands — along the groove to the **socket** at the
 * ring. Seated there, the seed is a crossing: the trench is bridged for every body
 * (`trench-bridged`), which is the reserve table's "force and direction" made into
 * something a life has to do rather than watch.
 */
export const PUSH = Object.freeze({
  /** The point on the plane's road the errand opens from. */
  road: Object.freeze({ x: 3720, y: 1120 }),
  /** From the road toward the groove: the outward normal of the street here. */
  dir: Object.freeze({ x: 0.6, y: 0.8 }),
  /** The far hollow the trench rings, and where the life ends. */
  hollow: Object.freeze({ x: 4038, y: 1544 }),
  hollowRadius: 96,
  /** The trench: a ring, so nobody walks around it. */
  ring: 150,
  segments: 18,
  trenchRadius: 56,
  /** The socket on the ring, and the groove running back from it to the road. */
  socket: Object.freeze({ x: 3948, y: 1424 }),
  grooveStep: 56,
  steps: 5,
  seedRadius: 36,
  /**
   * The seated seed reaches wider than it rolls: it fills the gap and packs the
   * stones either side of the socket, which is what makes a walkable crossing.
   */
  seatRadius: 62,
  /** Where the seed starts: the far end of the groove, a step off the road. */
  groove: Object.freeze({ x: 3780, y: 1200 }),
});

export const PUSH_KEEPOUTS = Object.freeze([
  Object.freeze({ x: PUSH.hollow.x, y: PUSH.hollow.y, r: PUSH.ring + 120 }),
  Object.freeze({ x: PUSH.road.x, y: PUSH.road.y, r: 150 }),
]);

/** The errand's way: the road → the groove → the seed → the socket. */
export const PUSH_APPROACH = Object.freeze([
  Object.freeze([PUSH.road.x, PUSH.road.y]),
  Object.freeze([PUSH.groove.x, PUSH.groove.y]),
  Object.freeze([PUSH.socket.x, PUSH.socket.y]),
]);

/** Where a push has left the seed: step 0 is the start, `steps` is the socket. */
export function seedPoint(step = 0) {
  const clamped = Math.max(0, Math.min(PUSH.steps, Math.round(step)));
  // Step 0 is the groove's far end by the road; `steps` is the socket itself.
  return {
    x: PUSH.socket.x - PUSH.dir.x * PUSH.grooveStep * (PUSH.steps - clamped),
    y: PUSH.socket.y - PUSH.dir.y * PUSH.grooveStep * (PUSH.steps - clamped),
  };
}

export const SIGNAL = Object.freeze({
  /** The point on the plane's road the errand opens from. */
  road: Object.freeze({ x: 3331, y: 1078 }),
  /** From the road toward the stone. */
  dir: Object.freeze({ x: -0.21, y: -0.98 }),
  /** The swarm stone, and the field's middle. */
  stone: Object.freeze({ x: 3235, y: 638 }),
  stoneRadius: 88,
  /** The bramble ring, and the gate the mist lies across. */
  ring: 190,
  segments: 20,
  brambleRadius: 58,
  gateSegments: 2,
  mistRadius: 62,
  mistPlugs: 4,
  /** Where the life rests before it goes in. */
  rest: Object.freeze({ x: 3290, y: 900 }),
  restRadius: 96,
});

/** Seeded dressing keeps off the ring, the stone and the resting place. */
export const SIGNAL_KEEPOUTS = Object.freeze([
  Object.freeze({ x: SIGNAL.stone.x, y: SIGNAL.stone.y, r: SIGNAL.ring + 150 }),
  Object.freeze({ x: SIGNAL.rest.x, y: SIGNAL.rest.y, r: 170 }),
]);

/** The errand's way: the road → the rest → the gate → the stone. */
export const SIGNAL_APPROACH = Object.freeze([
  Object.freeze([SIGNAL.road.x, SIGNAL.road.y]),
  Object.freeze([SIGNAL.rest.x, SIGNAL.rest.y]),
  Object.freeze([SIGNAL.stone.x, SIGNAL.stone.y]),
]);

/** Which way the gate faces: from the stone toward the resting place. */
export function signalGate() {
  const angle = Math.atan2(SIGNAL.rest.y - SIGNAL.stone.y, SIGNAL.rest.x - SIGNAL.stone.x);
  return {
    angle,
    x: SIGNAL.stone.x + Math.cos(angle) * SIGNAL.ring,
    y: SIGNAL.stone.y + Math.sin(angle) * SIGNAL.ring,
  };
}

export const WEB = Object.freeze({
  /** The point on the plane's road the errand opens from. */
  road: Object.freeze({ x: 2624, y: 1233 }),
  /** From the road toward the far hollow: the outside of the ring, then its middle. */
  dir: Object.freeze({ x: -0.21, y: -0.98 }),
  /** The hollow beyond the fissure: the middle of the ring, and where the life ends. */
  hollow: Object.freeze({ x: 2540, y: 852 }),
  hollowRadius: 96,
  /** The fissure is a ring, so no one walks around it: leap or fly, or not at all. */
  ring: 150,
  segments: 16,
  fissureRadius: 62,
  /** Two posts: one outside the ring, one inside it. The thread crosses between. */
  anchorOut: Object.freeze({ x: 2588, y: 1077 }),
  anchorIn: Object.freeze({ x: 2555, y: 921 }),
  anchorRadius: 40,
  /** The thread: laid as overlapping beads, so it covers the ring where it crosses. */
  webRadius: 40,
  webStep: 26,
  /** The hollow this side of the ring, where the errand starts. */
  near: Object.freeze({ x: 2615, y: 1204 }),
});

/** Seeded dressing keeps off the ring, the posts and both hollows. */
export const WEB_KEEPOUTS = Object.freeze([
  Object.freeze({ x: WEB.hollow.x, y: WEB.hollow.y, r: WEB.ring + 170 }),
  Object.freeze({ x: WEB.near.x, y: WEB.near.y, r: 170 }),
]);

/** The errand's way: the road → the near hollow → the outer post → the hollow. */
export const WEB_APPROACH = Object.freeze([
  Object.freeze([WEB.road.x, WEB.road.y]),
  Object.freeze([WEB.near.x, WEB.near.y]),
  Object.freeze([WEB.anchorOut.x, WEB.anchorOut.y]),
  Object.freeze([WEB.anchorIn.x, WEB.anchorIn.y]),
  Object.freeze([WEB.hollow.x, WEB.hollow.y]),
]);

export const MARKET = Object.freeze({
  /** The point on the plane's street the alley opens off. */
  anchor: Object.freeze({ x: 2348, y: 1293 }),
  /** Which side of the street the alley runs: 1 is the road's left normal. */
  side: 1,
  /** How far off the street the gate stands. */
  gateGap: 110,
  /**
   * The alley: this long, this wide, in a wall this thick. The curtains stand
   * further apart than twice their own reach, so each one leaves a real chamber
   * behind it: a door you cannot walk past is not a branching.
   */
  length: 640,
  halfWidth: 100,
  wallRadius: 46,
  /** The gate's own stones, and the curtains that branch the alley. */
  gateRadius: 46,
  curtainRadius: 56,
  curtainAt: Object.freeze([150, 310, 470]),
  curtainNeeds: Object.freeze([1, 2, 3]),
  /**
   * Where the offers stand, and how near a body must be to take one. One offer per
   * chamber, so the curtains always have something to open on; kept off the
   * alley's middle line, because the plane's being stands there.
   */
  gifts: Object.freeze([
    Object.freeze({ d: 70, across: 34 }),
    Object.freeze({ d: 230, across: 40 }),
    Object.freeze({ d: 385, across: -34 }),
    Object.freeze({ d: 550, across: 40 }),
  ]),
  giftRadius: 34,
  offerRange: 60,
});

/** The point on the street, beside the gate (where the alley is entered from). */
export function marketAnchor() {
  return MARKET.anchor;
}

/**
 * Which way the alley runs: straight away from the street it opens off.
 *
 * Derived from the roads rather than written down, so that moving the anchor (as
 * the rooms were moved once, to stop sealing an animal's errand) cannot leave the
 * alley pointing along a stale direction.
 */
export function marketAxis() {
  const anchor = MARKET.anchor;
  let best = { x: 1, y: 0, d: Infinity };
  for (const route of Object.values(ROUTES)) {
    for (let i = 1; i < route.length; i++) {
      const [ax, ay] = route[i - 1];
      const [bx, by] = route[i];
      const dx = bx - ax;
      const dy = by - ay;
      const length = Math.hypot(dx, dy) || 1;
      const t = Math.max(0, Math.min(1, ((anchor.x - ax) * dx + (anchor.y - ay) * dy) / (length * length)));
      const px = ax + dx * t;
      const py = ay + dy * t;
      const d = dist(anchor.x, anchor.y, px, py);
      if (d >= best.d) continue;
      // The anchor sits *on* the street, so "which side" cannot be read from the
      // geometry: the side is declared (MARKET.side), and only the tangent comes
      // from the road. That keeps the alley pointing where the data says.
      best = { x: (-dy / length) * MARKET.side, y: (dx / length) * MARKET.side, d };
    }
  }
  return { x: best.x, y: best.y };
}

/** The narrow gate itself: empty hands pass, anything carried does not. */
export function marketGate() {
  const axis = marketAxis();
  return {
    x: MARKET.anchor.x + axis.x * MARKET.gateGap,
    y: MARKET.anchor.y + axis.y * MARKET.gateGap,
  };
}

/** The middle of the alley, where its two halves meet. */
export function marketCentre() {
  const gate = marketGate();
  const axis = marketAxis();
  return {
    x: gate.x + axis.x * (MARKET.length / 2),
    y: gate.y + axis.y * (MARKET.length / 2),
  };
}

/** The first chamber, inside the gate: where the plane's being stands. */
export function marketInside() {
  const gate = marketGate();
  const axis = marketAxis();
  return {
    x: gate.x + axis.x * 70,
    y: gate.y + axis.y * 70,
  };
}

/** The far end, past the deepest curtain: the chamber the heaviest hands reach. */
export function marketFar() {
  const gate = marketGate();
  const axis = marketAxis();
  return {
    x: gate.x + axis.x * (MARKET.length - 70),
    y: gate.y + axis.y * (MARKET.length - 70),
  };
}

/** Seeded dressing keeps off the alley, its walls and its gate. */
export const MARKET_KEEPOUTS = Object.freeze(
  // A capsule along the whole alley, not a circle at its middle: seeded dressing
  // must not be able to stand in the gate or on the far chamber.
  [0, 0.25, 0.5, 0.75, 1].map((at) => Object.freeze({
    x: marketGate().x + marketAxis().x * MARKET.length * at,
    y: marketGate().y + marketAxis().y * MARKET.length * at,
    r: 230,
  })),
);

/** The way in: the street → the narrow gate → the alley. Kept clear of trunks. */
export const MARKET_APPROACH = Object.freeze([
  Object.freeze([MARKET.anchor.x, MARKET.anchor.y]),
  Object.freeze([marketGate().x, marketGate().y]),
  Object.freeze([marketCentre().x, marketCentre().y]),
]);

/**
 * The light garden's gate (design §7, "สวนแสงไม่เที่ยง — สวนบานแล้วโรย ทางแสงมีอายุ ·
 * ปล่อยดอกไม้เก่าเพื่อให้เมล็ดเดินทางต่อ").
 *
 * A hedge ring with one gate, and that gate is a *shadow* — dark ground no walker
 * crosses except while the garden's light is on it (`systems/light.js`, the
 * fastest of the world's three rhythms). So the way into the garden exists and
 * then does not: the light path has an age. Inside are the bloom beds, each of
 * them either still in flower or already ripe, and a life that releases a ripe bed
 * lets its seeds travel on — into every later world, along this plane's own road
 * (`seeds-released`).
 */
export const GARDEN = Object.freeze({
  center: Object.freeze({ x: 3392, y: 1356 }),
  ring: 200,
  segments: 24,
  hedgeRadius: 48,
  /** Two hedge segments are left out for the gate the shadow lies across. */
  gateSegments: 2,
  shadowRadius: 46,
  shadowPlugs: 4,
  /** The beam of light that lies over the shadow: there only while it is lit. */
  beamRadius: 92,
  /** How far inside the gate counts as being in the garden. */
  innerRadius: 104,
  /** The bloom beds, each with its own age (seeded). */
  beds: Object.freeze([
    Object.freeze({ x: 3392, y: 1266 }),
    Object.freeze({ x: 3470, y: 1401 }),
    Object.freeze({ x: 3314, y: 1401 }),
  ]),
  bedRadius: 40,
  /** The point on the garden plane's road the gate faces. */
  road: Object.freeze({ x: 3331, y: 1078 }),
});

/** Where the ring is broken, and which way the gate faces the road. */
export function gardenGate() {
  const angle = Math.atan2(GARDEN.road.y - GARDEN.center.y, GARDEN.road.x - GARDEN.center.x);
  return {
    angle,
    x: GARDEN.center.x + Math.cos(angle) * GARDEN.ring,
    y: GARDEN.center.y + Math.sin(angle) * GARDEN.ring,
  };
}

/** Seeded dressing keeps off the garden, its hedge and its gate. */
export const GARDEN_KEEPOUTS = Object.freeze([
  Object.freeze({ x: GARDEN.center.x, y: GARDEN.center.y, r: GARDEN.ring + 150 }),
]);

/** The garden's way: the road → the gate → the beds. Kept clear of trunks. */
export const GARDEN_APPROACH = Object.freeze([
  Object.freeze([GARDEN.road.x, GARDEN.road.y]),
  Object.freeze([GARDEN.center.x + 30, GARDEN.center.y - 150]),
  Object.freeze([GARDEN.center.x, GARDEN.center.y]),
]);

/**
 * The asura city's plaza (design §7, "นครอสุร — หอคอยและสะพานเปลี่ยนเมื่อมีการแย่ง
 * หรือแบ่งทรัพยากร · หยุดสร้างหอแข่งกันแล้วสร้างสะพานร่วม").
 *
 * A walled plaza in the city's blocks, and its one gate a *broken* gate: the two
 * rival towers that flank it have each eaten the span that used to be here, and
 * what is left of the opening is a drop no walker crosses. A life that stops
 * raising its own tower and lays the stones back as a shared span opens the plaza
 * for every life after it (`span-built`, `state.world.spans`) — and inside is the
 * city's shrine, which is a place to rest only once that span is there.
 *
 * The plaza sits off the plane's own street: the city's road must stay walkable
 * for every body, so what the drop seals is this room, not the way.
 */
export const ASURA = Object.freeze({
  plaza: Object.freeze({ x: 1938, y: 1675 }),
  ring: 200,
  segments: 24,
  wallRadius: 48,
  /** How many wall segments the broken gate leaves out: two, so it can be used. */
  gateSegments: 2,
  dropRadius: 46,
  dropPlugs: 4,
  /** A span is long: laid down, it clears the drop either side of the gate. */
  spanRadius: 96,
  shrine: Object.freeze({ x: 1938, y: 1675 }),
  shrineRadius: 92,
  /** The stretch of wall that rests the mind, once the span is there. */
  restRadius: 130,
  /** The point on the city street the gate faces (the street's own sample). */
  road: Object.freeze({ x: 1877, y: 1396 }),
});

/** Where the ring is broken, and which way the gate faces the street. */
export function asuraGate() {
  const angle = Math.atan2(ASURA.road.y - ASURA.plaza.y, ASURA.road.x - ASURA.plaza.x);
  return {
    angle,
    x: ASURA.plaza.x + Math.cos(angle) * ASURA.ring,
    y: ASURA.plaza.y + Math.sin(angle) * ASURA.ring,
  };
}

/** Seeded dressing keeps off the plaza, its ring and its gate. */
export const ASURA_KEEPOUTS = Object.freeze([
  Object.freeze({ x: ASURA.plaza.x, y: ASURA.plaza.y, r: ASURA.ring + 150 }),
]);

/** The asura's way: the street → the broken gate → the shrine. Kept clear of trunks. */
export const ASURA_APPROACH = Object.freeze([
  Object.freeze([ASURA.road.x, ASURA.road.y]),
  Object.freeze([ASURA.plaza.x + 60, ASURA.plaza.y - 130]),
  Object.freeze([ASURA.plaza.x, ASURA.plaza.y]),
]);

/**
 * The feeding ground (docs/animal-lives-story.md story table, "หมูป่า — ขุดดินหา
 * รากอาหาร · ใช้กำลังพร้อมสังเกตชีวิตใต้พื้น").
 *
 * A ring of packed earth seals a patch of ground where four roots grow — and one
 * of the four has a colony of small lives living under it. Only the boar roots
 * through the ring (`mound` is solid to every body until a life opens it), and
 * only the boar is heavy enough to tear a root patch open. It must eat three of
 * the four, so the safe way always exists; whether it finds it is the awareness
 * the story asks for — a boar that sniffs the soil first (`prompt.sniffSoil`)
 * knows which patch is a roof and which is only a roof of roots, and the colonies
 * it crushes are lost to every life after it (`state.world.coloniesLost`). The
 * soil it turns when it is done is a gift that keeps giving (`soil-turned`, new
 * roots in every later world).
 */
export const BOAR = Object.freeze({
  /** The wallow the life starts from and closes at. */
  wallow: Object.freeze({ x: 3600, y: 2620 }),
  wallowRadius: 96,
  /** The sealed feeding ground. */
  feed: Object.freeze({ x: 3900, y: 2440 }),
  ring: 170,
  segments: 14,
  moundRadius: 44,
  /**
   * The root patches, close to the middle: four in every world, and one of them a
   * colony's roof. They sit well inside the ring so that a boar at the ring is out
   * of rooting reach of them — which is what makes *looking* at the ground before
   * rooting it a real step (`TELL_RANGE`).
   */
  patches: Object.freeze([
    Object.freeze({ x: 3860, y: 2410 }),
    Object.freeze({ x: 3945, y: 2415 }),
    Object.freeze({ x: 3930, y: 2485 }),
    Object.freeze({ x: 3865, y: 2480 }),
  ]),
  patchRadius: 34,
  /** The boar must eat this many of them: with a colony under one, that is one more than safe. */
  need: 3,
});

/** Seeded dressing keeps off the feed, the ring and the wallow. */
export const BOAR_KEEPOUTS = Object.freeze([
  Object.freeze({ x: BOAR.feed.x, y: BOAR.feed.y, r: BOAR.ring + 170 }),
  Object.freeze({ x: BOAR.wallow.x, y: BOAR.wallow.y, r: 200 }),
]);

/** The boar's errand: the road side → the wallow → the ring → the feeding ground. */
export const BOAR_APPROACH = Object.freeze([
  Object.freeze([3760, 2020]),
  Object.freeze([3640, 2320]),
  Object.freeze([BOAR.wallow.x, BOAR.wallow.y]),
  Object.freeze([BOAR.feed.x, BOAR.feed.y]),
]);

/**
 * The ford (docs/animal-lives-story.md story table, ch.11 "ควาย — ลุยโคลนและลากไม้ ·
 * ความร่วมมือและความอดทน").
 *
 * A mud flat in the eastern forest, a fallen log lying on the near side, and the
 * far pasture walled by a chasm: a leap's width for anyone with the legs for it,
 * and a wall for everyone else. The buffalo is the one body that wades the mud at
 * full pace (`wade`, systems/terrain.js) and the one that can *drag* the log
 * across — the first life that moves a thing to change the shape of the map, and
 * the first whose bridge stands for every life after it (`ford-bridged`,
 * `state.world.planks`).
 */
export const FORD = Object.freeze({
  /** The mud flat, on the near side (clear of the road, which runs north of it). */
  mud: Object.freeze({ x: 3260, y: 1900 }),
  mudRadius: 200,
  /** The fallen log the buffalo hauls. */
  log: Object.freeze({ x: 3300, y: 1860 }),
  logRadius: 70,
  /** The far pasture, ringed by the chasm. */
  pasture: Object.freeze({ x: 3500, y: 2000 }),
  pastureRadius: 110,
  ring: 170,
  segments: 22,
  chasmRadius: 44,
  /** A log is long: laid across, it clears the chasm either side of where it lands. */
  plankRadius: 92,
});

/** Where the ring of chasm faces the log: the span a dragged log bridges. */
export function fordBridge() {
  const angle = Math.atan2(FORD.log.y - FORD.pasture.y, FORD.log.x - FORD.pasture.x);
  return {
    x: FORD.pasture.x + Math.cos(angle) * FORD.ring,
    y: FORD.pasture.y + Math.sin(angle) * FORD.ring,
  };
}

/** Seeded dressing keeps off the mud, the log, the chasm ring and the pasture. */
export const FORD_KEEPOUTS = Object.freeze([
  Object.freeze({ x: FORD.mud.x, y: FORD.mud.y, r: FORD.mudRadius + 90 }),
  Object.freeze({ x: FORD.log.x, y: FORD.log.y, r: 150 }),
  Object.freeze({ x: FORD.pasture.x, y: FORD.pasture.y, r: FORD.ring + 160 }),
]);

/** The buffalo's errand: the road → the mud → the log → the pasture. */
export const FORD_APPROACH = Object.freeze([
  Object.freeze([3420, 1500]),
  Object.freeze([3320, 1700]),
  Object.freeze([FORD.mud.x, FORD.mud.y]),
  Object.freeze([FORD.log.x, FORD.log.y]),
  Object.freeze([FORD.pasture.x, FORD.pasture.y]),
]);

/**
 * The homes the cat peers at (docs/animal-lives-story.md reserve table, "แมว —
 * ทรงตัวบนกำแพงและฟังเสียงเล็ก · ความอยากรู้อยากเห็นกับการเคารพพื้นที่ผู้อื่น").
 *
 * Three homes other lives have built in this forest — the rabbit's warren, the
 * bee's hive, the marsh where the frog spawns — with a low wall beside each. The
 * wall is the whole point: the cat climbs it and looks in from above
 * (`cling`, gated in game/cat.js) rather than walking in, and whether it looks or
 * rummages at all three is what it leaves behind for every life that follows
 * (`hearths-respected`).
 */
export const HOMES = Object.freeze([
  Object.freeze({ id: 'warren', x: 860, y: 2560, wall: Object.freeze({ x: 930, y: 2600 }) }),
  Object.freeze({ id: 'hive', x: 1260, y: 1700, wall: Object.freeze({ x: 1330, y: 1650 }) }),
  Object.freeze({ id: 'marsh', x: 2620, y: 2260, wall: Object.freeze({ x: 2560, y: 2210 }) }),
]);

/** The warm stone the cat's life ends on: the ledge it always comes back to. */
export const WARM_STONE = Object.freeze({ x: 900, y: 1500 });

export const HOME_WALL_RADIUS = 44;
export const HOME_SIGHT = 150;
export const WARM_STONE_RADIUS = 92;
export const HEARTH_RADIUS = 120;

/** Seeded dressing keeps off the three walls and the warm stone. */
export const HOMES_KEEPOUTS = Object.freeze([
  ...HOMES.map((home) => Object.freeze({ x: home.wall.x, y: home.wall.y, r: 150 })),
  Object.freeze({ x: WARM_STONE.x, y: WARM_STONE.y, r: 150 }),
]);

/** The cat's round: the warm stone → each wall → back to the stone. */
export const HOMES_APPROACH = Object.freeze([
  Object.freeze([WARM_STONE.x, WARM_STONE.y]),
  ...HOMES.map((home) => Object.freeze([home.wall.x, home.wall.y])),
]);

/**
 * The bee's flowers, hive and far meadow (docs/animal-lives-story.md reserve
 * table, "ผึ้ง — เชื่อมดอกไม้หลายจุด · งานเล็กของแต่ละตัวส่งผลต่อทั้งป่า").
 *
 * A chain of flowers runs from the hive to a meadow across the forest, and each
 * one is within a comfortable flight of the last (`flightRange`): so the way to
 * the far field is not a wall to break but a *series of hops* — the first route in
 * the game that is about reach rather than about tools. Nothing is lost by flying
 * back and starting a hop again, and the meadow is where the life's one question
 * is asked: leave the pollen in the far field, or carry every grain home.
 */
export const BLOOMS = Object.freeze({
  hive: Object.freeze({ x: 1260, y: 1700 }),
  flowers: Object.freeze([
    Object.freeze({ x: 1500, y: 1700 }),
    Object.freeze({ x: 1700, y: 1640 }),
    Object.freeze({ x: 1980, y: 1600 }),
    Object.freeze({ x: 2230, y: 1690 }),
    Object.freeze({ x: 2480, y: 1750 }),
    Object.freeze({ x: 2720, y: 1760 }),
    Object.freeze({ x: 2960, y: 1820 }),
  ]),
  meadow: Object.freeze({ x: 3180, y: 1880 }),
  flightRange: 420,
  bloomRadius: 74,
  hiveRadius: 96,
  meadowRadius: 104,
});

/** Seeded dressing keeps off the hive, the flowers and the meadow. */
export const BLOOMS_KEEPOUTS = Object.freeze([
  Object.freeze({ x: BLOOMS.hive.x, y: BLOOMS.hive.y, r: 170 }),
  ...BLOOMS.flowers.map((flower) => Object.freeze({ x: flower.x, y: flower.y, r: 120 })),
  Object.freeze({ x: BLOOMS.meadow.x, y: BLOOMS.meadow.y, r: 170 }),
]);

/** The bee's errand: the hive → each flower in turn → the meadow → home. */
export const BLOOMS_APPROACH = Object.freeze([
  ...BLOOMS.flowers.map((flower) => Object.freeze([flower.x, flower.y])),
  Object.freeze([BLOOMS.meadow.x, BLOOMS.meadow.y]),
  Object.freeze([BLOOMS.hive.x, BLOOMS.hive.y]),
]);

/**
 * The otter's holt (docs/animal-lives-story.md reserve table, "นาก — ว่ายน้ำและ
 * ช่วยจับของลอย · การเล่นร่วมกับการดูแลกัน").
 *
 * A burrow on the river's bank, where the life ends and its one question is asked:
 * give what the current carried back to the river, or keep it. Cut into the east
 * bank of the bend, out of the way of everything else.
 */
export const OTTER = Object.freeze({
  holt: Object.freeze({ x: 1650, y: 2200 }),
  holtRadius: 96,
});

/** Seeded dressing keeps off the holt and the water in front of it. */
export const OTTER_KEEPOUTS = Object.freeze([
  Object.freeze({ x: OTTER.holt.x, y: OTTER.holt.y, r: 200 }),
]);

/**
 * The flooded channel and the crab's pools (docs/animal-lives-story.md reserve
 * table, "ปู — รักษาที่อยู่ท่ามกลางน้ำขึ้นลง").
 *
 * The spawning pool on the far bank sits inside a wall of stone whose only way in
 * is a channel the river runs through. At high water the channel is deep — a
 * swimmer goes through and nothing else does; at low water anyone can wade across
 * (systems/tide.js, and `crossCauseway` in systems/worldgen.js). So this is the
 * game's first passage that opens and closes with a world rhythm, and the first one
 * a past life can leave shallow for good (`channel-kept`).
 *
 * The sand bar is scenery and the way in: it is what the water covers at high tide.
 */
export const TIDE = Object.freeze({
  /** The sand bar across the river bend: the way in, and the crab's approach. */
  causeway: Object.freeze([
    Object.freeze([1650, 950]),
    Object.freeze([1200, 950]),
  ]),
  causewayRadius: 46,
  /** The spawning pool on the far bank, sealed by stone and one channel. */
  farPool: Object.freeze({ x: 1000, y: 950 }),
  ring: 190,
  segments: 22,
  wallRadius: 44,
  floodRadius: 40,
  floodPlugs: 5,
  /** The crab's home pool, on the near bank — where the life ends. */
  home: Object.freeze({ x: 1800, y: 900 }),
  homeRadius: 92,
  poolRadius: 96,
});

/** Seeded dressing keeps off the bar, the ring and both pools. */
export const TIDE_KEEPOUTS = Object.freeze([
  Object.freeze({ x: 1650, y: 950, r: 190 }),
  Object.freeze({ x: 1200, y: 950, r: 190 }),
  Object.freeze({ x: TIDE.farPool.x, y: TIDE.farPool.y, r: 330 }),
  Object.freeze({ x: TIDE.home.x, y: TIDE.home.y, r: 190 }),
]);

/** The crab's errand: the home bank → the bar → the channel → the far pool. */
export const TIDE_APPROACH = Object.freeze([
  Object.freeze([TIDE.home.x, TIDE.home.y]),
  Object.freeze([TIDE.causeway[0][0], TIDE.causeway[0][1]]),
  Object.freeze([TIDE.causeway[1][0], TIDE.causeway[1][1]]),
  Object.freeze([TIDE.farPool.x, TIDE.farPool.y]),
]);

/**
 * The seed trees and the cache (docs/animal-lives-story.md reserve table,
 * "กระรอก — ปีนและกระจายเมล็ด · การสะสมกับการแบ่งปัน").
 *
 * Three crowns stand along the forest road, and their seeds are *inside* the
 * canopy: a body that can climb reaches them, a walker passes underneath and sees
 * nothing to pick (world/rooms.js `canopy`). The cache is an old hollow at the
 * road's side where the squirrel decides what to do with what it has gathered —
 * bury it all in one place, or scatter it where it will grow. Scattering records
 * `seeds-scattered`, and the road the later lives walk carries saplings because of
 * it (`saplingsAlong`).
 */
export const SEEDS = Object.freeze({
  // Placed clear of the roadside beings on purpose: an encounter's prompt takes
  // priority over a crown's, and a seed you cannot reach is not a door.
  canopies: Object.freeze([
    Object.freeze({ x: 1560, y: 1180 }),
    Object.freeze({ x: 2230, y: 900 }),
    Object.freeze({ x: 2900, y: 1180 }),
  ]),
  cache: Object.freeze({ x: 2740, y: 1620 }),
  canopyRadius: 66,
  cacheRadius: 96,
  saplingEvery: 340,
  saplingOffset: 74,
});

/** Seeded dressing keeps off the seed trees and the cache. */
export const SEEDS_KEEPOUTS = Object.freeze([
  ...SEEDS.canopies.map((crown) => Object.freeze({ x: crown.x, y: crown.y, r: 150 })),
  Object.freeze({ x: SEEDS.cache.x, y: SEEDS.cache.y, r: 150 }),
]);

/** The squirrel's errand: the road → the crowns → the cache. Kept clear of trunks. */
export const SEEDS_APPROACH = Object.freeze([
  Object.freeze([1560, 1580]),
  Object.freeze([SEEDS.canopies[0].x, SEEDS.canopies[0].y]),
  Object.freeze([SEEDS.canopies[1].x, SEEDS.canopies[1].y]),
  Object.freeze([SEEDS.canopies[2].x, SEEDS.canopies[2].y]),
  Object.freeze([SEEDS.cache.x, SEEDS.cache.y]),
]);

/**
 * Where the saplings of a scattered seed stand: every so often along this plane's
 * road, a little to one side. One list, read by the renderer that draws them and
 * by the rest rule that lets them shade a body (systems/rest.js).
 */
export function saplingsAlong(biomeId = 'memory-forest') {
  const route = routeForPlane(biomeId);
  const out = [];
  let travelled = 0;
  let side = 1;
  for (let i = 0; i < route.length - 1; i++) {
    const [ax, ay] = route[i];
    const [bx, by] = route[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    if (!len) continue;
    const nx = -dy / len;
    const ny = dx / len;
    for (let d = SEEDS.saplingEvery - (travelled % SEEDS.saplingEvery); d < len; d += SEEDS.saplingEvery) {
      side = -side;
      out.push({
        x: ax + (dx * d) / len + nx * SEEDS.saplingOffset * side,
        y: ay + (dy * d) / len + ny * SEEDS.saplingOffset * side,
      });
    }
    travelled += len;
  }
  return out;
}

/**
 * The dark cave (docs/animal-lives-story.md reserve table, "ค้างคาว — รับรู้โดยไม่
 * พึ่งภาพเพียงอย่างเดียว").
 *
 * A chamber whose darkness is not a tint but a fact (`caveDarkness`): inside it
 * the world is nearly opaque, and only the bat's pulse — or whoever the bat
 * taught — shows what is there. The pup is waiting somewhere inside, and the
 * roost is the way this life ends. Nothing here is a wall: the point is not that
 * the bat cannot enter, but that it cannot *find*.
 */
export const CAVE = Object.freeze({
  center: Object.freeze({ x: 350, y: 2450 }),
  radius: 300,
  roost: Object.freeze({ x: 430, y: 2330 }),
  pup: Object.freeze({ x: 240, y: 2560 }),
  roostRadius: 92,
  pupRadius: 84,
  /** How dark the chamber gets (the ambient is replaced by this inside). */
  darkness: 0.985,
});

/** Is this point inside the dark chamber? */
export function inCave(x, y) {
  return Math.hypot(x - CAVE.center.x, y - CAVE.center.y) < CAVE.radius;
}

/** The darkness of the air at this point — the cave is the dark one. */
export function caveDarkness(x, y) {
  return inCave(x, y) ? CAVE.darkness : null;
}

/** Seeded dressing keeps off the chamber and its two places. */
export const CAVE_KEEPOUTS = Object.freeze([
  Object.freeze({ x: CAVE.center.x, y: CAVE.center.y, r: CAVE.radius + 120 }),
]);

/**
 * The walled enclosure and its gate (docs/animal-lives-story.md reserve table,
 * "จิ้งจก — มองปัญหาจากมุมใหม่").
 *
 * A sheer wall nothing walks over, one gate — and the gate only opens from the
 * inside. So the life is a change of angle: climb the wall, drop into the
 * enclosure, and open the way for every body that cannot climb at all
 * `world/rooms.js#validateGeckoRoute` proves the enclosure is shut to walkers
 * before that and open to them after it.
 */
export const ENCLOSURE = Object.freeze({
  center: Object.freeze({ x: 2150, y: 2680 }),
  ring: 200,
  segments: 24,
  wallRadius: 48,
  refugeRadius: 96,
});

/** Keep seeded dressing out of the walled enclosure and its approach. */
export const ENCLOSURE_KEEPOUTS = Object.freeze([
  Object.freeze({ x: ENCLOSURE.center.x, y: ENCLOSURE.center.y, r: ENCLOSURE.ring + 140 }),
]);

/** The gecko's way: the road → the wall → the gate → the refuge. Kept clear of trunks. */
export const ENCLOSURE_APPROACH = Object.freeze([
  Object.freeze([2820, 1520]),
  Object.freeze([2500, 2050]),
  Object.freeze([2250, 2400]),
  Object.freeze([ENCLOSURE.center.x, ENCLOSURE.center.y]),
]);

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
  drying: Object.freeze({ x: 2820, y: 2140 }),
  refuge: Object.freeze({ x: 2790, y: 1900 }),
  preview: Object.freeze({ x: 2800, y: 1990 }),
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
  runoff: Object.freeze({ x: 1200, y: 1720 }),
  drain: Object.freeze({ x: 1110, y: 1640 }),
  preview: Object.freeze({ x: 1040, y: 1530 }),
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

/** How long a polyline is, in world units. */
export function routeLength(route) {
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    total += Math.hypot(route[i + 1][0] - route[i][0], route[i + 1][1] - route[i][1]);
  }
  return total;
}

/**
 * The point a fraction of the way along a polyline: `0` is the first point,
 * `1` the last. Used by the drifting things the current carries (systems/drift.js)
 * and by anything else that thinks in "how far along the river" rather than x/y.
 */
export function pointAlongRoute(route, fraction) {
  const total = routeLength(route) || 1;
  let target = Math.max(0, Math.min(1, fraction)) * total;
  for (let i = 0; i < route.length - 1; i++) {
    const [ax, ay] = route[i];
    const [bx, by] = route[i + 1];
    const segment = Math.hypot(bx - ax, by - ay);
    if (target <= segment) {
      const t = segment ? target / segment : 0;
      return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t };
    }
    target -= segment;
  }
  const last = route[route.length - 1];
  return { x: last[0], y: last[1] };
}

/** Alternating left/right footprints along any road. */
export function footprintsAlong(route) {
  const foot = [];
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];
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
}

/** The forest road's footprints, precomputed (other planes compute on demand). */
export const FOOT = footprintsAlong(PATH);

/**
 * May a trunk stand here? Every plane's road, the temple, the sala, and every fixed
 * site's keepout and approach are left clear — a trunk must never wall an errand
 * (world/rooms.js#mayPlace holds the same list for seeded dressing).
 */
function treeAllowed(x, y) {
  if (dist(x, y, TEMPLE.x, TEMPLE.y) < TEMPLE.r + 50) return false;
  if (dist(x, y, SALA.x, SALA.y) < 240) return false;
  if (Object.values(ROUTES).some((route) => distToPoly(route, x, y) < 135)) return false;
  if (distToPoly(FALSE_A, x, y) < 92) return false;
  if (distToPoly(FALSE_B, x, y) < 92) return false;
  if (dist(x, y, BURROW_KEEPOUT.x, BURROW_KEEPOUT.y) < BURROW_KEEPOUT.r) return false;
  if (distToPoly(BURROW_APPROACH, x, y) < 84) return false;
  if (dist(x, y, NEST_KEEPOUT.x, NEST_KEEPOUT.y) < NEST_KEEPOUT.r) return false;
  if (distToPoly(NEST_APPROACH, x, y) < 84) return false;
  if (dist(x, y, MARSH_KEEPOUT.x, MARSH_KEEPOUT.y) < MARSH_KEEPOUT.r) return false;
  if (distToPoly(MARSH_APPROACH, x, y) < 84) return false;
  if (dist(x, y, CREVICE_KEEPOUT.x, CREVICE_KEEPOUT.y) < CREVICE_KEEPOUT.r) return false;
  if (distToPoly(CREVICE_APPROACH, x, y) < 84) return false;
  if (FIELD_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r)) return false;
  if (distToPoly(FIELD_APPROACH, x, y) < 84) return false;
  if (OWL_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r)) return false;
  if (GROVE_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r)) return false;
  if (distToPoly(GROVE_APPROACH, x, y) < 84) return false;
  if (TRAIL_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r)) return false;
  if (distToPoly(TRAIL_APPROACH, x, y) < 84) return false;
  if (ENCLOSURE_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r)) return false;
  if (distToPoly(ENCLOSURE_APPROACH, x, y) < 84) return false;
  if (CAVE_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r)) return false;
  if (SEEDS_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r)) return false;
  if (distToPoly(SEEDS_APPROACH, x, y) < 84) return false;
  if (TIDE_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r)) return false;
  if (distToPoly(TIDE_APPROACH, x, y) < 84) return false;
  if (OTTER_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r)) return false;
  if (BLOOMS_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r)) return false;
  if (distToPoly(BLOOMS_APPROACH, x, y) < 84) return false;
  if (HOMES_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r)) return false;
  if (distToPoly(HOMES_APPROACH, x, y) < 84) return false;
  if (FORD_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r)) return false;
  if (distToPoly(FORD_APPROACH, x, y) < 84) return false;
  if (DAMP_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r)) return false;
  if (distToPoly(DAMP_APPROACH, x, y) < 84) return false;
  if (BOAR_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r)) return false;
  if (distToPoly(BOAR_APPROACH, x, y) < 84) return false;
  if (ASURA_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r)) return false;
  if (distToPoly(ASURA_APPROACH, x, y) < 84) return false;
  if (GARDEN_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r)) return false;
  if (distToPoly(GARDEN_APPROACH, x, y) < 84) return false;
  if (MARKET_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r)) return false;
  if (distToPoly(MARKET_APPROACH, x, y) < 84) return false;
  if (WEB_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r)) return false;
  if (distToPoly(WEB_APPROACH, x, y) < 84) return false;
  if (SIGNAL_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r)) return false;
  if (distToPoly(SIGNAL_APPROACH, x, y) < 84) return false;
  if (PUSH_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r)) return false;
  if (distToPoly(PUSH_APPROACH, x, y) < 84) return false;
  return true;
}

/**
 * Trunks stand where nothing else needs to be.
 *
 * The scatter is a **jittered grid**, and each cell's jitter comes from that cell
 * alone. That is deliberate: an earlier version rejection-sampled a running
 * sequence, so adding one site's keepout shifted every trunk after it — which
 * silently walled an errand on the other side of the map (a squirrel's path in
 * chapter one). Here a new keepout can only remove the trunks inside it, and the
 * grid spacing keeps the scatter from crowding itself.
 */
export const TREES = (() => {
  const CELL = 88;
  const JITTER = 22;
  const trees = [];
  const cols = Math.floor(WORLD.w / CELL);
  const rows = Math.floor(WORLD.h / CELL);
  for (let cx = 0; cx < cols; cx++) {
    for (let cy = 0; cy < rows; cy++) {
      const cell = mulberry32(seedFrom(`tree:${cx}:${cy}`));
      const x = cx * CELL + CELL / 2 + (cell() * 2 - 1) * JITTER;
      const y = cy * CELL + CELL / 2 + (cell() * 2 - 1) * JITTER;
      if (!treeAllowed(x, y)) continue;
      // Not every cell: a thin scatter reads better than a plantation.
      if (cell() < 0.34) continue;
      trees.push({ x, y, r: 16 + cell() * 14, c: 52 + cell() * 64, s: cell() });
    }
  }
  return trees;
})();
