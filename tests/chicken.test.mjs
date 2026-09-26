import assert from 'node:assert/strict';

const element = () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {}, contains: () => false },
  addEventListener() {}, appendChild() {}, querySelectorAll: () => [], getContext: () => ({}), setAttribute() {} });
globalThis.document = { hidden: false, querySelector: element, querySelectorAll: () => [], getElementById: element, createElement: element };
globalThis.window = { matchMedia: () => ({ matches: false }), addEventListener() {}, location: { reload() {} } };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };

const { state } = await import('../src/core/state.js');
const { player } = await import('../src/entities/player.js');
const { BURROW } = await import('../src/world/world-data.js');
const { chickenState, resetChicken, updateChicken } = await import('../src/game/burrow.js');
const { getKarma, resetKarma } = await import('../src/systems/karma.js');
const { MODE } = await import('../src/core/constants.js');
const { snapshot, applySaveRuntime } = await import('../src/systems/save.js');

state.lifeMode = true;
state.mode = MODE.WORLD;
state.formId = 'worm';
state.teacher = false;
state.dialogueOpen = false;
state.choiceOpen = false;
resetKarma();
state.world.effects = {};
resetChicken();

player.x = BURROW.mouth.x + 130;
player.y = BURROW.mouth.y;
updateChicken(0.1);
assert(chickenState().patrol > 0, 'the bird patrols while resting');
player.x = BURROW.mouth.x;
updateChicken(2);
assert.equal(chickenState().phase, 'warning', 'the peck is announced before impact');
assert.equal(chickenState().hits, 0);
updateChicken(1.4);
assert.equal(chickenState().phase, 'strike');
assert.equal(chickenState().hits, 1);
assert.equal(player.x, BURROW.mouth.x + 130, 'a hit returns to the last safe point');
assert.equal(getKarma().demerit, 0, 'being hunted is not misconduct');

resetChicken();
player.x = BURROW.mouth.x;
player.y = BURROW.mouth.y;
updateChicken(2);
assert.equal(chickenState().phase, 'warning');
player.x = BURROW.mouth.x + 400;
updateChicken(1);
assert.equal(chickenState().phase, 'rest', 'leaving the encounter clears its pending warning');
player.x = BURROW.mouth.x;
updateChicken(0.1);
assert.equal(chickenState().phase, 'rest', 'returning starts with time to see a fresh warning');
assert.equal(chickenState().hits, 0, 'returning does not inflict an unseen peck');

resetChicken();
player.x = BURROW.mouth.x + 130;
updateChicken(2);
updateChicken(1.4);
assert.equal(chickenState().hits, 0, 'waiting outside the peck ring is safe');

resetChicken();
player.x = BURROW.mouth.x + 130;
player.y = BURROW.mouth.y;
updateChicken(2);
updateChicken(1.4);
assert.equal(chickenState().phase, 'strike');
player.x = BURROW.mouth.x;
updateChicken(0.1);
assert.equal(chickenState().hits, 1, 'entering during a strike is still caught');
updateChicken(0.1);
assert.equal(chickenState().hits, 1, 'one strike counts at most once');

resetChicken();
player.x = BURROW.mouth.x;
updateChicken(2);
const paused = chickenState().time;
state.dialogueOpen = true;
updateChicken(0.5);
assert.equal(chickenState().time, paused, 'dialogue pauses the warning');
state.dialogueOpen = false;
const save = snapshot();
applySaveRuntime(save);
assert.equal(chickenState().phase, 'rest', 'loading a save resets an unfinished peck');

resetChicken();
player.x = BURROW.mouth.x;
player.y = BURROW.mouth.y;
updateChicken(2);
updateChicken(1.4);
assert.deepEqual({ x: player.x, y: player.y }, BURROW.shelter,
  'a player caught without a recent safe point returns to the marked shelter');

state.formId = 'human';
updateChicken(0.1);
assert.equal(chickenState().phase, 'rest', 'the chicken hazard only runs in a worm life');
state.lifeMode = false;
state.explore = { active: true, formId: 'worm', chapter: 1 };
state.teacher = true;
state.formId = 'worm';
player.x = BURROW.shelter.x;
player.y = BURROW.shelter.y;
updateChicken(2);
assert.equal(chickenState().phase, 'warning', 'the animal book can practise the chicken encounter');

state.explore = { active: false };
state.teacher = false;
state.lifeMode = true;
state.world.effects = { 'root-watered': true };
resetChicken();
assert.equal(chickenState().radius, 40, 'a watered root narrows the exposed pecking ground');
player.x = BURROW.mouth.x + 47;
player.y = BURROW.mouth.y;
updateChicken(2);
updateChicken(1.4);
assert.equal(chickenState().hits, 0, 'the cover protects a point that was exposed before');
const wateredSave = snapshot();
applySaveRuntime(wateredSave);
assert.equal(chickenState().radius, 40, 'the causal cover survives saving and loading');
state.world.effects = {};
assert.equal(chickenState().radius, 54, 'without the past effect the original hazard returns');
console.error('CHICKEN TEST OK — warning, safe dodge, checkpoint setback, no karma penalty');
