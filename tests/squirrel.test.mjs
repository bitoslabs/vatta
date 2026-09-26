import assert from 'node:assert/strict';

/*
 * The squirrel's seed crowns (docs/animal-lives-story.md reserve table, "กระรอก —
 * ปีนและกระจายเมล็ด · การสะสมกับการแบ่งปัน").
 *
 * The seeds live inside three crowns, where only a climbing body goes, so the
 * gathering is a climb. This is the first life that *accumulates*: three picks,
 * then one decision at the old cache — keep them all in one place, or scatter them
 * so the road the later lives walk grows saplings because of it.
 */

// A minimal DOM: these modules only ask for elements at import time.
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
const storage = new Map();
globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
globalThis.performance = { now: () => 0 };

const { state } = await import('../src/core/state.js');
const { GATE_OUT, WORLD } = await import('../src/core/constants.js');
const { on, emit, EVENTS } = await import('../src/core/events.js');
const { FORMS, mapsFor, isRebirthForm } = await import('../src/content/forms.js');
const { SEEDS, saplingsAlong, routeForPlane, TREES } = await import('../src/world/world-data.js');
const {
  assembleRooms, assembleSeedTrees, validateSquirrelRoute, blockedAt, validateRoute,
} = await import('../src/world/rooms.js');
const { BIOMES } = await import('../src/content/biomes.js');
const { goalFor, updateLifeGoal } = await import('../src/systems/goals.js');
const { initDynamicWorld } = await import('../src/systems/worldgen.js');
const { isRestful, restingPlaceAt } = await import('../src/systems/rest.js');
const { getKarma, resetKarma } = await import('../src/systems/karma.js');
const { readSave, applySaveRuntime } = await import('../src/systems/save.js');
const { hasEffect, worldEffects } = await import('../src/systems/world-effects.js');
const { planNextLife, candidatesFor } = await import('../src/systems/life-route.js');
const { loadChapter } = await import('../src/game/chapters.js');
const { player } = await import('../src/entities/player.js');
const { dist, distToPoly } = await import('../src/core/math.js');
const squirrel = await import('../src/game/squirrel.js');

const log = (message) => console.error(`[squirrel] ${message}`);
const crowns = SEEDS.canopies;

// ---- 1. the crowns are a climbing body's door ----
assert.equal(BIOMES['memory-forest'].sites.includes('seeds'), true, 'the seed trees belong to the forest plane');
const trees = assembleSeedTrees();
assert.equal(trees.length, crowns.length, 'one crown per seed tree');
assert(trees.every((tree) => tree.type === 'canopy' && tree.fixed === true), 'the crowns are fixed geometry');
const crown = trees[0];
assert.equal(blockedAt([crown], crown.x, crown.y, { climbing: true }), false, 'a climbing body gets into the crown');
assert.equal(blockedAt([crown], crown.x, crown.y, {}), true, 'a walker is kept out of it');
assert.equal(blockedAt([crown], crown.x, crown.y, { small: true }), true, 'and being small does not help');
assert.equal(blockedAt([crown], crown.x, crown.y, { flying: true }), false, 'a flyer reaches it too');

for (let s = 1; s <= 60; s++) {
  const features = assembleRooms(s * 7919, 'memory-forest');
  const proof = validateSquirrelRoute(features, {});
  assert.equal(proof.climbReaches, true, `seed ${s}: a climbing body reaches every crown`);
  assert.equal(proof.walkerReaches, false, `seed ${s}: a walker reaches none of them`);
  assert.equal(proof.ok, true, `seed ${s}: the crowns are proven`);
  // the rest of the map must not have moved because of them
  assert.equal(validateRoute(features, 'human').ok, true, `seed ${s}: the road still walks`);
  assert.equal(validateRoute(features, 'squirrel').ok, true, `seed ${s}: and the squirrel's road too`);
}
log('crown proof ok (60 seeds)');

// ---- 2. the gathering: pick, count, three times ----
state.lifeMode = true;
state.formId = 'squirrel';
state.realmId = 'manussa';
resetKarma();
worldEffects();
state.world.effects = {};
squirrel.resetSquirrel();
state.mode = 'world';
state.interact = null;
initDynamicWorld(2);

assert.equal(isRebirthForm(FORMS.find((f) => f.id === 'squirrel')), true, 'the squirrel may be reborn now');
assert.equal(mapsFor('squirrel').includes('land'), true, 'and it names a map that carries it');
assert.equal(squirrel.seedsHeld(), 0, 'a new life starts with empty paws');

let completions = 0;
on(EVENTS.LIFE_COMPLETE, () => { completions += 1; });

