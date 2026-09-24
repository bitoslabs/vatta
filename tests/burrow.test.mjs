import assert from 'node:assert/strict';

/*
 * The soil under the great root (docs/animal-lives-story.md ch.2).
 *
 * The design asks for "a real burrow with a verifiable exit": the chamber must
 * be reachable by the body whose map it is, and provably unreachable for a body
 * that cannot tunnel. These tests hold that line, and hold the world effect the
 * burrow leaves behind for the next life.
 */

// A minimal DOM so the modules that touch the page can be imported in Node.
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
const query = (id) => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); };
globalThis.document = { hidden: false, querySelector: query, querySelectorAll: () => [], getElementById: (id) => query(`#${id}`), createElement: element };
globalThis.window = { matchMedia: () => ({ matches: false }), addEventListener() {}, location: { reload() {} } };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.performance = { now: () => 0 };

const { state } = await import('../src/core/state.js');
const { FORMS, mapsFor, isRebirthForm } = await import('../src/content/forms.js');
const {
  assembleRooms, assembleBurrow, validateRoute, validateBurrowExit, blockedAt, BURROW_FEATURE_TYPES,
} = await import('../src/world/rooms.js');
const { BURROW } = await import('../src/world/world-data.js');
const { BIOMES } = await import('../src/content/biomes.js');
const { canBurrow } = await import('../src/systems/forms.js');
const { currentBiomeId } = await import('../src/systems/biome.js');
const { goalFor, updateLifeGoal } = await import('../src/systems/goals.js');
const { initDynamicWorld, worldAbilities, dynamicBlocked, removeFeature } = await import('../src/systems/worldgen.js');
const { waterRoot, rootWatered } = await import('../src/game/burrow.js');
const { hasEffect, recordEffect, listEffects, sanitiseEffects, worldEffects } = await import('../src/systems/world-effects.js');
const { candidatesFor, planNextLife } = await import('../src/systems/life-route.js');
const { player } = await import('../src/entities/player.js');
const { getKarma } = await import('../src/systems/karma.js');
const { PLAYER } = await import('../src/core/constants.js');

const log = (message) => console.error(`[burrow] ${message}`);

// ---- 1. the chamber is assembled from fixed geometry, not from a seed ----
const underRoot = assembleRooms(4242, 'under-root');
const walls = underRoot.filter((feature) => feature.type === 'rootwall' && feature.site === 'burrow');
const plugs = underRoot.filter((feature) => feature.type === 'burrow' && feature.site === 'burrow');
assert.equal(walls.length, BURROW.walls, 'the root ring has its full set of walls');
assert(plugs.length >= 3, 'the mouth is plugged with overlapping soft soil');
assert(plugs.every((plug) => plug.fixed), 'the soil is fixed: strength cannot lift the world shape');
assert(BURROW_FEATURE_TYPES.includes('rootwall') && BURROW_FEATURE_TYPES.includes('burrow'), 'the soil kinds are declared');

// seeded dressing never crowds the chamber
for (const feature of underRoot) {
  if (feature.fixed) continue;
  const distance = Math.hypot(feature.x - BURROW.chamber.x, feature.y - BURROW.chamber.y);
  assert(distance > BURROW.ring, `seeded ${feature.type} stays out of the chamber`);
}

// only the tunnelling plane carries it
assert(BIOMES['under-root'].site === 'burrow', 'the soil is the plane that carries the burrow');
for (const id of Object.keys(BIOMES)) {
  if (id === 'under-root') continue;
  // The forest plane has its own fixed site (the marsh — tests/frog.test.mjs);
  // every other plane is pure seed dressing.
  if (id === 'memory-forest') continue;
  assert(assembleRooms(4242, id).every((feature) => !feature.fixed), `${id} has no root chamber`);
}
for (const feature of assembleRooms(4242, 'under-root').filter((f) => f.fixed)) {
  assert(feature.type === 'rootwall' || feature.type === 'burrow' || feature.type === 'crack',
    `the soil only carries soil sites (saw ${feature.type})`);
}
log('assembly ok');

