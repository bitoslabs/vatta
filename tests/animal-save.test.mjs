import assert from 'node:assert/strict';

const storage = new Map();
const element = () => ({
  style: {}, dataset: {}, children: [], textContent: '', innerHTML: '',
  classList: { add() {}, remove() {}, contains: () => false, toggle() {} },
  addEventListener() {}, appendChild() {}, querySelectorAll: () => [], getContext: () => ({}), setAttribute() {},
});
const query = () => element();
globalThis.document = { hidden: false, querySelector: query, querySelectorAll: () => [], getElementById: query, createElement: element };
globalThis.window = { matchMedia: () => ({ matches: false }), addEventListener() {}, location: { reload() {} } };
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};
globalThis.performance = { now: () => 0 };

const { state } = await import('../src/core/state.js');
const { saveRun, readSave, applySaveRuntime } = await import('../src/systems/save.js');
const { GROVE, HOMES, OWL } = await import('../src/world/world-data.js');

state.elephant = { lifted: true, crushed: [GROVE.nests[0].id] };
state.boar = { eaten: 2, aware: true, decided: true, tended: false };
state.cat = { visited: [HOMES[0].id], peeked: [HOMES[0].id], rummaged: [], decided: false };
state.tiger = { step: 2, decided: true, avoided: false };
state.owl = { found: { [OWL.lost[0].id]: true }, decided: false, watched: false };
state.buffalo = { hauled: true, decided: true, fetched: true };
state.beetle = { pushed: true, seated: false };
state.spider = { spun: true };
state.gecko = { opened: true };
state.firefly = { signalled: true };
state.garden = { released: true };
state.asuraCity = { decided: true, spanned: false };
state.market = { carried: ['100,200'], takenAt: ['100,200'], touched: true, passed: false };
assert.equal(saveRun(), true, 'the run can be saved');
const saved = readSave();

for (const key of ['elephant', 'boar', 'cat', 'tiger', 'owl', 'buffalo', 'beetle', 'spider', 'gecko', 'firefly', 'garden', 'asuraCity', 'market']) {
  state[key] = null;
}
applySaveRuntime(saved);
assert.deepEqual(state.elephant, saved.elephant, 'the elephant act and damaged nest return');
assert.deepEqual(state.boar, saved.boar, 'boar awareness, food and choice return');
assert.deepEqual(state.cat, saved.cat, 'each cat visit and answer return');
assert.deepEqual(state.tiger, saved.tiger, 'the trail and rival choice return');
assert.deepEqual(state.owl, saved.owl, 'the led animals and night choice return');
assert.deepEqual(state.buffalo, saved.buffalo, 'bridge work and herd choice return');
assert.deepEqual(state.beetle, saved.beetle, 'the beetle act returns');
assert.deepEqual(state.spider, saved.spider, 'the web act returns');
assert.deepEqual(state.gecko, saved.gecko, 'the gate act returns');
assert.deepEqual(state.firefly, saved.firefly, 'the signal returns');
assert.deepEqual(state.garden, saved.garden, 'the garden act returns');
assert.deepEqual(state.asuraCity, saved.asuraCity, 'the city choice returns');
assert.deepEqual(state.market, saved.market, 'the market offers and carried gift return');

const legacy = structuredClone(saved);
for (const key of ['elephant', 'boar', 'cat', 'tiger', 'owl', 'buffalo', 'beetle', 'spider', 'gecko', 'firefly', 'garden', 'asuraCity', 'market']) delete legacy[key];
applySaveRuntime(legacy);
assert.equal(state.boar.eaten, 0, 'older saves start this life with no remembered food');
assert.equal(state.cat.visited.length, 0, 'older saves have no invented cat visits');
assert.equal(state.market.carried.length, 0, 'older saves have no invented market offers');
assert.equal(state.tiger.decided, false, 'older saves have no invented rival choice');

const memory = await import('../src/game/world-memory.js');
const { player } = await import('../src/entities/player.js');
state.mode = 'world';
state.world.bridge = false;
state.world.cleared = false;
state.formId = 'human';
player.x = memory.bridgeSite().x;
player.y = memory.bridgeSite().y;
state.interact = null;
memory.updateWorldMemory();
state.interact.fn();
assert.equal(readSave().world.bridge, true, 'building the bridge is saved immediately');
state.formId = 'fish';
state.interact = null;
memory.updateWorldMemory();
state.interact.fn();
assert.equal(readSave().world.cleared, true, 'clearing the waterway is saved immediately');

const { loadChapter } = await import('../src/game/chapters.js');
const beetle = await import('../src/game/beetle.js');
const { PUSH, seedPoint } = await import('../src/world/world-data.js');
state.formId = 'beetle';
state.lifeMode = true;
state.world.pushes = 2;
state.beetle = { pushed: true, seated: false };
assert.equal(saveRun(), true);
const midLife = readSave();
state.world.pushes = 0;
state.beetle = null;
applySaveRuntime(midLife);
loadChapter(midLife.chapter, { autosave: false, realmId: midLife.realmId });
applySaveRuntime(midLife);
assert.equal(beetle.pushedSteps(), 2, 'title-style resume restores the seed progress');
assert.equal(beetle.hasPushed(), true, 'title-style resume restores this life’s action');
assert.equal(beetle.beetleGoal().x, seedPoint(2).x, 'the resumed goal points to the saved seed position');
assert.equal(state.dynamic.features.some((feature) => feature.site === 'push' && feature.type === 'bigseed' && Math.abs(feature.x - seedPoint(2).x) < PUSH.seedRadius), true,
  'the rebuilt scene places the seed at its saved step');

console.error('ANIMAL SAVE TEST OK — unfinished animal and realm acts survive save/load, with safe legacy defaults');
