import assert from 'node:assert/strict';

/*
 * The owl's night (docs/animal-lives-story.md ch.13, "สิ่งที่กลางวันไม่เห็น").
 *
 * There is no wall in this life: the owl flies over everything. The door is the
 * dark itself — a lost animal is only perceived inside the body's own vision
 * radius (systems/vision.js) — and the life asks, at the roost, whether to keep
 * the watch for everyone who comes after.
 */

// A minimal DOM so the modules that touch the page can be imported in Node.
const elements = new Map();
function element() {
  const classes = new Set(['hidden']);
  return {
    style: {}, dataset: {}, children: [], textContent: '', innerHTML: '',
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
      toggle(c, on) { if (on === false) classes.delete(c); else classes.add(c); },
    },
    addEventListener() {}, appendChild(child) { this.children.push(child); },
    querySelectorAll: () => [], getContext: () => ({}), setAttribute() {},
  };
}
const query = (id) => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); };
globalThis.document = { hidden: false, querySelector: query, querySelectorAll: () => [], getElementById: (id) => query(`#${id}`), createElement: element };
globalThis.window = { matchMedia: () => ({ matches: false }), addEventListener() {}, location: { reload() {} } };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.performance = { now: () => 0 };

const { state } = await import('../src/core/state.js');
const { on, emit, EVENTS } = await import('../src/core/events.js');
const { FORMS, mapsFor, isRebirthForm } = await import('../src/content/forms.js');
const { OWL } = await import('../src/world/world-data.js');
const { goalFor, updateLifeGoal } = await import('../src/systems/goals.js');
const { visionRadius, visionConstants, hasNightVision, nightWatched } = await import('../src/systems/vision.js');
const { getKarma, resetKarma } = await import('../src/systems/karma.js');
const { hasEffect, worldEffects } = await import('../src/systems/world-effects.js');
const { planNextLife } = await import('../src/systems/life-route.js');
const { loadChapter } = await import('../src/game/chapters.js');
const { player } = await import('../src/entities/player.js');
const owl = await import('../src/game/owl.js');

const log = (message) => console.error(`[owl] ${message}`);
const lost = OWL.lost;

// ---- 1. the vision radius is a rule, not a tint ----
state.story.released = false;
state.fear = 0;
state.world.effects = {};
state.formId = 'human';
const humanVision = visionRadius(false);
assert.equal(humanVision, visionConstants.base, 'a calm human sees the base distance');
assert.equal(visionRadius(true), humanVision + visionConstants.mindfulBonus, 'mindfulness opens the sight');
state.fear = 0.5;
assert.equal(visionRadius(false), humanVision - 0.5 * visionConstants.fearCost, 'fear closes it');
state.fear = 0;

state.formId = 'owl';
assert.equal(hasNightVision(), true, 'the owl has night eyes');
assert.equal(visionRadius(false) - humanVision, 120 + visionConstants.nightVisionBonus,
  'and sees further than any other body: sharper eyes and night adaptation together');
state.formId = 'rabbit';
assert(visionRadius(false) > humanVision, 'a rabbit has sharp eyes of its own');
state.formId = 'butterfly';
assert(visionRadius(false) < humanVision, 'the butterfly sees less than a human');
state.formId = 'owl';
log('vision radius ok');

// ---- 2. what the dark hides, the body must see ----
state.lifeMode = true;
state.formId = 'owl';
state.realmId = 'manussa';
resetKarma();
worldEffects();
state.world.effects = {};
owl.resetOwl();
state.mode = 'world';

assert.equal(isRebirthForm(FORMS.find((f) => f.id === 'owl')), true, 'the owl may be reborn now');
assert.equal(mapsFor('owl').includes('air'), true, 'and it names a map that carries it');
assert.equal(owl.foundCount(), 0, 'a new night has no one found');
assert.equal(owl.allFound(), false, 'and nobody home yet');

const first = goalFor();
assert.equal(first.kind, 'lost', 'the owl is first pointed at a lost one');
assert.equal(first.x, lost[0].x, 'the first lost one, in x');

let completions = 0;
on(EVENTS.LIFE_COMPLETE, () => { completions += 1; });

// far away: the lost one is not there to be seen or led
player.x = lost[0].x + visionRadius(false) + 80;
player.y = lost[0].y;
owl.updateOwl();
assert.equal(state.interact, null, 'beyond the vision radius there is nothing to lead home');
updateLifeGoal();
assert.equal(completions, 0, 'and standing outside its goal does not end the life');

// inside the radius: it appears, and can be led home
player.x = lost[0].x + visionRadius(false) / 2;
player.y = lost[0].y;
owl.updateOwl();
assert(state.interact && state.interact.labelKey === 'prompt.leadHome', 'within the vision radius the lost one appears');
log('perception gate ok');

// ---- 3. the body that cannot see that far cannot do this life ----
state.formId = 'human';
player.x = lost[1].x + visionRadius(false) + 80;
player.y = lost[1].y;
state.interact = null;
const humanRadius = visionRadius(false);
state.formId = 'owl';
assert(visionRadius(false) > humanRadius, 'the owl can reach what a human cannot');
state.formId = 'human';
owl.updateOwl();
assert.equal(state.interact, null, 'and this is the owl\'s life, not the human\'s');
state.formId = 'owl';

