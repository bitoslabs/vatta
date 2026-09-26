import assert from 'node:assert/strict';

const element = () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {}, contains: () => false },
  addEventListener() {}, appendChild() {}, querySelectorAll: () => [], getContext: () => ({}), setAttribute() {} });
globalThis.document = { hidden: false, querySelector: element, querySelectorAll: () => [], getElementById: element, createElement: element };
globalThis.window = { matchMedia: () => ({ matches: false }), addEventListener() {}, location: { reload() {} } };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };

const { state } = await import('../src/core/state.js');
const { player } = await import('../src/entities/player.js');
const { MARSH } = await import('../src/world/world-data.js');
const { dryMarshState, resetDryMarsh, updateDryMarsh } = await import('../src/game/frog.js');
const { getKarma, resetKarma } = await import('../src/systems/karma.js');
const { recordEffect, leavingList } = await import('../src/systems/world-effects.js');
const { MODE } = await import('../src/core/constants.js');
const { snapshot, applySaveRuntime } = await import('../src/systems/save.js');

state.lifeMode = true;
state.mode = MODE.WORLD;
state.formId = 'frog';
state.teacher = false;
state.dialogueOpen = false;
state.choiceOpen = false;
resetKarma();
state.world.effects = {};
state.world.leavings = [];
resetDryMarsh();

player.x = MARSH.drying.x;
player.y = MARSH.drying.y - 120;
updateDryMarsh(0.1);
player.y = MARSH.drying.y;
updateDryMarsh(2.3);
assert.equal(dryMarshState().phase, 'warning', 'the patch warns before drying');
assert.equal(dryMarshState().hits, 0);
updateDryMarsh(1.5);
assert.equal(dryMarshState().phase, 'dry');
assert.equal(dryMarshState().hits, 1);
assert.equal(player.y, MARSH.drying.y - 120, 'frog retreats to its recent damp point');
assert.equal(getKarma().demerit, 0, 'drying mud is not misconduct');

resetDryMarsh();
player.x = MARSH.drying.x;
player.y = MARSH.drying.y;
updateDryMarsh(2.4);
player.x += 400;
updateDryMarsh(0.1);
assert.equal(dryMarshState().phase, 'rest', 'leaving clears a pending dry warning');
player.x = MARSH.drying.x;
updateDryMarsh(0.1);
assert.equal(dryMarshState().hits, 0, 'returning has a fresh warning before drying');

resetDryMarsh();
player.x = MARSH.drying.x + 100;
player.y = MARSH.drying.y;
updateDryMarsh(2.4);
updateDryMarsh(1.5);
assert.equal(dryMarshState().hits, 0, 'waiting outside the patch is safe');
player.x = MARSH.drying.x;
updateDryMarsh(0.1);
assert.equal(dryMarshState().hits, 1, 'entering active dry ground is caught');
updateDryMarsh(0.1);
assert.equal(dryMarshState().hits, 1, 'one dry spell causes one setback');

resetDryMarsh();
player.x = MARSH.drying.x;
updateDryMarsh(2.4);
const remaining = dryMarshState().time;
state.dialogueOpen = true;
updateDryMarsh(0.5);
assert.equal(dryMarshState().time, remaining, 'dialogue pauses drying');
state.dialogueOpen = false;
applySaveRuntime(snapshot());
assert.equal(dryMarshState().phase, 'rest', 'loading restarts the dry spell');

resetDryMarsh();
player.x = MARSH.drying.x;
player.y = MARSH.drying.y;
updateDryMarsh(2.4);
updateDryMarsh(1.5);
assert.deepEqual({ x: player.x, y: player.y }, MARSH.refuge,
  'without a recent safe point the frog returns to the marked refuge');

recordEffect('water-opened');
const leaving = leavingList().find((entry) => entry.code === 'water-opened');
assert.equal(leaving.consequenceKey, 'effect.waterOpened.consequence',
  'the world book explains the later damp pool');
resetDryMarsh();
assert.equal(dryMarshState().radius, 72, 'the current frog still faces the original patch');
const sameLifeSave = snapshot();
state.world.effects = {};
applySaveRuntime(sameLifeSave);
assert.equal(dryMarshState().radius, 72, 'reloading this life does not grant future cover');
state.lifeId++;
resetDryMarsh();
assert.equal(dryMarshState().radius, 45, 'a later frog inherits the damp pool');
const laterSave = snapshot();
state.world.effects = {};
applySaveRuntime(laterSave);
assert.equal(dryMarshState().radius, 45, 'the damp pool survives saving and loading');

recordEffect('eggs-shaded');
resetDryMarsh();
assert.equal(dryMarshState().eggsShaded, false, 'this frog does not inherit its own shaded bank');
state.lifeId++;
resetDryMarsh();
assert.equal(dryMarshState().eggsShaded, true, 'a later frog inherits the shaded bank');
player.x = MARSH.drying.x;
player.y = MARSH.drying.y - 120;
updateDryMarsh(0.1);
player.y = MARSH.drying.y;
updateDryMarsh(2.3);
assert.equal(dryMarshState().time, 2.3, 'the inherited bank lengthens the warning');

state.formId = 'human';
updateDryMarsh(0.1);
assert.equal(dryMarshState().phase, 'rest', 'the dry spell only sets back frogs');
state.lifeMode = false;
state.explore = { active: true, formId: 'frog', chapter: 1 };
state.teacher = true;
state.formId = 'frog';
player.x = MARSH.drying.x;
player.y = MARSH.drying.y;
updateDryMarsh(2.4);
assert.equal(dryMarshState().phase, 'warning', 'animal book can practise the marsh');

console.error('FROG DRY TEST OK — warning, dodge, refuge, inherited pool, no karma penalty');
