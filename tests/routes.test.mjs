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

// ---- 7. what belongs to the road is carried onto this life's road ----
const { anchoredPoint, nearestOnRoute } = await import('../src/world/world-data.js');
const { state } = await import('../src/core/state.js');

// in the forest, nothing moves
assert.deepEqual(anchoredPoint('memory-forest', 2000, 1290), { x: 2000, y: 1290 }, 'the forest keeps its own points exactly');
assert.deepEqual(anchoredPoint(undefined, 10, 20), { x: 10, y: 20 }, 'and so does a life with no plane of its own');

// elsewhere the point lands on that plane's road — and a place that is *on* the
// forest road is somewhere else entirely in the other worlds
const forestOnRoad = PATH[3];
for (const plane of planes) {
  if (plane === 'memory-forest') continue;
  const spot = anchoredPoint(plane, forestOnRoad[0], forestOnRoad[1]);
  assert(distToPoly(ROUTES[plane], spot.x, spot.y) < 1, `${plane}: the anchored point is on the road`);
  // (Some worlds' roads happen to pass near the forest's; what matters is that
  // the point is carried onto *this* world's road, not that it is far away.)
  assert(
    dist(spot.x, spot.y, forestOnRoad[0], forestOnRoad[1]) > 30,
    `${plane}: a place on the forest road is elsewhere in this world`,
  );
}
// projecting past an end stops at the end
const start = ROUTES['asura-city'][0];
const before = nearestOnRoute('asura-city', start[0] - 900, start[1] - 900);
assert(dist(before.x, before.y, start[0], start[1]) < 1, 'a point beyond the start clamps to the start');

// the lures of a greedy life walk the plane's own road
state.formId = 'asura';
state.realmId = 'manussa';
const { currentMapId } = await import('../src/systems/biome.js');
const cityLifeRoute = routeForPlane(currentMapId());
const { getLures, resetLures, takeLure } = await import('../src/game/lures.js');
resetLures();
const asuraLures = getLures();
assert.equal(asuraLures.length, 5, 'five lures');
for (const lure of asuraLures) {
  assert(distToPoly(cityLifeRoute, lure.x, lure.y) < 1, 'every lure is on this life’s city road');
}
// and taking one still works: the plane sync keeps the lure identity
takeLure(asuraLures[0]);
assert.equal(getLures()[0].taken, true, 'taking a lure sticks across a plane sync');
resetLures();

// the guardian and the roadside beings stand on the plane's road too
const { guardianSpot, GUARDIAN } = await import('../src/game/npc.js');
const { encountersHere } = await import('../src/game/npc-encounters.js');
const asuraGuardian = guardianSpot();
assert(distToPoly(cityLifeRoute, asuraGuardian.x, asuraGuardian.y) < 1, 'the guardian stands on this life’s city road');
state.formId = 'human';
const forestGuardian = guardianSpot();
assert.deepEqual(
  { x: forestGuardian.x, y: forestGuardian.y },
  { x: GUARDIAN.x, y: GUARDIAN.y },
  'and on exactly its old spot in the forest',
);
state.formId = 'asura';
const siteIds = new Set(['asura-bridge', 'garden-bloom', 'market-stall', 'river-weir']);
for (const being of encountersHere()) {
  const onRoad = distToPoly(cityLifeRoute, being.x, being.y) < 1;
  assert(onRoad || siteIds.has(being.id), `${being.id} stands on the road (or at a place of its own)`);
}
log('anchored points ok');

// ---- 8. the story and the classroom tour follow the plane too ----
state.formId = 'human';
state.realmId = 'manussa';
const chapter1 = await import('../src/game/story-chapter1.js');
const chapter2 = await import('../src/game/story-chapter2.js');
const teacher = await import('../src/systems/teacher.js');

// the forest keeps every beat exactly where it always was
assert.deepEqual(chapter2.angerSpawn(), { x: 2500, y: 1450 }, 'anger waits on its old spot in the forest');
assert.equal(chapter1.hasLightGateLesson(), true, 'and the forest teaches the light gates');
const forestNotes = teacher.teacherLandmarks();
assert.deepEqual(
  forestNotes.map((note) => note.key),
  ['teacher.note.temple', 'teacher.note.bodhi', 'teacher.note.gate', 'teacher.note.guardian', 'teacher.note.path', 'teacher.note.sala'],
  'the forest tour walks all six landmarks',
);
const forestGuardianNote = forestNotes.find((note) => note.key === 'teacher.note.guardian');
assert.deepEqual(
  { x: forestGuardianNote.x, y: forestGuardianNote.y },
  { x: 2560, y: 1240 },
  'including the guardian where it stood',
);
assert.equal(teacher.tourProgress().total, 6, 'and the tour counts six stops');

// another plane: the forest-lesson disappears, the road-bound stops move onto its road
state.formId = 'asura';
const asuraNotes = teacher.teacherLandmarks();
assert.deepEqual(
  asuraNotes.map((note) => note.key),
  ['teacher.note.temple', 'teacher.note.bodhi', 'teacher.note.guardian', 'teacher.note.path', 'teacher.note.sala'],
  'the forest gate lesson is not taught where there are no forest gates',
);
for (const key of ['teacher.note.temple', 'teacher.note.bodhi', 'teacher.note.sala']) {
  const forestNote = forestNotes.find((note) => note.key === key);
  const asuraNote = asuraNotes.find((note) => note.key === key);
  assert.deepEqual({ x: asuraNote.x, y: asuraNote.y }, { x: forestNote.x, y: forestNote.y },
    `${key} stands in every plane, so it does not move`);
}
for (const key of ['teacher.note.guardian', 'teacher.note.path']) {
  const note = asuraNotes.find((entry) => entry.key === key);
  assert(distToPoly(cityLifeRoute, note.x, note.y) < 1, `${key} stands on the city road`);
}
assert.equal(teacher.tourProgress().total, 5, 'and the tour counts five stops');
assert.equal(teacher.tourTarget().key, 'teacher.note.temple', 'the tour still begins at the temple');
assert.equal(chapter1.hasLightGateLesson(), false, 'and chapter one does not look for forest gates elsewhere');
const asuraAnger = chapter2.angerSpawn();
assert(distToPoly(cityLifeRoute, asuraAnger.x, asuraAnger.y) < 1, 'anger waits on the city road');
assert(dist(asuraAnger.x, asuraAnger.y, 2500, 1450) > 30, 'not on the forest spot it used to hold');
state.formId = 'human';
log('story and tour per plane ok');

console.error('ROUTES TEST OK — every plane lays its own road, and the road\'s beings, lures, story beats and classroom tour move with it');