// the lost ones are found one at a time, each one closer than the last
const { initChoices } = await import('../src/ui/choices.js');
initChoices();
for (const [index, animal] of lost.entries()) {
  player.x = animal.x;
  player.y = animal.y;
  state.interact = null;
  owl.updateOwl();
  assert(state.interact && state.interact.labelKey === 'prompt.leadHome', `${animal.id} is found in the light`);
  state.interact.fn();
  assert.equal(owl.foundCount(), index + 1, `${animal.id} is led home (${index + 1} of ${lost.length})`);
}
assert.equal(owl.allFound(), true, 'all the lost are home');
log('lost ones ok');

// ---- 4. the roost asks whether to keep the watch ----
const roost = goalFor();
assert.equal(roost.kind, 'roost', 'with everyone home, the roost becomes the goal');
assert.equal(roost.x, OWL.roost.x, 'the roost, in x');
player.x = OWL.roost.x;
player.y = OWL.roost.y;
updateLifeGoal();
assert.equal(completions, 0, 'reaching the roost is not yet the ending');
state.interact = null;
owl.updateOwl();
assert(state.interact && state.interact.labelKey === 'prompt.watchNight', 'the roost asks about the watch');

state.interact.fn();
assert(state.choiceOpen === true, 'the roost asks a question');
emit(EVENTS.CHOICE_PICK, 0); // keep the watch
assert.equal(owl.didWatch(), true, 'the owl kept the watch');
assert.equal(hasEffect('night-watched'), true, 'the world records that the night is watched');
assert(getKarma().merit > 0, 'keeping the watch is remembered as giving');
assert.equal(nightWatched(), true, 'and the night-watched effect is visible to the vision code');
assert.equal(goalFor().kind, 'watch', 'now the roost is the ending');

updateLifeGoal();
assert.equal(completions, 1, 'settling on the roost completes the life');
assert.equal(owl.settleRoost(), true, 'and the world remembers the watch');
log('watch ok');

// ---- 5. the watch is felt by everyone who comes after ----
state.world.effects = {};
state.formId = 'human';
const unwatched = visionRadius(false);
state.world.effects = { 'night-watched': true };
assert.equal(visionRadius(false), unwatched + visionConstants.watchedBonus, 'a watched night leaves every body more light');
log('watch felt ok');

// ---- 6. sleeping is also a life, and a quieter night ----
resetKarma();
state.world.effects = {};
state.mode = 'world';
state.formId = 'owl';
owl.resetOwl();
for (const animal of lost) {
  player.x = animal.x;
  player.y = animal.y;
  state.interact = null;
  owl.updateOwl();
  state.interact.fn();
}
player.x = OWL.roost.x;
player.y = OWL.roost.y;
state.interact = null;
owl.updateOwl();
state.interact.fn();
emit(EVENTS.CHOICE_PICK, 1); // sleep
assert.equal(owl.didWatch(), false, 'this owl slept');
assert.equal(hasEffect('night-watched'), false, 'so the night is unwatched');
assert.equal(getKarma().merit, 0, 'and nothing is recorded as giving');
assert.equal(goalFor().kind, 'watch', 'the roost still ends the life — the choice is not a punishment');
log('choice recorded ok');

// ---- 7. a new night starts with no one found ----
loadChapter(1, { autosave: false });
assert.equal(owl.foundCount(), 0, 'a new chapter (and a new life) starts with no one found');
assert.equal(owl.hasDecided(), false, 'and with the watch undecided');

// ---- 8. the owl really can fly its night ----
state.formId = 'owl';
state.lifeMode = true;
state.lifeId = 1;
state.world.effects = {};
state.checkpoint = { x: 1120, y: 1560 };
for (const target of [...lost, OWL.roost]) {
  assert(Math.hypot(target.x - 1120, target.y - 1560) > 0, 'every place the night needs is a real journey away');
  assert(visionRadius(false) > 0, 'and the owl can see while it flies there');
}
// a flying body ignores ground solids entirely, which is the point of this life
const { blockedAt } = await import('../src/world/rooms.js');
for (const animal of lost) {
  assert.equal(blockedAt([{ type: 'thicket', x: animal.x, y: animal.y, r: 400 }], animal.x, animal.y, { flying: true }), false,
    'the owl flies over what a walker cannot');
}
log('flight ok');

// ---- 9. the owl is offered in the chapter pools ----
let sawOwl = false;
const chapterIds = Array.from({ length: 14 }, (_, i) => i + 1);
let route = { chapter: 1, lifeId: 1, history: ['human'], chapterIds };
for (let i = 0; i < 400; i++) {
  const next = planNextLife(route);
  if (next.formId === 'owl') sawOwl = true;
  route = { ...next, history: [...route.history, next.formId], chapterIds };
}
assert.equal(sawOwl, true, 'the owl is born during a long journey');
assert.equal(FORMS.every((f) => isRebirthForm(f)), true, 'every body of the roster can be reborn now');
log('rebirth ok');

console.error('OWL TEST OK — the dark as the door, the lost led home, and the watch that leaves everyone more light');
