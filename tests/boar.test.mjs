import assert from 'node:assert/strict';

/*
 * The boar's feeding ground (docs/animal-lives-story.md story table, "หมูป่า —
 * ดุนดินหารากอาหาร · ใช้กำลังพร้อมสังเกตชีวิตใต้พื้น").
 *
 * The game's first barrier that asks an *ethical* question. A ring of packed earth
 * seals four root patches, and one of the four is the roof of a colony of small
 * lives. Only the boar roots the ring open; only the boar tears a patch up; and it
 * must eat three of the four — so the safe way always exists, and whether the boar
 * finds it is exactly the awareness the story asks for: within reach, the ground
 * itself tells which patch is only roots and which one is alive underneath. What
 * it crushes stays crushed for every later life; the soil it turns keeps giving.
 */

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
const { on, emit, EVENTS } = await import('../src/core/events.js');
const { WORLD, TAU } = await import('../src/core/constants.js');
const { dist } = await import('../src/core/math.js');
const { FORMS, mapsFor, isRebirthForm } = await import('../src/content/forms.js');
const { BOAR, TREES } = await import('../src/world/world-data.js');
const {
  assembleRooms, assembleBoar, validateBoarRoute, blockedAt, validateRoute,
  validateSnailRoute, validateBuffaloRoute,
} = await import('../src/world/rooms.js');
const { BIOMES } = await import('../src/content/biomes.js');
const { goalFor, updateLifeGoal } = await import('../src/systems/goals.js');
const { initDynamicWorld, digFeature, dynamicFeatures } = await import('../src/systems/worldgen.js');
const { getKarma, resetKarma } = await import('../src/systems/karma.js');
const { readSave, applySaveRuntime } = await import('../src/systems/save.js');
const { hasEffect, recordEffect } = await import('../src/systems/world-effects.js');
const { candidatesFor, planNextLife } = await import('../src/systems/life-route.js');
const { loadChapter } = await import('../src/game/chapters.js');
const { player } = await import('../src/entities/player.js');
const boar = await import('../src/game/boar.js');

const log = (message) => console.error(`[boar] ${message}`);

// ---- 1. packed earth is solid to every body, and only rooting opens it ----
const sample = { i: 0, site: 'boar', type: 'mound', fixed: true, diggable: true, dug: false, x: 100, y: 100, r: BOAR.moundRadius };
assert.equal(blockedAt([sample], 100, 100, {}), true, 'packed earth stops a walking body');
assert.equal(blockedAt([sample], 100, 100, { strong: true, small: true, climbing: true, leap: true }), true,
  'and strength alone does not pass it: the door is an act, not an ability');
assert.equal(blockedAt([sample], 100, 100, { flying: true }), false, 'only a flying body clears it');
assert.equal(blockedAt([{ ...sample, dug: true }], 100, 100, {}), false, 'and once rooted open it is ground again');
const rootSample = { i: 1, site: 'boar', type: 'root', fixed: true, diggable: true, colony: false, x: 200, y: 200, r: BOAR.patchRadius };
assert.equal(blockedAt([rootSample], 200, 200, {}), false, 'a patch of roots is not a wall to anyone');
assert.equal(digFeature(0), false, 'and nothing that is not diggable can be dug');
assert.equal(BIOMES['memory-forest'].sites.includes('boar'), true, 'the feeding ground belongs to the forest plane');
log('packed earth ok');

// ---- 2. the ring seals, and one rooted mound opens it ----
for (let seed = 1; seed <= 60; seed++) {
  const features = assembleRooms(seed * 7919, 'memory-forest');
  const proof = validateBoarRoute(features);
  assert.equal(proof.sealed, false, `seed ${seed}: the ring seals the food`);
  assert.equal(proof.rooted, true, `seed ${seed}: and one rooted mound opens it`);
  assert.equal(proof.safeWay, true, `seed ${seed}: the safe way always exists`);
  assert.equal(proof.harmPossible, true, `seed ${seed}: and the harm is reachable, not out of the way`);
  assert.equal(proof.freePatches, 3, `seed ${seed}: three colony-free patches, and three are needed`);
  assert.equal(proof.ok, true, `seed ${seed}: the feeding ground is proven`);
  assert.equal(validateRoute(features, 'human').ok, true, `seed ${seed}: the road still walks`);
  assert.equal(validateSnailRoute(features, {}).ok, true, `seed ${seed}: the ridge is untouched`);
  assert.equal(validateBuffaloRoute(features, {}).ok, true, `seed ${seed}: and so is the ford`);
}
log('feeding ground proof ok (60 seeds)');

// ---- 3. the life, played: root in, eat three, face the question, go home ----
state.formId = 'boar';
state.realmId = 'manussa';
state.lifeId = 7;
state.lifeMode = true;
state.mode = 'world';
state.world.effects = {};
state.world.dug = [];
state.world.coloniesLost = [];
resetKarma();
boar.resetBoar();
initDynamicWorld(2);

