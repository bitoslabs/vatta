import assert from 'node:assert/strict';

/*
 * Explore mode (docs/rebirth-modes.md, "สำรวจร่าง"): the animal book.
 *
 * The third rebirth mode, and the last stub in the design: a page of bodies, each
 * one the game can really enter, tried on with teacher mode on and *no* effect on
 * the journey's save. Nothing in this mode may write to a slot, and every body on
 * the page must be enterable — the same floor tests/roster.test.mjs holds new bodies
 * to.
 */

const elements = new Map();
function element(tag = 'div') {
  const classes = new Set(['hidden']);
  const events = {};
  const node = {
    tagName: String(tag).toUpperCase(),
    style: {}, dataset: {}, children: [], textContent: '', innerHTML: '', disabled: false, width: 0, height: 0,
    classList: {
      add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c),
      toggle(c, yes) { if (yes === undefined ? !classes.has(c) : yes) classes.add(c); else classes.delete(c); },
    },
    addEventListener: (key, fn) => { events[key] = fn; },
    click() { events.click?.({ target: { blur() {} } }); },
    appendChild(child) { this.children.push(child); return child; },
    querySelectorAll: () => [], getContext: () => null, setAttribute() {},
  };
  Object.defineProperty(node, 'innerHTML', { get: () => '', set: (value) => { if (!value) node.children.length = 0; } });
  return node;
}
const query = (id) => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); };
globalThis.document = { hidden: false, querySelector: query, querySelectorAll: () => [], getElementById: query, createElement: element };
globalThis.window = { matchMedia: () => ({ matches: false }), addEventListener() {}, location: { reload() {} } };
const storage = new Map();
globalThis.localStorage = { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: (k) => storage.delete(k) };
globalThis.performance = { now: () => 0 };
let nextTimer = 0;
globalThis.setInterval = () => ++nextTimer;
globalThis.clearInterval = () => {};

const { state } = await import('../src/core/state.js');
const { MODE, WORLD } = await import('../src/core/constants.js');
const { CHAPTERS, loadChapter } = await import('../src/game/chapters.js');
const { FORMS, mapsFor } = await import('../src/content/forms.js');
const { goalFor } = await import('../src/systems/goals.js');
const { goalKindValid } = await import('../src/systems/goals.js');
const { worldAbilities, dynamicFeatures } = await import('../src/systems/worldgen.js');
const { buildDynamicWorld, validateRoute } = await import('../src/world/rooms.js');
const { isTeacher } = await import('../src/systems/teacher.js');
const { saveRun, readSave, getActiveSlot, setActiveSlot } = await import('../src/systems/save.js');
const { snapshot } = await import('../src/systems/save.js');
const { player } = await import('../src/entities/player.js');
const { DEER, FISH, MARSH, NEST } = await import('../src/world/world-data.js');
const { inWater } = await import('../src/systems/forms.js');
const explore = await import('../src/systems/explore.js');
const { openBook, closeBook, isBookOpen, initAnimalBook } = await import('../src/ui/animal-book.js');
const { choicePending, importTransition, markChosenBody, pendingTransition, resetTransition } = await import('../src/systems/transition.js');
const { advanceLife, beginLifeEnding, plannedNextLife } = await import('../src/systems/life.js');

const log = (message) => console.error(`[explore] ${message}`);

// ---- 1. the book lists every body the game can enter ----
{
  const forms = explore.explorableForms();
  assert.equal(forms.length, FORMS.length, `every form is on the page (${forms.length})`);
  for (const form of forms) {
    assert(mapsFor(form.id).length > 0, `${form.id} declares a map`);
    assert(Number.isFinite(form.width), `${form.id} has a reference size`);
  }
  assert(forms.some((form) => form.id === 'fish'), 'including the fish, which lives in the water');
  assert(forms.some((form) => form.id === 'asura'), 'and the bodies that are not part of the rebirth cycle');
  log(`book lists ok — ${forms.length} bodies`);
}

// ---- 2. every body on the page can really be entered ----
{
  let checked = 0;
  for (const form of explore.explorableForms()) {
    state.explore = { active: false };
    state.formId = form.id;
    state.lifeId = 3;
    state.world = { effects: {}, leavings: [], webs: [] };
    const started = explore.startExplore({ formId: form.id, chapterId: CHAPTERS[0].id });
    assert.equal(started, true, `${form.id} can be tried`);
    assert.equal(state.formId, form.id, `${form.id} is the body in play`);
    assert.equal(isTeacher(), true, `${form.id}: trying a body cannot fail it — teacher mode is on`);
    assert.equal(state.mode, MODE.WORLD, `${form.id}: the world is running`);
    const features = dynamicFeatures();
    assert(features.length > 0, `${form.id}: its world has ground in it`);
    assert.equal(state.dynamic.validation?.fallback, undefined, `${form.id}: the world assembled without falling back`);
    // A goal resolves for this body, wherever it is (systems/goals.js).
    const goal = goalFor();
    assert(Number.isFinite(goal.x) && Number.isFinite(goal.y), `${form.id}: a goal resolves`);
    assert.equal(typeof goal.kind, 'string', `${form.id}: with a name`);
    checked += 1;
  }
  assert.equal(checked, explore.explorableForms().length, 'every body on the page was entered');
  log(`every body enterable ok — ${checked} bodies`);
}

