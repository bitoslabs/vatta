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
const { DEER } = await import('../src/world/world-data.js');
const { deerHazardState, resetDeer, resetDeerHazard, updateDeer, updateDeerHazard } = await import('../src/game/deer.js');
const { getKarma, resetKarma } = await import('../src/systems/karma.js');
const { hasEffect, leavingList } = await import('../src/systems/world-effects.js');
const { MODE } = await import('../src/core/constants.js');
const { snapshot, applySaveRuntime, readSave } = await import('../src/systems/save.js');
const { emit, EVENTS } = await import('../src/core/events.js');
const { initChoices } = await import('../src/ui/choices.js');

state.lifeMode = true;
state.mode = MODE.WORLD;
state.formId = 'deer';
state.teacher = false;
state.dialogueOpen = false;
state.choiceOpen = false;
state.world.effects = {};
state.world.leavings = [];
resetKarma();
resetDeer();
resetDeerHazard();
initChoices();

assert(Math.hypot(DEER.crossing.x - DEER.refuge.x, DEER.crossing.y - DEER.refuge.y) > 310,
  'deer begins outside the predator activation area');
player.x = DEER.crossing.x - 145;
player.y = DEER.crossing.y;
updateDeerHazard(0.1);
player.x = DEER.crossing.x;
updateDeerHazard(2.2);
assert.equal(deerHazardState().phase, 'warning', 'predator warns before rushing');
assert.equal(deerHazardState().hits, 0);
updateDeerHazard(1.5);
assert.equal(deerHazardState().phase, 'rush');
assert.equal(deerHazardState().hits, 1);
assert.equal(player.x, DEER.crossing.x - 145, 'deer returns to a recent safe point');
assert.equal(getKarma().demerit, 0, 'being chased is not misconduct');

resetDeerHazard();
player.x = DEER.crossing.x;
player.y = DEER.crossing.y;
updateDeerHazard(2.3);
player.x += 400;
updateDeerHazard(0.1);
assert.equal(deerHazardState().phase, 'rest', 'leaving clears a pending predator warning');
player.x = DEER.crossing.x;
updateDeerHazard(0.1);
assert.equal(deerHazardState().hits, 0, 'returning has a fresh warning before the rush');

resetDeerHazard();
player.x = DEER.crossing.x - 110;
player.y = DEER.crossing.y;
updateDeerHazard(2.3);
updateDeerHazard(1.5);
assert.equal(deerHazardState().hits, 0, 'waiting beyond the ring is safe');
player.x = DEER.crossing.x;
updateDeerHazard(0.1);
assert.equal(deerHazardState().hits, 1, 'entering during the rush is caught');
updateDeerHazard(0.1);
assert.equal(deerHazardState().hits, 1, 'one rush only catches once');

resetDeerHazard();
player.x = DEER.crossing.x;
updateDeerHazard(2.3);
const remaining = deerHazardState().time;
state.dialogueOpen = true;
updateDeerHazard(0.5);
assert.equal(deerHazardState().time, remaining, 'dialogue pauses the warning');
state.dialogueOpen = false;
applySaveRuntime(snapshot());
assert.equal(deerHazardState().phase, 'rest', 'loading restarts the crossing');

resetDeerHazard();
player.x = DEER.crossing.x;
player.y = DEER.crossing.y;
updateDeerHazard(2.3);
updateDeerHazard(1.5);
assert.deepEqual({ x: player.x, y: player.y }, DEER.refuge,
  'without a recent safe point deer returns to the marked refuge');

resetDeer();
state.interact = null;
player.x = DEER.herd.x;
player.y = DEER.herd.y;
updateDeer();
assert.equal(state.interact?.labelKey, 'prompt.deerHerd', 'deer can consider the herd');
state.interact.fn();
emit(EVENTS.CHOICE_PICK, 1);
assert.equal(hasEffect('herd-sheltered'), false, 'crossing ahead leaves no shared shelter');
assert.equal(getKarma().merit, 0, 'crossing ahead is not counted as generosity');
assert.equal(readSave().deer.decided, true, 'crossing ahead is saved as a real choice');
applySaveRuntime(readSave());
state.interact = null;
updateDeer();
assert.equal(state.interact, null, 'loading does not ask the same deer to choose again');
resetDeer();
state.interact = null;
updateDeer();
state.interact.fn();
emit(EVENTS.CHOICE_PICK, 0);
assert.equal(hasEffect('herd-sheltered'), true, 'waiting records the shared cover');
assert.equal(readSave().world.effects['herd-sheltered'], true, 'waiting for the herd saves the cover immediately');
assert.equal(readSave().deer.waited, true, 'the save remembers this deer waited');
assert(getKarma().merit > 0, 'waiting for another records the intention');
const leaving = leavingList().find((entry) => entry.code === 'herd-sheltered');
assert.equal(leaving?.site, 'deer-herd', 'world book returns to the herd');
assert.equal(leaving?.consequenceKey, 'effect.herdSheltered.consequence',
  'world book explains the later shelter');
resetDeerHazard();
assert.equal(deerHazardState().radius, 80, 'same life retains the exposed crossing');
const sameLifeSave = snapshot();
state.world.effects = {};
applySaveRuntime(sameLifeSave);
assert.equal(deerHazardState().radius, 80, 'reloading the same life does not grant future shelter');
state.lifeId++;
resetDeerHazard();
assert.equal(deerHazardState().radius, 52, 'later deer inherits the shelter');
const laterSave = snapshot();
state.world.effects = {};
applySaveRuntime(laterSave);
assert.equal(deerHazardState().radius, 52, 'the shelter survives saving and loading');

state.formId = 'human';
updateDeerHazard(0.1);
assert.equal(deerHazardState().phase, 'rest', 'predator is specific to deer');
state.lifeMode = false;
state.explore = { active: true, formId: 'deer', chapter: 1 };
state.teacher = true;
state.formId = 'deer';
player.x = DEER.crossing.x;
player.y = DEER.crossing.y;
updateDeerHazard(2.3);
assert.equal(deerHazardState().phase, 'warning', 'animal book can practise the crossing');

console.error('DEER CROSSING TEST OK — warning, refuge, herd choice, inherited shelter');