assert.equal(isRebirthForm(FORMS.find((f) => f.id === 'boar')), true, 'the boar may be reborn');
assert.equal(mapsFor('boar').includes('land'), true, 'and it names a map that carries it');
assert.equal(goalFor().kind, 'boar-root', 'the life is pointed at the food');
assert.equal(boar.readsForage(), true, 'and reads its own forage');
assert.equal(boar.forageReadout().need, 3, 'three roots are the meal');

let completions = 0;
on(EVENTS.LIFE_COMPLETE, () => { completions += 1; });
const { initChoices } = await import('../src/ui/choices.js');
initChoices();

const mounds = () => dynamicFeatures().filter((f) => f.type === 'mound');
const patches = () => dynamicFeatures().filter((f) => f.type === 'root');
const colonyPatch = () => patches().find((f) => f.colony === true);
const freePatches = () => patches().filter((f) => f.colony !== true);
assert.equal(mounds().length, BOAR.segments, 'the ring is whole at the start of a life');
assert.equal(patches().length, 4, 'and four patches grow inside it');

// The way in is shut to a body that is not digging.
assert.equal(blockedAt(dynamicFeatures(), BOAR.feed.x, BOAR.feed.y, {}), false,
  'the middle of the feeding ground is open ground — the ring is the wall, not the food');

// A boar that has not rooted a mound cannot get in (its own crawl, checked on the
// same grid the other site proofs use).
const step = 18;
const cols = Math.ceil(WORLD.w / step);
const rows = Math.ceil(WORLD.h / step);
const index = (c, r) => r * cols + c;
const gridFor = (features) => {
  const grid = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = c * step + step / 2;
    const y = r * step + step / 2;
    let solid = TREES.some((tree) => dist(x, y, tree.x, tree.y) < tree.r + 13);
    if (!solid) solid = blockedAt(features, x, y, {});
    grid[index(c, r)] = solid ? 1 : 0;
  }
  return grid;
};
const reaches = (grid, from, to) => {
  const seen = new Uint8Array(cols * rows);
  const start = { c: Math.floor(from.x / step), r: Math.floor(from.y / step) };
  const goal = { c: Math.floor(to.x / step), r: Math.floor(to.y / step) };
  const near = (cell) => Math.abs(cell.c - goal.c) <= 2 && Math.abs(cell.r - goal.r) <= 2;
  const queue = [start];
  seen[index(start.c, start.r)] = 1;
  while (queue.length) {
    const cell = queue.shift();
    if (near(cell)) return true;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = cell.c + dc;
      const r = cell.r + dr;
      if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
      const i = index(c, r);
      if (grid[i] || seen[i]) continue;
      seen[i] = 1;
      queue.push({ c, r });
    }
  }
  return false;
};
assert.equal(reaches(gridFor(dynamicFeatures()), BOAR.wallow, BOAR.feed), false,
  'with the ring whole, the boar itself cannot reach the food');
assert.equal(reaches(gridFor(dynamicFeatures()), BOAR.wallow, freePatches()[0]), false,
  'nor any of the roots');

// Root a mound open: an act, recorded where the next life can find it.
const mound = mounds()[0];
player.x = mound.x + 40;
player.y = mound.y;
state.interact = null;
boar.updateBoar();
assert(state.interact && state.interact.labelKey === 'prompt.rootMound', 'standing at packed earth offers to root it open');
state.interact.fn();
assert.equal(boar.dugGround().length, 1, 'the opened ground is recorded');
assert.equal(digFeature(0), false, 'and ground already dug cannot be dug again');
assert.equal(reaches(gridFor(dynamicFeatures()), BOAR.wallow, BOAR.feed), true,
  'with one mound opened the boar can walk in');
log('rooting in ok');

// The tell: the ground says which patch is alive under it, and noticing is recorded.
const alive = colonyPatch();
player.x = alive.x;
player.y = alive.y;
state.boar.aware = false;
const tells = boar.groundTells();
assert.equal(tells.some((tell) => tell.x === alive.x && tell.colony === true), true,
  'standing on the colony patch, a boar sees small lives under the ground');
assert.equal(tells.every((tell) => tell.colony === true), false,
  'and sees that the others are only roots');
state.interact = null;
boar.updateBoar();
assert.equal(state.boar.aware, true, 'noticing the life under the ground is remembered');
assert.equal(readSave().boar.aware, true, 'noticing is saved immediately');
assert(getKarma().merit > 0, 'and recorded as mindfulness, not as a score');
log('the tell ok');

// Eat the three safe patches: the life can be completed without harm.
for (const patch of freePatches()) {
  player.x = patch.x;
  player.y = patch.y;
  state.interact = null;
  boar.updateBoar();
  assert(state.interact && state.interact.labelKey === 'prompt.rootSoil', 'a patch offers to be rooted up');
  state.interact.fn();
}
assert.equal(boar.eatenCount(), 3, 'three roots eaten');
assert.equal(readSave().boar.eaten, 3, 'eating is saved before the wallow');
boar.resetBoar();
applySaveRuntime(readSave());
assert.equal(boar.eatenCount(), 3, 'the meal survives a reload');
assert.equal(boar.hasEaten(), true, 'and the meal is done');
assert.equal(boar.coloniesLost().length, 0, 'with nothing crushed under the ground');
assert.equal(getKarma().demerit, 0, 'and nothing recorded as harm');
assert.equal(goalFor().kind, 'boar-soil', 'the life now points at the soil it opened');
log('clean meal ok');