// ---- 2. the exit is verifiable: tunnels reach it, walking bodies cannot ----
for (let seed = 1; seed <= 60; seed++) {
  const features = assembleRooms(seed * 7919, 'under-root');
  const proof = validateBurrowExit(features, {});
  assert.equal(proof.burrowReaches, true, `seed ${seed}: a tunnelling body reaches the seed`);
  assert.equal(proof.walkerReaches, false, `seed ${seed}: a walking body cannot`);
  assert.equal(proof.ok, true, `seed ${seed}: the burrow is proven`);
  // small, climbing and strong bodies are still not tunnellers
  const strong = validateBurrowExit(features, { climbing: true, small: true, strong: true });
  assert.equal(strong.walkerReaches, false, `seed ${seed}: other tools do not open the root`);
  // and the ordinary road is still walkable for the tunnelling body
  assert.equal(validateRoute(features, 'worm').ok, true, `seed ${seed}: the road still reaches the far end`);
  assert.equal(validateRoute(features, 'human').ok, true, `seed ${seed}: and for a walker too`);
}
log('exit proof ok (60 seeds)');

// ---- 3. soft soil is a door only for a body that tunnels ----
const soil = assembleBurrow().filter((feature) => feature.type === 'burrow');
const plug = soil[(soil.length / 2) | 0];
assert.equal(blockedAt([plug], plug.x, plug.y, { burrow: true }), false, 'a tunnelling body passes the soil');
assert.equal(blockedAt([plug], plug.x, plug.y, {}), true, 'a plain walker is stopped by it');
assert.equal(blockedAt([plug], plug.x, plug.y, { small: true, climbing: true }), true, 'so are small and climbing bodies');
const wall = assembleBurrow().find((feature) => feature.type === 'rootwall');
assert.equal(blockedAt([wall], wall.x, wall.y, { burrow: true }), true, 'hard root stops even the tunneller');
log('soil rules ok');

// ---- 4. the chamber cannot be lifted away by strength ----
state.chapter = 1;
state.formId = 'worm';
state.dynamic = { seed: 0, features: assembleRooms(99, 'under-root'), validation: null, attempts: 0 };
const fixedIndex = state.dynamic.features.find((feature) => feature.fixed).i;
assert.equal(removeFeature(fixedIndex), false, 'strength cannot lift the root');
assert(state.dynamic.features.some((feature) => feature.i === fixedIndex), 'and it is still there');
log('root is fixed ok');

// ---- 5. world effects are recorded once and survive a save ----
worldEffects();
state.world.effects = {};
assert.equal(hasEffect('root-watered'), false, 'nothing is watered yet');
assert.equal(recordEffect('root-watered'), true, 'the first life waters the root');
assert.equal(recordEffect('root-watered'), false, 'the second life cannot claim it again');
assert.equal(hasEffect('root-watered'), true, 'and the world remembers');
assert.equal(recordEffect('not-a-real-effect'), false, 'only known effects exist');
assert.deepEqual(listEffects().map((entry) => entry.code), ['root-watered'], 'the record lists what happened');
assert.deepEqual(sanitiseEffects({ 'root-watered': true, junk: true, 'seed-carried': 'yes' }), { 'root-watered': true }, 'a save cannot invent an effect');
log('effects ok');

// ---- 6. what one life did changes the next life's world ----
state.world.effects = {};
state.formId = 'worm';
initDynamicWorld(2);
const soilFeature = state.dynamic.features.find((feature) => feature.type === 'burrow');
assert(soilFeature, 'the soil is on the tunneller\'s map');
const wormSeed = state.dynamic.seed;
assert.equal(blockedAt(state.dynamic.features, soilFeature.x, soilFeature.y, {}), true, 'hard soil stops a walker');
assert.equal(dynamicBlocked(soilFeature.x, soilFeature.y), false, 'the worm passes its own tunnel');