assert.equal(goalFor().kind, 'crown', 'the life is first pointed at a crown');
assert.equal(goalFor().x, crowns[0].x, 'the first crown, in x');

const { initChoices } = await import('../src/ui/choices.js');
initChoices();

// a walker under a crown is offered nothing at all
state.formId = 'human';
player.x = crowns[0].x;
player.y = crowns[0].y;
state.interact = null;
squirrel.updateSquirrel();
assert.equal(state.interact, null, 'a body that cannot climb finds nothing up there');
state.formId = 'squirrel';

for (const [index] of crowns.entries()) {
  player.x = crowns[index].x;
  player.y = crowns[index].y;
  state.interact = null;
  squirrel.updateSquirrel();
  assert(state.interact && state.interact.labelKey === 'prompt.gatherSeed', `crown ${index + 1} offers its seed`);
  state.interact.fn();
  assert.equal(squirrel.seedsHeld(), index + 1, `seed ${index + 1} is in the paws`);
  assert.equal(squirrel.crownPicked(index), true, `and crown ${index + 1} is picked`);
  assert.equal(readSave().squirrel.picked.length, index + 1, `crown ${index + 1} is saved`);
  if (index === 0) {
    squirrel.resetSquirrel();
    applySaveRuntime(readSave());
    assert.equal(squirrel.seedsHeld(), 1, 'the gathered seed survives a reload');
    assert.equal(goalFor().x, crowns[1].x, 'the resumed goal is the next crown');
  }
}
assert.equal(squirrel.allPicked(), true, 'all three crowns are empty now');
log('gathering ok');

// ---- 3. scattering: the road grows saplings for everyone ----
assert.equal(goalFor().kind, 'bury', 'with the crowns picked, the cache is where the question is');
player.x = SEEDS.cache.x;
player.y = SEEDS.cache.y;
state.interact = null;
squirrel.updateSquirrel();
assert(state.interact && state.interact.labelKey === 'prompt.burySeeds', 'the cache asks its question');
state.interact.fn();
assert(state.choiceOpen === true, 'the cache asks a question');
emit(EVENTS.CHOICE_PICK, 0); // scatter
// the question was not skipped: nothing completed the life while deciding
assert.equal(completions, 0, 'reaching the cache does not end the life before the answer');
assert.equal(squirrel.didScatter(), true, 'the squirrel scattered them');
assert.equal(hasEffect('seeds-scattered'), true, 'and the world records it');
assert(getKarma().merit > 0, 'scattering is remembered as giving');
const scatteredMerit = getKarma().merit;
assert.equal(readSave().squirrel.scattered, true, 'scattering is saved before the life ends');
squirrel.resetSquirrel();
applySaveRuntime(readSave());
assert.equal(squirrel.didScatter(), true, 'scattering survives a reload');
state.interact = null;
squirrel.updateSquirrel();
assert.equal(state.interact, null, 'the cache does not ask again');
assert.equal(getKarma().merit, scatteredMerit, 'resuming gives no extra merit');
assert.equal(goalFor().kind, 'cache', 'and only now does the cache become the ending');
updateLifeGoal();
assert.equal(completions, 1, 'standing at the cache after deciding completes the life');
log('scattering ok');

// ---- 4. the saplings are real, and they are rest ----
state.formId = 'human';
const saplings = saplingsAlong('memory-forest');
assert(saplings.length > 3, 'a scattered seed leaves saplings along the road');
for (const sapling of saplings) {
  assert(distToPoly(routeForPlane('memory-forest'), sapling.x, sapling.y) < 200, 'each sapling stands beside the road');
}
assert.equal(isRestful(saplings[0].x, saplings[0].y), true, 'a grown sapling shades a body that rests under it');
assert.equal(restingPlaceAt(saplings[0].x, saplings[0].y), 'sapling', 'and it knows which place it is');
state.world.effects = {};
assert.equal(isRestful(saplings[0].x, saplings[0].y), false, 'without the scattering there is no shade');
state.world.effects = { 'seeds-scattered': true };
// every plane grows them, since every plane has a road
for (const plane of Object.keys(BIOMES)) {
  assert(saplingsAlong(plane).length > 0, `${plane} grows saplings along its road`);
}
log('saplings ok');

