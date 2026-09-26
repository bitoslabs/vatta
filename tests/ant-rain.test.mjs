import assert from 'node:assert/strict';

const element = () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {}, contains: () => false },
  addEventListener() {}, appendChild() {}, querySelectorAll: () => [], getContext: () => ({}), setAttribute() {} });
globalThis.document = { hidden: false, querySelector: element, querySelectorAll: () => [], getElementById: element, createElement: element };
globalThis.window = { matchMedia: () => ({ matches: false }), addEventListener() {}, location: { reload() {} } };
const storage = new Map();
globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };

const { state } = await import('../src/core/state.js');
const { player } = await import('../src/entities/player.js');
const { NEST } = await import('../src/world/world-data.js');
const { rainState, resetRain, updateRain } = await import('../src/game/ant.js');
const { getKarma, resetKarma } = await import('../src/systems/karma.js');
const { MODE } = await import('../src/core/constants.js');
const { snapshot, applySaveRuntime, readSave } = await import('../src/systems/save.js');
const { emit, EVENTS } = await import('../src/core/events.js');
const { initChoices } = await import('../src/ui/choices.js');
const ant = await import('../src/game/ant.js');
const { hasEffect, leavingList, recordEffect } = await import('../src/systems/world-effects.js');

state.lifeMode = true;
state.mode = MODE.WORLD;
state.formId = 'ant';
state.teacher = false;
state.dialogueOpen = false;
state.choiceOpen = false;
state.ant = { carrying: true, shared: true };
resetKarma();
state.world.effects = {};
resetRain();
initChoices();

const rain = rainState();
player.x = rain.x - 150;
player.y = rain.y;
updateRain(0.1);
assert.equal(rainState().phase, 'rest');
player.x = rain.x;
updateRain(2.4);
assert.equal(rainState().phase, 'warning', 'rain announces the runoff before it arrives');
assert.equal(rainState().hits, 0);
updateRain(1.5);
assert.equal(rainState().phase, 'flood');
assert.equal(rainState().hits, 1);
assert.equal(player.x, rain.x - 150, 'a swept ant returns to its safe point');
assert.equal(state.ant.carrying, true, 'being swept does not take away the seed');
assert.equal(getKarma().demerit, 0, 'weather is not misconduct');

resetRain();
player.x = rain.x;
player.y = rain.y;
updateRain(2.5);
player.x += 400;
updateRain(0.1);
assert.equal(rainState().phase, 'rest', 'leaving clears a pending rain warning');
player.x = rain.x;
updateRain(0.1);
assert.equal(rainState().hits, 0, 'returning has a fresh warning before runoff');

resetRain();
player.x = rain.x - 150;
player.y = rain.y;
updateRain(2.5);
updateRain(1.5);
assert.equal(rainState().hits, 0, 'waiting outside the channel is safe');
player.x = rain.x;
updateRain(0.1);
assert.equal(rainState().hits, 1, 'stepping into active runoff is caught');
updateRain(0.1);
assert.equal(rainState().hits, 1, 'one flood hits at most once');

resetRain();
player.x = rain.x;
updateRain(2.5);
const remaining = rainState().time;
state.dialogueOpen = true;
updateRain(0.5);
assert.equal(rainState().time, remaining, 'dialogue pauses the warning');
state.dialogueOpen = false;
applySaveRuntime(snapshot());
assert.equal(rainState().phase, 'rest', 'loading resets unfinished rain');

resetRain();
player.x = rain.x;
updateRain(2.5);
updateRain(1.5);
assert.deepEqual({ x: player.x, y: player.y }, NEST.seed,
  'without a recent safe point the ant returns to the seed');

// The drain is an optional act. Its effect belongs to the next ant life.
resetRain();
state.ant = { carrying: true, shared: true, drainDecided: false };
state.interact = null;
player.x = NEST.drain.x;
player.y = NEST.drain.y;
ant.updateAnt();
assert.equal(state.interact?.labelKey, 'prompt.antDrain', 'a carrying ant can inspect the drain');
state.interact.fn();
emit(EVENTS.CHOICE_PICK, 1);
assert.equal(hasEffect('runoff-drained'), false, 'carrying on leaves the channel unchanged');
assert.equal(getKarma().merit, 0, 'declining the drain does not invent generosity');
state.ant.drainDecided = false;
state.interact = null;
ant.updateAnt();
state.interact.fn();
emit(EVENTS.CHOICE_PICK, 0);
assert.equal(hasEffect('runoff-drained'), true, 'opening the drain records a world effect');
assert.equal(readSave().world.effects['runoff-drained'], true, 'the drained channel is saved immediately');
assert.equal(readSave().ant.carrying, true, 'the save keeps the seed in the ant’s care');
assert.equal(readSave().ant.drainDecided, true, 'the drain choice cannot be offered again after loading');
assert.equal(getKarma().merit > 0, true, 'the chosen help records its intention');
assert.equal(rainState().radius, 70, 'the present flood keeps its original radius');
const drainLeaving = leavingList().find((item) => item.code === 'runoff-drained');
assert.equal(drainLeaving?.site, 'drain',
  'the world book points to the channel itself');
assert.equal(drainLeaving?.consequenceKey, 'effect.runoffDrained.consequence',
  'the world book explains the later narrower flood');
resetRain();
assert.equal(rainState().radius, 70, 'resetting during the same life does not grant the future cover');
const sameLifeSave = snapshot();
state.world.effects = {};
applySaveRuntime(sameLifeSave);
assert.equal(rainState().radius, 70, 'reloading the same life keeps its original flood');
state.lifeId++;
resetRain();
assert.equal(rainState().radius, 44, 'the next ant inherits a narrower flood');
const drainedSave = snapshot();
state.world.effects = {};
applySaveRuntime(drainedSave);
assert.equal(rainState().radius, 44, 'the drained channel survives saving and loading');

state.world.effects = {};
state.world.leavings = [];
recordEffect('seed-carried');
resetRain();
assert.equal(rainState().radius, 70, 'the ant that plants the seed does not gain shelter early');
state.lifeId++;
resetRain();
assert.equal(rainState().radius, 58, 'later roots narrow the runoff even without a drain');
const rootedSave = snapshot();
state.world.effects = {};
applySaveRuntime(rootedSave);
assert.equal(rainState().radius, 58, 'root cover survives saving and loading');
recordEffect('runoff-drained');
resetRain();
assert.equal(rainState().radius, 58, 'a drain dug now helps only a later life');
state.lifeId++;
resetRain();
assert.equal(rainState().radius, 36, 'roots and a drained channel combine for later ants');

state.formId = 'human';
updateRain(0.1);
assert.equal(rainState().phase, 'rest', 'rain hazard is specific to the ant life');
state.lifeMode = false;
state.explore = { active: true, formId: 'ant', chapter: 1 };
state.teacher = true;
state.formId = 'ant';
player.x = rain.x;
updateRain(2.5);
assert.equal(rainState().phase, 'warning', 'the animal book can practise the rain encounter');

console.error('ANT RAIN TEST OK — warning, safe dodge, setback, no karma penalty');
