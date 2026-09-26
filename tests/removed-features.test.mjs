import assert from 'node:assert/strict';

const element = () => ({
  style: {}, dataset: {}, children: [], textContent: '', innerHTML: '',
  classList: { add() {}, remove() {}, contains: () => false, toggle() {} },
  addEventListener() {}, appendChild() {}, querySelectorAll: () => [], getContext: () => ({}), setAttribute() {},
});
const query = () => element();
globalThis.document = { hidden: false, querySelector: query, querySelectorAll: () => [], getElementById: query, createElement: element };
globalThis.window = { matchMedia: () => ({ matches: false }), addEventListener() {} };
const storage = new Map();
globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };

const { state } = await import('../src/core/state.js');
const { initDynamicWorld, removeFeature } = await import('../src/systems/worldgen.js');
const { snapshot, saveRun, readSave, applySaveRuntime } = await import('../src/systems/save.js');
const { GROVE } = await import('../src/world/world-data.js');

state.formId = 'elephant';
state.realmId = 'manussa';
state.lifeMode = true;
state.world = { bridge: false, cleared: false, removed: [], crushed: [], snags: [], planks: [], effects: {} };
const first = initDynamicWorld(1);
const log = first.features.find((feature) => feature.site === 'grove' && feature.type === 'log');
assert(log, 'the first world contains the grove log');
assert.equal(removeFeature(log.i), true, 'the log can be lifted');
assert.equal(typeof state.world.removed[0], 'string', 'the removal uses a stable feature key');
const liftedKey = state.world.removed[0];
assert.equal(saveRun(), true, 'the stable removal can be written to a slot');
state.world.removed = [];
applySaveRuntime(readSave());
assert.deepEqual(state.world.removed, [liftedKey], 'the stable removal survives a slot reload');

const key = (feature) => `${feature.site || 'world'}:${feature.type}:${Math.round(feature.x)},${Math.round(feature.y)}`;
state.world.removed = [];
const nextBefore = initDynamicWorld(2).features.map(key);
state.world.removed = [liftedKey];
const nextAfter = initDynamicWorld(2).features.map(key);
assert.deepEqual(nextBefore.filter((entry) => entry !== liftedKey), nextAfter,
  'a new chapter removes only the matching log, never a different feature with the old index');

const legacy = snapshot();
legacy.world.removed = [log.i];
legacy.world.effects = { 'ways-joined': true };
applySaveRuntime(legacy);
assert.deepEqual(state.world.removed, [], 'old numeric indices are discarded rather than applied to a new seed');
assert.equal(initDynamicWorld(2).features.some((feature) => feature.site === 'grove' && feature.type === 'log'), false,
  'the old save still opens the grove using its recorded world effect');

const quickLift = structuredClone(legacy);
quickLift.world.effects = {};
quickLift.world.crushed = [GROVE.nests[0].id];
applySaveRuntime(quickLift);
assert.equal(initDynamicWorld(2).features.some((feature) => feature.site === 'grove' && feature.type === 'log'), false,
  'an old hurried lift also leaves the grove open through its damaged nest');

const oldGate = structuredClone(legacy);
oldGate.world.effects = { 'gate-opened': true, 'ford-bridged': true };
applySaveRuntime(oldGate);
const oldWorld = initDynamicWorld(2).features;
assert.equal(oldWorld.some((feature) => feature.site === 'enclosure' && feature.gate === true), false,
  'an old opened gate stays open');
assert.equal(oldWorld.some((feature) => feature.site === 'ford' && feature.type === 'log'), false,
  'an old ford bridge does not leave its original log behind');

const { updateWorld } = await import('../src/game/world-update.js');
const { player } = await import('../src/entities/player.js');
state.formId = 'asura';
state.lifeMode = false;
state.mode = 'world';
state.story.released = true;
state.dialogueOpen = false;
state.choiceOpen = false;
state.interact = null;
state.world = { bridge: false, cleared: false, removed: [], crushed: [], snags: [], planks: [], effects: {} };
player.x = 1500;
player.y = 1500;
state.dynamic = { seed: 1, features: [{ i: 77, type: 'boulders', x: player.x, y: player.y, r: 40 }], validation: null, attempts: 0 };
updateWorld(0);
assert.equal(state.dynamic.features.some((feature) => feature.i === 77), false, 'the strong body lifts the nearby boulder');
assert.deepEqual(readSave().world.removed, ['world:boulders:1500,1500'], 'the automatic lift saves its stable identity immediately');

console.error('REMOVED FEATURES TEST OK — persistent identity survives new seeds and legacy indices cannot erase unrelated objects');