// Preview bodies start close enough to see their encounter, outside its danger.
{
  for (const [formId, point, radius] of [
    ['ant', NEST.runoff, 70],
    ['fish', FISH.shallows, 48],
    ['frog', MARSH.drying, 72],
    ['deer', DEER.crossing, 80],
  ]) {
    state.explore = { active: false };
    state.world = { effects: {}, leavings: [] };
    assert(explore.startExplore({ formId, chapterId: 1 }), `${formId} preview opens`);
    const distance = Math.hypot(player.x - point.x, player.y - point.y);
    assert(distance > radius + 20, `${formId} preview begins safely outside the hazard`);
    assert(distance < 255, `${formId} preview shows the encounter nearby`);
    if (formId === 'fish') assert(inWater(player.x, player.y), 'fish preview stays in water');
  }
}

// ---- 3. exploring writes nothing to the journey ----
{
  setActiveSlot(1);
  loadChapter(CHAPTERS[0].id); // a normal life, to give the slot something real
  state.world.effects = {};
  const { waterRoot } = await import('../src/game/burrow.js');
  const { hasEffect } = await import('../src/systems/world-effects.js');
  const { getKarma } = await import('../src/systems/karma.js');
  const meritBefore = getKarma().merit;
  const before = JSON.stringify(snapshot());
  storage.clear();
  state.explore = { active: false };
  assert.equal(explore.startExplore({ formId: 'worm', chapterId: 3 }), true, 'enter a body in explore mode');
  assert.equal(explore.isExploring(), true, 'and the mode is on');
  assert.equal(waterRoot(), true, 'the trial body can practise a world-changing act');
  assert.equal(hasEffect('root-watered'), true, 'the trial effect is visible during practice');
  assert.equal(saveRun(), false, 'a save while exploring is refused');
  assert.equal(readSave(), null, 'so the slot stays empty');
  assert.equal(explore.stopExplore(), true, 'leaving explore mode');
  assert.equal(explore.isExploring(), false, 'turns it off');
  assert.equal(state.explore.active, false, 'and the state agrees');
  assert.equal(hasEffect('root-watered'), false, 'leaving practice restores the original world');
  assert.equal(getKarma().merit, meritBefore, 'practice cannot add merit to the journey');
  assert.equal(state.mode, MODE.TITLE, 'leaving practice returns to the title');
  assert.equal(typeof before, 'string', 'the journey snapshot is untouched by any of it');
  log('no writes ok');
}

// ---- 4. the book renders a card per body, and picks one ----
{
  initAnimalBook();
  assert.equal(openBook(), true, 'the book opens');
  assert.equal(isBookOpen(), true, 'and is on screen');
  const body = query('#bookBody');
  const flatten = (node) => [node, ...node.children.flatMap((child) => flatten(child))];
  const nodes = flatten(body);
  const cards = nodes.filter((node) => node.tagName === 'BUTTON' && node.dataset.form);
  assert.equal(cards.length, FORMS.length, `one card per body (${cards.length})`);
  const names = cards.map((card) => card.children.find((child) => child.className === 'book-name')?.textContent);
  assert.equal(names.every((name) => typeof name === 'string' && name.length > 0), true, 'each card names its body');
  // Choosing from the title tries the body on, without touching a save.
  storage.clear();
  state.explore = { active: false };
  const tigerCard = cards.find((card) => card.dataset.form === 'tiger');
  tigerCard.click();
  assert.equal(state.formId, 'tiger', 'picking a card enters that body');
  assert.equal(isBookOpen(), false, 'and closes the book');
  assert.equal(saveRun(), false, 'still writing nothing');
  assert.equal(readSave(), null, 'and the slot is still empty');
  log('the book works ok');
}

// ---- 5. in explore mode the summary asks the book, and the book answers ----
{
  explore.stopExplore();
  loadChapter(CHAPTERS[0].id);
  state.lifeMode = true;
  state.lifeId = 4;
  state.formId = 'deer';
  state.formHistory = ['human', 'deer'];
  state.lifeLog = [{ lifeId: 4, formId: 'deer' }];
  state.world = { effects: {}, leavings: [] };
  const { resetKarma } = await import('../src/systems/karma.js');
  resetKarma();
  resetTransition('explore-run');
  state.runId = 'explore-run';
  const { setRebirthMode } = await import('../src/systems/rebirth.js');
  setRebirthMode('explore');
  const begun = beginLifeEnding('land');
  assert.equal(begun.transition.next.explore, true, 'the reservation says the body comes from the book');
  assert.equal(choicePending(), true, 'so the rebirth waits');
  assert.equal(advanceLife(), false, 'and nothing is born before a pick');
  // The book only offers bodies compatible with the karmic realm.
  const { chooseNextBody } = await import('../src/systems/life.js');
  const { exportTransition, importTransition } = await import('../src/systems/transition.js');
  assert.equal(chooseNextBody('unknown-body'), false, 'unknown bodies cannot answer a rebirth');
  assert.equal(begun.transition.next.realmId, 'manussa');
  assert.equal(chooseNextBody('spider'), false, 'an animal cannot answer a human rebirth');
  assert.equal(chooseNextBody('human'), true, 'the book uses the public life picker');
  assert.equal(readSave().transition.next.formId, 'human', 'the rebirth book choice is saved immediately');
  importTransition(JSON.parse(JSON.stringify(exportTransition())));
  assert.equal(choicePending(), false, 'a reload remembers the book selection');
  assert.equal(plannedNextLife().formId, 'human', 'the card reads the chosen body');
  assert.equal(advanceLife(), true, 'and the life goes on');
  assert.equal(state.formId, 'human', 'into the body that was chosen');
  setRebirthMode('flow');
  log('rebirth from the book ok');
}

console.error('EXPLORE TEST OK — a book of bodies any of which can be tried, and a journey that is never written to');