state.world.effects = { 'root-watered': true };
assert.equal(worldAbilities().burrow, true, 'the root stays watered for the world');
state.formId = 'human';
assert.equal(worldAbilities().burrow, true, 'and the soil is soft even for a body with no tool of its own');
state.formId = 'worm';
initDynamicWorld(2);
assert.equal(state.dynamic.seed, wormSeed, 'the same life rebuilds the same map');
assert.equal(dynamicBlocked(soilFeature.x, soilFeature.y), false, 'and the tunnel it dug is still open');
state.world.effects = {};
initDynamicWorld(2);
assert.equal(dynamicBlocked(soilFeature.x, soilFeature.y), false, 'the tunneller never needed the effect to pass');
assert.equal(blockedAt(state.dynamic.features, soilFeature.x, soilFeature.y, { burrow: false }), true, 'while a tunneller stripped of its tool is stopped');
log('cross-life consequence ok');

// ---- 7. the life's goal is the chamber, and reaching it waters the root ----
state.lifeMode = true;
state.formId = 'worm';
state.world.effects = {};
assert.equal(currentBiomeId(), 'under-root', 'a worm walks the soil');
assert.equal(canBurrow(), true, 'a worm can tunnel');
assert.equal(canBurrow(), true, 'and it is still a worm');
state.formId = 'human';
assert.equal(goalFor().kind, 'land', 'a human life keeps the temple goal');
state.formId = 'worm';
const goal = goalFor();
assert.equal(goal.kind, 'burrow', 'a worm life ends at the burrow');
assert.equal(goal.x, BURROW.chamber.x, 'and the goal is the chamber');
assert.equal(goal.y, BURROW.chamber.y, 'in both axes');
assert.equal(rootWatered(), false, 'not watered yet');
const meritBefore = getKarma().merit;
state.mode = 'world';
player.x = goal.x + goal.r - 5;
player.y = goal.y;
updateLifeGoal();
assert.equal(hasEffect('root-watered'), true, 'standing in the chamber waters the root');
assert(getKarma().merit > meritBefore, 'and the life is remembered as giving');
assert.equal(waterRoot(), false, 'a second life in the same chamber changes nothing');
log('goal ok');

// ---- 8. no body is reborn onto a map that cannot carry it ----
const everyMap = ['land', 'water', 'burrow', 'air'];
const landOnly = candidatesFor(2, ['land']);
assert(!landOnly.includes('fish'), 'no fish is born on a land-only map');
assert(!landOnly.includes('worm'), 'and no worm either');
const withBurrow = candidatesFor(2, ['land', 'burrow']);
assert(withBurrow.includes('worm'), 'the worm is offered once its map is carried');
assert(everyMap.length === 4, 'the four maps are named');

const chapterIds = Array.from({ length: 14 }, (_, i) => i + 1);
let route = { chapter: 1, lifeId: 1, history: ['human'], chapterIds };
let sawWorm = false;
for (let i = 0; i < 140; i++) {
  const next = planNextLife(route);
  const form = FORMS.find((entry) => entry.id === next.formId);
  assert(form, `${next.formId} is a real form`);
  assert.equal(isRebirthForm(form), true, `${next.formId} is allowed to be reborn`);
  assert(!route.history.slice(-2).includes(next.formId), `${next.formId} is not one of the two most recent`);
  assert(mapsFor(next.formId).length > 0, `${next.formId} names the maps that carry it`);
  if (next.formId === 'worm') sawWorm = true;
  route = { ...next, history: [...route.history, next.formId], chapterIds };
}
assert(sawWorm, 'the earthworm really is born during a long journey');

// the lab-only bodies wait for their maps (the ant and the frog left this list
// when their nest and marsh arrived — tests/ant.test.mjs, tests/frog.test.mjs)
for (const id of ['snake', 'rabbit', 'elephant', 'tiger', 'owl']) {
  assert.equal(isRebirthForm(FORMS.find((form) => form.id === id)), false, `${id} waits for its chapter`);
}
// and a motionless walker is still the fallback for every chapter
for (const id of chapterIds) {
  assert(candidatesFor(id, ['land', 'burrow']).length > 0, `chapter ${id} offers at least one body`);
}
log('rebirth gating ok');

console.error('BURROW TEST OK — sealed chamber, verifiable exit, root-watered carried across lives');
