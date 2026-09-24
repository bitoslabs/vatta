import assert from 'node:assert/strict';

/*
 * The road belongs to the plane (design §7).
 *
 * The complaint this answers: every life walked the same road through the same
 * forest, however different the world was supposed to be. Now each plane lays its
 * own road — straight under the soil, switchbacked in the woeful planes, square
 * in the asura city, an arc in the light garden, a serpentine in the market, and
 * a single line where there is nothing to hold on to — while all of them still
 * start at the temple gate and end at the sala, so a life's destination never
 * changes, only the way there.
 */

// A minimal DOM: the modules below only ask for elements at import time.
const elements = new Map();
function element() {
  const classes = new Set(['hidden']);
  return {
    style: {}, dataset: {}, children: [], textContent: '', innerHTML: '',
    classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c), toggle() {} },
    addEventListener() {}, appendChild(child) { this.children.push(child); },
    querySelectorAll: () => [], getContext: () => ({}), setAttribute() {},
  };
}
const query = () => element();
globalThis.document = { hidden: false, querySelector: query, querySelectorAll: () => [], getElementById: query, createElement: element };
globalThis.window = { matchMedia: () => ({ matches: false }), addEventListener() {}, location: { reload() {} } };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.performance = { now: () => 0 };

const { GATE_OUT, SALA } = await import('../src/core/constants.js');
const {
  ROUTES, PATH, TREES, routeForPlane, footprintsAlong,
} = await import('../src/world/world-data.js');
const { BIOMES } = await import('../src/content/biomes.js');
const {
  assembleRooms, buildDynamicWorld, validateRoute, isOnRoute, routeFor,
} = await import('../src/world/rooms.js');
const { dist, distToPoly } = await import('../src/core/math.js');

const log = (message) => console.error(`[routes] ${message}`);
const planes = Object.keys(BIOMES);
const endOf = (route) => route[route.length - 1];
const lengthOf = (route) => route.slice(1)
  .reduce((sum, point, i) => sum + dist(point[0], point[1], route[i][0], route[i][1]), 0);

// ---- 1. every plane has a road of its own ----
assert.deepEqual(Object.keys(ROUTES).sort(), planes.slice().sort(), 'every plane in the game has a road');
assert.equal(routeForPlane('memory-forest'), PATH, 'the forest keeps the road it always had');
assert.equal(routeForPlane('not-a-plane'), PATH, 'an unknown plane falls back to the forest road');
assert.equal(routeFor('fish', 'asura-city'), (await import('../src/world/world-data.js')).RIVER,
  'a fish still walks the river, whatever plane the world is in');
log('one road per plane ok');

// ---- 2. the same gate, the same sala, a different way ----
for (const plane of planes) {
  const route = ROUTES[plane];
  assert(route.length >= 2, `${plane} has a road with at least two points`);
  const first = route[0];
  assert(dist(first[0], first[1], GATE_OUT.x, GATE_OUT.y) < 40, `${plane} starts at the temple gate`);
  const last = endOf(route);
  assert(dist(last[0], last[1], endOf(PATH)[0], endOf(PATH)[1]) < 60, `${plane} ends at the sala's door`);
  assert(distToPoly(route, SALA.x, SALA.y) < 260, `${plane} comes close enough to the sala to finish a life`);
}

// distinct shapes, not one road re-labelled
const shapes = new Map();
for (const plane of planes) {
  const route = ROUTES[plane];
  const key = JSON.stringify(route);
  assert(!shapes.has(key), `${plane} does not reuse another plane's road`);
  shapes.set(key, plane);
}
const forestLength = lengthOf(PATH);
assert(lengthOf(ROUTES['under-root']) < forestLength, 'the tunnelled road is shorter than the forest road');
assert(lengthOf(ROUTES.woeful) > forestLength, 'the woeful road doubles back, so it is longer');
assert.equal(ROUTES.formless.length, 2, 'the formless plane has nothing to hold on to: a single line');
assert(ROUTES['light-garden'].length >= 8, 'the garden road is an arc of terraces, not a straight line');
log('roads are different ok');

// ---- 3. the road is walkable, and its dressing never covers it ----
for (const plane of planes) {
  for (let seed = 1; seed <= 8; seed++) {
    const features = assembleRooms(seed * 7919, plane);
    const proof = validateRoute(features, 'human', {}, plane);
    assert.equal(proof.ok, true, `seed ${seed}: ${plane} is walkable`);
    // dressing sits beside the road, never on it — except the river's silt, which
    // is *meant* to fall across a route so the seed checker has to catch it
    // (world/rooms.js marks it `silt`; that is why buildDynamicWorld retries).
    for (const feature of features) {
      if (feature.site) continue; // the fixed sites are geometry, not dressing
      if (feature.silt) continue;
      assert(
        distToPoly(ROUTES[plane], feature.x, feature.y) > feature.r,
        `${plane}: a ${feature.type} does not sit on the road`,
      );
    }
    // and the whole build agrees
    const built = buildDynamicWorld(seed * 104729, 'human', {}, plane);
    assert.equal(built.validation.ok, true, `seed ${seed}: ${plane} builds a walkable world`);
  }
}
log('walkable, dressing beside the road ok');

// ---- 4. no tree stands on any plane's road ----
for (const plane of planes) {
  for (const tree of TREES) {
    assert(
      distToPoly(ROUTES[plane], tree.x, tree.y) > 100,
      `no trunk walls the ${plane} road`,
    );
  }
}
log('trunks off every road ok');

// ---- 5. "on the road" means the plane's road, and full speed follows it ----
const cityCorner = ROUTES['asura-city'][3]; // a square corner of the city streets
const forestPoint = PATH[3];
assert.equal(isOnRoute(cityCorner[0], cityCorner[1], 'asura-city'), true, 'the city corner counts as the way in the city');
assert.equal(isOnRoute(cityCorner[0], cityCorner[1], 'memory-forest'), false, 'and not in the forest');
assert.equal(isOnRoute(forestPoint[0], forestPoint[1], 'memory-forest'), true, 'the forest road counts as the way there');
assert.equal(isOnRoute(forestPoint[0], forestPoint[1], 'asura-city'), false, 'and not in the city');
assert.equal(isOnRoute(0, 0, 'memory-forest'), false, 'off the road is off the road');
log('on-road per plane ok');

// ---- 6. footprints follow whichever road is being walked ----
const forestFoot = footprintsAlong(PATH);
assert.equal(forestFoot.length > 40, true, 'the forest road is marked all along');
const woefulFoot = footprintsAlong(ROUTES.woeful);
const formlessFoot = footprintsAlong(ROUTES.formless);
assert(woefulFoot.length > forestFoot.length, 'a longer road carries more footprints');
assert(formlessFoot.length > 0 && formlessFoot.length < woefulFoot.length, 'the formless line is marked, but barely');
for (const foot of woefulFoot) {
  assert(distToPoly(ROUTES.woeful, foot.x, foot.y) < 30, 'every footprint lies on its own road');
}
log('footprints ok');

console.error('ROUTES TEST OK — every plane lays its own road, same gate and same sala, and no trunk or dressing covers it');