// ---- 5. hoarding is also a life, and a quieter road ----
resetKarma();
state.world.effects = {};
state.formId = 'squirrel';
squirrel.resetSquirrel();
state.interact = null;
initDynamicWorld(2);
for (const [index] of crowns.entries()) {
  player.x = crowns[index].x;
  player.y = crowns[index].y;
  state.interact = null;
  squirrel.updateSquirrel();
  state.interact.fn();
}
player.x = SEEDS.cache.x;
player.y = SEEDS.cache.y;
state.interact = null;
squirrel.updateSquirrel();
state.interact.fn();
emit(EVENTS.CHOICE_PICK, 1); // hoard
assert.equal(squirrel.didScatter(), false, 'this squirrel kept them all');
assert.equal(hasEffect('seeds-scattered'), false, 'so nothing was scattered');
assert.equal(getKarma().merit, 0, 'and nothing is recorded as giving');
assert(getKarma().tendencies.clinging > 0, 'the holding-on is what it leaves in itself');
const hoardedClinging = getKarma().tendencies.clinging;
assert.equal(readSave().squirrel.decided, true, 'hoarding is saved too');
squirrel.resetSquirrel();
applySaveRuntime(readSave());
assert.equal(squirrel.hasDecided(), true, 'hoarding survives a reload');
assert.equal(squirrel.didScatter(), false, 'the restored choice stays hoarding');
state.interact = null;
squirrel.updateSquirrel();
assert.equal(state.interact, null, 'the hoarding choice is not asked again');
assert.equal(getKarma().tendencies.clinging, hoardedClinging, 'resuming adds no clinging');
assert.equal(goalFor().kind, 'cache', 'the cache still ends the life — the choice is not a punishment');
log('hoarding ok');

// ---- 6. a new life arrives with empty paws ----
loadChapter(1, { autosave: false });
assert.equal(squirrel.seedsHeld(), 0, 'a new chapter (and a new life) starts with nothing gathered');
assert.equal(squirrel.pickedCrowns().length, 0, 'and no crowns picked');

// ---- 7. the squirrel can really walk its errand ----
for (const tree of TREES) {
  for (const spot of [...crowns, SEEDS.cache]) {
    assert(dist(tree.x, tree.y, spot.x, spot.y) > 90, 'no trunk stands on a crown or the cache');
  }
}
state.formId = 'squirrel';
state.lifeMode = true;
state.lifeId = 1;
state.world.effects = {};
state.world.removed = [];
initDynamicWorld(1);
const features = state.dynamic.features;
const step = 18;
const cols = Math.ceil(WORLD.w / step);
const rows = Math.ceil(WORLD.h / step);
const index = (c, r) => r * cols + c;
const build = (abilities) => {
  const blocked = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * step + step / 2;
      const y = r * step + step / 2;
      let solid = false;
      if (!solid) solid = TREES.some((tree) => dist(x, y, tree.x, tree.y) < tree.r + 13);
      if (!solid) solid = blockedAt(features, x, y, abilities);
      blocked[index(c, r)] = solid ? 1 : 0;
    }
  }
  return blocked;
};
const reaches = (blocked, from, to) => {
  const seen = new Uint8Array(cols * rows);
  const start = { c: Math.floor(from.x / step), r: Math.floor(from.y / step) };
  const goal = { c: Math.floor(to.x / step), r: Math.floor(to.y / step) };
  const queue = [start];
  seen[index(start.c, start.r)] = 1;
  while (queue.length) {
    const cell = queue.shift();
    if (cell.c === goal.c && cell.r === goal.r) return true;
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
  return false;
};
// Where a life of this plane actually enters the world. A road point of *another*
// plane is not a place: the city's plaza may legitimately stand there (its keepouts
// are keyed to the plane's own road), so the errand is walked from the temple gate,
// which every plane shares.
const road = { x: GATE_OUT.x, y: GATE_OUT.y };
const climber = build({ climbing: true });
for (const spot of [...crowns, SEEDS.cache]) {
  assert.equal(reaches(climber, road, spot), true, 'the squirrel reaches every part of its errand');
}
log('errand walkable ok');

// ---- 8. the squirrel is offered in the chapter pools ----
assert.equal(candidatesFor(3, ['land']).includes('squirrel'), true, 'the squirrel is offered where a climbing body is carried');
let sawSquirrel = false;
const chapterIds = Array.from({ length: 14 }, (_, i) => i + 1);
let route = { chapter: 1, lifeId: 1, history: [], chapterIds };
for (let i = 0; i < 400; i++) {
  const next = planNextLife(route);
  if (next.formId === 'squirrel') sawSquirrel = true;
  route = { ...next, history: [...route.history, next.formId], chapterIds };
}
assert.equal(sawSquirrel, true, 'the squirrel is born during a long journey');
log('rebirth ok');

console.error('SQUIRREL TEST OK — seeds inside the crowns, three climbs, and a decision that grows trees on the road for everyone');
