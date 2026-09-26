import assert from 'node:assert/strict';

/*
 * The bat's cave (docs/animal-lives-story.md reserve table, "ค้างคาว — รับรู้โดยไม่
 * พึ่งภาพเพียงอย่างเดียว").
 *
 * The first mechanic in the game where perceiving is something a body *does*: the
 * chamber is dark as a fact, the pup inside cannot be seen, and only a pulse (F)
 * shows what lies within earshot. This suite holds the three promises that makes:
 * darkness is a property of the place, perception is a property of the pulse, and
 * what the bat teaches, everyone who comes after can do.
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
const { on, emit, EVENTS } = await import('../src/core/events.js');
const { GATE_OUT, PLAYER, WORLD } = await import('../src/core/constants.js');
const { FORMS, mapsFor, isRebirthForm } = await import('../src/content/forms.js');
const { CAVE, inCave, caveDarkness } = await import('../src/world/world-data.js');
const { blockedAt } = await import('../src/world/rooms.js');
const { TREES } = await import('../src/world/world-data.js');
const { distToPoly, dist } = await import('../src/core/math.js');
const { ROUTES } = await import('../src/world/world-data.js');
const { goalFor, updateLifeGoal } = await import('../src/systems/goals.js');
const { initDynamicWorld } = await import('../src/systems/worldgen.js');
const { getKarma, resetKarma } = await import('../src/systems/karma.js');
const { readSave, applySaveRuntime } = await import('../src/systems/save.js');
const { hasEffect, worldEffects } = await import('../src/systems/world-effects.js');
const { visionRadius } = await import('../src/systems/vision.js');
const echo = await import('../src/systems/echo.js');
const { planNextLife } = await import('../src/systems/life-route.js');
const { loadChapter } = await import('../src/game/chapters.js');
const { player } = await import('../src/entities/player.js');
const bat = await import('../src/game/bat.js');

const log = (message) => console.error(`[bat] ${message}`);

// ---- 1. the darkness is a fact about the place, not a tint ----
assert.equal(inCave(CAVE.center.x, CAVE.center.y), true, 'the chamber is a place');
assert.equal(inCave(CAVE.pup.x, CAVE.pup.y), true, 'the pup is inside it');
assert.equal(inCave(CAVE.roost.x, CAVE.roost.y), true, 'and so is the roost');
assert.equal(caveDarkness(CAVE.center.x, CAVE.center.y), CAVE.darkness, 'inside, the air is almost opaque');
assert.equal(caveDarkness(2000, 1200), null, 'outside, the plane is its own self');
assert(caveDarkness(230, 2560) > 0.9, 'and the dark reaches the pup, wherever it stands in there');
log('darkness ok');

// ---- 2. only a body that sends for it can perceive the pup ----
state.lifeMode = true;
state.formId = 'bat';
state.realmId = 'manussa';
resetKarma();
worldEffects();
state.world.effects = {};
bat.resetBat();
echo.resetEcho();
state.mode = 'world';

assert.equal(isRebirthForm(FORMS.find((f) => f.id === 'bat')), true, 'the bat may be reborn now');
assert.equal(mapsFor('bat').includes('air'), true, 'and it names a map that carries it');
assert.equal(echo.canEcho(), true, 'a bat can call');
assert.equal(echo.isEchoing(), false, 'a new life starts quiet');
assert.equal(echo.echoRadius(), 0, 'with nothing in earshot');

// standing next to the pup with poor eyes: nothing to find yet
player.x = CAVE.pup.x - 20;
player.y = CAVE.pup.y;
assert.equal(bat.perceivesPup(), false, 'eyes alone do not find it in the dark');
state.interact = null;
bat.updateBat();
assert.equal(state.interact, null, 'so the game offers nothing');

// send a pulse: now it is there
assert.equal(echo.emitPulse(), true, 'the pulse goes out');
assert.equal(echo.isEchoing(), true, 'and is in flight');
assert.equal(echo.echoRadius() > 300, true, 'reaching further than any eye in this body');
assert.equal(bat.perceivesPup(), true, 'a pulse shows the pup');
bat.updateBat();
assert(state.interact && state.interact.labelKey === 'prompt.findPup', 'and the game offers to find it');
assert.equal(echo.emitPulse(), false, 'a second pulse cannot overlap the first');

// the pulse fades, and with it the knowledge
echo.updateEcho(1.5);
assert.equal(echo.isEchoing(), false, 'the pulse dies away');
state.interact = null;
bat.updateBat();
assert.equal(state.interact, null, 'and the pup is out of mind again');
log('pulse perception ok');

// ---- 3. a body without ears is offered nothing even in the middle of the cave ----
state.formId = 'human';
echo.emitPulse();
assert.equal(echo.canEcho(), false, 'a human cannot call');
assert.equal(bat.perceivesPup(), false, 'so the pup is never there for it');
state.formId = 'bat';
log('no ears, no finding ok');

// ---- 4. finding it, and the question at the pup ----
echo.emitPulse();
player.x = CAVE.pup.x;
player.y = CAVE.pup.y;
bat.updateBat();
assert(state.interact && state.interact.labelKey === 'prompt.findPup', 'standing at the pup, the pulse confirms it');
state.interact.fn();
assert.equal(bat.foundPup(), true, 'the pup is found');
assert.equal(readSave().bat.found, true, 'finding the pup is saved immediately');
bat.resetBat();
applySaveRuntime(readSave());
assert.equal(bat.foundPup(), true, 'the found pup survives a reload');
const { initChoices } = await import('../src/ui/choices.js');
initChoices();
state.interact = null;
bat.updateBat();
assert(state.interact && state.interact.labelKey === 'prompt.teachPup', 'and now the life asks its question');

let completions = 0;
on(EVENTS.LIFE_COMPLETE, () => { completions += 1; });

state.interact.fn();
assert(state.choiceOpen === true, 'the pup asks a question');
emit(EVENTS.CHOICE_PICK, 0); // teach it
assert.equal(bat.didTeach(), true, 'the bat taught it to call');
assert.equal(hasEffect('echo-shared'), true, 'and the world records that someone can now teach');
assert(getKarma().merit > 0, 'teaching is remembered as giving');
const taughtMerit = getKarma().merit;
assert.deepEqual(readSave().bat, { found: true, decided: true, taught: true }, 'teaching is saved immediately');
bat.resetBat();
applySaveRuntime(readSave());
assert.equal(bat.didTeach(), true, 'teaching survives a reload');
state.interact = null;
bat.updateBat();
assert.equal(state.interact, null, 'the resumed bat is not asked again');
assert.equal(getKarma().merit, taughtMerit, 'resuming does not award merit twice');
assert.equal(goalFor().kind, 'dark-roost', 'with the pup settled, the roost becomes the ending');
log('teaching ok');

// ---- 5. reaching the roost ends the life, and the teaching spreads ----
player.x = CAVE.roost.x;
player.y = CAVE.roost.y;
updateLifeGoal();
assert.equal(completions, 1, 'the roost completes the life');
state.formId = 'human';
assert.equal(echo.canEcho(), true, 'and now a body with no ears of its own can call too');
state.world.effects = {};
assert.equal(echo.canEcho(), false, 'without the teaching it cannot');
state.world.effects = { 'echo-shared': true };
log('teaching spreads ok');

// ---- 6. carrying it home is also a life, and a quieter dark ----
resetKarma();
state.world.effects = {};
state.formId = 'bat';
bat.resetBat();
echo.resetEcho();
state.interact = null; // the previous life's prompt is not this life's
echo.emitPulse();
player.x = CAVE.pup.x;
player.y = CAVE.pup.y;
bat.updateBat();
state.interact.fn();
state.interact = null;
bat.updateBat();
state.interact.fn();
emit(EVENTS.CHOICE_PICK, 1); // carry it
assert.equal(bat.didTeach(), false, 'this bat carried the pup instead');
assert.equal(hasEffect('echo-shared'), false, 'so nothing was taught on');
assert.equal(getKarma().merit, 0, 'and nothing is recorded as giving');
assert.equal(goalFor().kind, 'dark-roost', 'the roost still ends the life — the choice is not a punishment');
assert.deepEqual(readSave().bat, { found: true, decided: true, taught: false }, 'carrying the pup is saved too');
bat.resetBat();
applySaveRuntime(readSave());
assert.equal(bat.hasDecided(), true, 'the carrying choice survives a reload');
assert.equal(bat.didTeach(), false, 'the pup was still carried');
state.interact = null;
bat.updateBat();
assert.equal(state.interact, null, 'the carrying choice is not asked again');
log('choice recorded ok');

// ---- 7. a new life arrives in the dark with quiet ears ----
loadChapter(1, { autosave: false });
assert.equal(bat.foundPup(), false, 'a new chapter (and a new life) starts unfound');
assert.equal(echo.isEchoing(), false, 'with no pulse in flight');

// ---- 8. the bat can really fly its errand (nothing in the cave is walkable-only) ----
state.formId = 'bat';
state.lifeMode = true;
state.lifeId = 1;
state.world.effects = {};
state.world.removed = [];
initDynamicWorld(1);
for (const tree of TREES) {
  assert(
    dist(tree.x, tree.y, CAVE.pup.x, CAVE.pup.y) > 80 && dist(tree.x, tree.y, CAVE.roost.x, CAVE.roost.y) > 80,
    'no trunk stands on the pup or the roost',
  );
}
assert.equal(blockedAt([{ type: 'thicket', x: CAVE.pup.x, y: CAVE.pup.y, r: 400 }], CAVE.pup.x, CAVE.pup.y, { flying: true }), false,
  'a flying body crosses what a walker cannot');
assert.equal(blockedAt([{ type: 'wall', x: CAVE.roost.x, y: CAVE.roost.y, r: 400 }], CAVE.roost.x, CAVE.roost.y, { flying: true }), false,
  'and reaches the roost over stone');
// the chamber is a journey from the gate, but inside the world's working area
assert(dist(CAVE.center.x, CAVE.center.y, GATE_OUT.x, GATE_OUT.y) < 2000, 'the cave is within a night of the gate');
log('flight ok');

// ---- 9. the bat is offered in the chapter pools ----
let sawBat = false;
const chapterIds = Array.from({ length: 14 }, (_, i) => i + 1);
const { candidatesFor } = await import('../src/systems/life-route.js');
assert.equal(candidatesFor(2, ['land', 'air']).includes('bat'), true, 'the bat is offered where a flying body is carried');
assert.equal(candidatesFor(2, ['land']).includes('bat'), true, 'a bat walks as well as flies');
let route = { chapter: 1, lifeId: 1, history: [], chapterIds };
for (let i = 0; i < 400; i++) {
  const next = planNextLife(route);
  if (next.formId === 'bat') sawBat = true;
  route = { ...next, history: [...route.history, next.formId], chapterIds };
}
assert.equal(sawBat, true, 'the bat is born during a long journey');
log('rebirth ok');

console.error('BAT TEST OK — a dark that is a fact, a pup only a pulse can show, and a sound taught to whoever comes next');
