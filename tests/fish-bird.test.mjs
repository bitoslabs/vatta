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
const { FISH } = await import('../src/world/world-data.js');
const { inWater } = await import('../src/systems/forms.js');
const { fishBirdState, resetFish, resetFishBird, updateFish, updateFishBird } = await import('../src/game/fish.js');
const { getKarma, resetKarma } = await import('../src/systems/karma.js');
const { MODE } = await import('../src/core/constants.js');
const { snapshot, applySaveRuntime, readSave } = await import('../src/systems/save.js');
const { goalFor } = await import('../src/systems/goals.js');
const { CHAPTERS, chapterSpawn } = await import('../src/game/chapters.js');
const { emit, EVENTS } = await import('../src/core/events.js');
const { initChoices } = await import('../src/ui/choices.js');
const { hasEffect, leavingList } = await import('../src/systems/world-effects.js');

state.lifeMode = true;
state.mode = MODE.WORLD;
state.formId = 'fish';
state.teacher = false;
state.dialogueOpen = false;
state.choiceOpen = false;
resetKarma();
resetFishBird();
resetFish();
initChoices();

assert(inWater(FISH.refuge.x, FISH.refuge.y), 'fish starts in water');
assert(inWater(FISH.shallows.x, FISH.shallows.y), 'bird waits at a river bend');
assert(inWater(FISH.pool.x, FISH.pool.y), 'fish goal is downstream in water');
assert(inWater(FISH.shallows.x + 60, FISH.shallows.y),
  'fish can swim around the strike circle while remaining in the river');
const goal = goalFor();
assert.deepEqual({ x: goal.x, y: goal.y }, FISH.pool, 'fish has a distinct downstream destination');
for (const chapter of CHAPTERS) {
  const spawn = chapterSpawn(chapter, { waterBound: true, start: chapter.start });
  assert(Math.hypot(spawn.x - goal.x, spawn.y - goal.y) > goal.r + 300,
    `chapter ${chapter.id}: fish does not finish at birth`);
}

player.x = FISH.shallows.x - 130;
player.y = FISH.shallows.y;
updateFishBird(0.1);
player.x = FISH.shallows.x;
updateFishBird(2.1);
assert.equal(fishBirdState().phase, 'warning', 'a visible warning comes before the peck');
assert.equal(fishBirdState().hits, 0);
updateFishBird(1.4);
assert.equal(fishBirdState().phase, 'strike');
assert.equal(fishBirdState().hits, 1);
assert.equal(player.x, FISH.shallows.x - 130, 'caught fish returns to safe water');
assert.equal(getKarma().demerit, 0, 'being hunted is not misconduct');

resetFishBird();
player.x = FISH.shallows.x;
player.y = FISH.shallows.y;
updateFishBird(2.2);
player.x += 400;
updateFishBird(0.1);
assert.equal(fishBirdState().phase, 'rest', 'leaving clears a pending bird warning');
player.x = FISH.shallows.x;
updateFishBird(0.1);
assert.equal(fishBirdState().hits, 0, 'returning has a fresh warning before a peck');

resetFishBird();
player.x = FISH.shallows.x + 60;
player.y = FISH.shallows.y;
updateFishBird(2.2);
updateFishBird(1.4);
assert.equal(fishBirdState().hits, 0, 'deep water beside the ring is safe');
player.x = FISH.shallows.x;
updateFishBird(0.1);
assert.equal(fishBirdState().hits, 1, 'entering an active peck is caught');
updateFishBird(0.1);
assert.equal(fishBirdState().hits, 1, 'one peck cannot catch twice');

resetFishBird();
player.x = FISH.shallows.x;
player.y = FISH.shallows.y;
updateFishBird(2.2);
const remaining = fishBirdState().time;
state.dialogueOpen = true;
updateFishBird(0.5);
assert.equal(fishBirdState().time, remaining, 'dialogue pauses the bird');
state.dialogueOpen = false;
applySaveRuntime(snapshot());
assert.equal(fishBirdState().phase, 'rest', 'loading restarts the encounter');

resetFishBird();
player.x = FISH.shallows.x;
updateFishBird(2.2);
updateFishBird(1.4);
assert.deepEqual({ x: player.x, y: player.y }, FISH.refuge,
  'without a recent safe point the fish returns to the upstream refuge');

// Guiding fry is optional. Only a later fish inherits the narrower peck area.
resetKarma();
state.world.effects = {};
resetFishBird();
resetFish();
state.interact = null;
player.x = FISH.channel.x;
player.y = FISH.channel.y;
assert(inWater(player.x, player.y), 'the fry choice is within the river');
updateFish();
assert.equal(state.interact?.labelKey, 'prompt.fishChannel', 'fish can inspect the fry');
state.interact.fn();
emit(EVENTS.CHOICE_PICK, 1);
assert.equal(hasEffect('fry-guided'), false, 'swimming on leaves the channel unchanged');
assert.equal(getKarma().merit, 0, 'declining is not counted as help');
assert.equal(readSave().fish.decided, true, 'swimming on is saved as a real choice');
applySaveRuntime(readSave());
state.interact = null;
updateFish();
assert.equal(state.interact, null, 'loading does not ask the same fish to choose again');
resetFish();
state.interact = null;
updateFish();
state.interact.fn();
emit(EVENTS.CHOICE_PICK, 0);
assert.equal(hasEffect('fry-guided'), true, 'guiding the fry records a world effect');
assert.equal(readSave().world.effects['fry-guided'], true, 'guiding the fry saves the effect immediately');
assert.equal(readSave().fish.guided, true, 'the save remembers that this fish guided them');
assert(readSave().karma.merit > 0, 'the same save includes the intention that made the effect');
assert(getKarma().merit > 0, 'the chosen help records its intention');
assert.equal(fishBirdState().radius, 48, 'this life keeps the original hazard');
const leaving = leavingList().find((entry) => entry.code === 'fry-guided');
assert.equal(leaving?.site, 'fish-channel', 'the book points to the actual channel');
assert.equal(leaving?.consequenceKey, 'effect.fryGuided.consequence', 'the book explains the later result');
resetFishBird();
assert.equal(fishBirdState().radius, 48, 'resetting during the same life keeps the original peck');
const sameLifeSave = snapshot();
state.world.effects = {};
applySaveRuntime(sameLifeSave);
assert.equal(fishBirdState().radius, 48, 'reloading the same life does not grant its future cover');
state.lifeId++;
resetFishBird();
assert.equal(fishBirdState().radius, 32, 'a later fish inherits the deeper channel');
const guidedSave = snapshot();
state.world.effects = {};
applySaveRuntime(guidedSave);
assert.equal(fishBirdState().radius, 32, 'the consequence survives saving and loading');

state.formId = 'human';
updateFishBird(0.1);
assert.equal(fishBirdState().phase, 'rest', 'the bird only threatens fish');
state.lifeMode = false;
state.explore = { active: true, formId: 'fish', chapter: 1 };
state.teacher = true;
state.formId = 'fish';
player.x = FISH.shallows.x;
player.y = FISH.shallows.y;
updateFishBird(2.2);
assert.equal(fishBirdState().phase, 'warning', 'the animal book can practise this encounter');

console.error('FISH BIRD TEST OK — destination, warning, dodge, checkpoint, no karma penalty');