// The question, then home.
const dugMound = mounds().find((m) => m.dug === true) || mounds()[0];
player.x = dugMound.x + 30;
player.y = dugMound.y;
state.interact = null;
boar.updateBoar();
assert(state.interact && state.interact.labelKey === 'prompt.turnSoil', 'the opened soil can be turned');
state.interact.fn();
emit(EVENTS.CHOICE_PICK, 0); // turn it, so new roots and small lives can live in it
assert.equal(boar.didTend(), true, 'this boar turned the soil');
assert.equal(readSave().boar.tended, true, 'the soil choice is saved before going home');
assert.equal(hasEffect('soil-turned'), true, 'and the world records it');
assert.equal(goalFor().kind, 'wallow', 'the life now points home');
assert.equal(completions, 0, 'and is not over yet');
player.x = BOAR.wallow.x;
player.y = BOAR.wallow.y;
updateLifeGoal();
assert.equal(completions, 1, 'the wallow ends the life');
assert.equal(boar.settleWallow(), true, 'and the wallow remembers the turned soil');
log('home ok');

// ---- 4. turned soil keeps giving, and what was crushed stays crushed ----
const after = assembleBoar(2, { dug: boar.dugGround(), turned: true });
const afterRoots = after.filter((f) => f.type === 'root');
assert.equal(afterRoots.length, 4,
  'every patch the boar ate grows back when the soil was turned, beside the one it left');
assert.equal(afterRoots.filter((f) => f.regrown === true).length, 3,
  'the three eaten roots come back as regrown growth');
assert.equal(afterRoots.filter((f) => f.colony === true).length, 1,
  'and the colony the boar spared is still living under its patch');

// A later boar, in a world where the ring was opened and the soil turned, has a
// whole meal waiting — the same three safe patches.
assert.equal(validateBoarRoute(assembleRooms(2 * 7919, 'memory-forest')).ok, true,
  'the safe way still exists in a fresh world');

// ---- 5. crushing a colony is a loss that stands ----
state.world.effects = {};
state.world.dug = [];
state.world.coloniesLost = [];
resetKarma();
boar.resetBoar();
state.formId = 'boar';
initDynamicWorld(2);
const doomed = colonyPatch();
player.x = doomed.x;
player.y = doomed.y;
state.interact = null;
boar.updateBoar();
state.interact.fn();
assert.equal(boar.coloniesLost().length, 1, 'the colony is lost');
assert.equal(getKarma().demerit > 0, true, 'and recorded as harm');
// Root two more (safe) patches to finish the meal; the loss does not stop the life.
for (const patch of freePatches().slice(0, 2)) {
  player.x = patch.x;
  player.y = patch.y;
  state.interact = null;
  boar.updateBoar();
  state.interact.fn();
}
assert.equal(boar.hasEaten(), true, 'the life can still be completed — harm is recorded, not punished');
const later = assembleBoar(2, { dug: boar.dugGround(), turned: true });
assert.equal(later.filter((f) => f.type === 'root' && f.colony === true).length, 0,
  'and the crushed colony never grows back, however the soil is tended');
assert.equal(later.filter((f) => f.type === 'root').length >= 2, true,
  'while the patches around it do');
log('loss ok');

// ---- 6. a new life arrives on ground that is whole ----
loadChapter(1, { autosave: false });
assert.equal(boar.hasEaten(), false, 'a new life starts unfed');
assert.equal(boar.hasDecided(), false, 'and undecided');
assert.equal(boar.dugGround().length >= 1, true, 'while the ground it opened is still open');
log('new life ok');

// ---- 7. the boar is offered in the chapter pools ----
assert.equal(candidatesFor(2, ['land', 'water']).includes('boar'), true, 'the boar is offered where a heavy body is carried');
let sawBoar = false;
const chapterIds = Array.from({ length: 14 }, (_, i) => i + 1);
let route = { chapter: 1, lifeId: 1, history: [], chapterIds };
for (let i = 0; i < 900; i++) {
  const next = planNextLife(route);
  if (next.formId === 'boar') sawBoar = true;
  route = { ...next, history: [...route.history, next.formId], chapterIds };
}
assert.equal(sawBoar, true, 'the boar is born during a long journey');
log('rebirth ok');

// ---- 8. no trunk stands on the ground the life needs ----
for (const tree of TREES) {
  for (const spot of [BOAR.wallow, BOAR.feed, ...BOAR.patches]) {
    assert(dist(tree.x, tree.y, spot.x, spot.y) > 110, 'no trunk stands on the wallow, the food or a patch');
  }
}
log('ground clear ok');

console.error('BOAR TEST OK — sealed ground, a rooted door, three safe roots of four, and a life under the floor that the ground itself warns you about');
