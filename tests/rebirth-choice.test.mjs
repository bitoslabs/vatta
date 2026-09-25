import assert from 'node:assert/strict';

/*
 * Choice mode (docs/rebirth-modes.md, docs/next-production-plan.md item 4):
 * "ทางเลือกสามร่าง" — one of three bodies, or none chosen for you.
 *
 * The cards are drawn and *reserved* the moment a life ends, so reloading shows the
 * same three with the same pick. Nothing is born until the player picks — not on a
 * countdown, not on a reload — and choosing is not scored: no kamma is recorded for
 * preferring one body over another.
 */

const elements = new Map();
function element() {
  const classes = new Set(['hidden']);
  const events = {};
  const node = {
    style: {}, dataset: {}, children: [], textContent: '', innerHTML: '', disabled: false, width: 0, height: 0,
    classList: {
      add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c),
      toggle(c, yes) { if (yes === undefined ? !classes.has(c) : yes) classes.add(c); else classes.delete(c); },
    },
    addEventListener: (key, fn) => { events[key] = fn; },
    click() { events.click?.({ target: { blur() {} } }); },
    appendChild(child) { this.children.push(child); return child; },
    getContext: () => null,
    querySelectorAll: () => [], setAttribute() {},
  };
  return node;
}
const query = (id) => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); };
globalThis.document = { hidden: false, querySelector: query, querySelectorAll: () => [], getElementById: (id) => query(`#${id}`), createElement: element };
globalThis.window = { matchMedia: () => ({ matches: false }), addEventListener() {}, location: { reload() {} } };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.performance = { now: () => 0 };
let nextTimer = 0;
const timers = new Map();
globalThis.setInterval = (fn) => { const id = ++nextTimer; timers.set(id, fn); return id; };
globalThis.clearInterval = (id) => timers.delete(id);
const tick = () => [...timers.values()].forEach((fn) => fn());

const { state } = await import('../src/core/state.js');
const { MODE } = await import('../src/core/constants.js');
const { CHAPTERS, loadChapter } = await import('../src/game/chapters.js');
const { FORMS } = await import('../src/content/forms.js');
const { getKarma, resetKarma } = await import('../src/systems/karma.js');
const rebirth = await import('../src/systems/rebirth.js');
const { snapshot, applySaveRuntime } = await import('../src/systems/save.js');
const {
  advanceLife, beginLifeEnding, chooseNextBody, nextLifePlan, plannedNextLife,
} = await import('../src/systems/life.js');
const {
  choicePending, exportTransition, importTransition, pendingTransition, resetTransition,
} = await import('../src/systems/transition.js');
const { initLifeSummary, showLifeSummary } = await import('../src/ui/life-summary.js');

const log = (message) => console.error(`[choice] ${message}`);
const chapters = CHAPTERS.map((chapter) => chapter.id);

function beginChoiceLife({ seed = 5150, history = ['human', 'deer'], lifeId = 3, chapter = 2 } = {}) {
  resetTransition('choice-run');
  state.runId = 'choice-run';
  rebirth.resetRebirth('choice-run');
  rebirth.setRunSeed(seed);
  rebirth.setRebirthMode('choice');
  state.lifeMode = true;
  state.liberated = false;
  state.journeyComplete = false;
  state.lifeId = lifeId;
  state.chapter = chapter;
  state.formId = 'human';
  state.formHistory = [...history];
  state.lifeLog = [{ lifeId: lifeId - 0, formId: 'human' }];
  const begun = beginLifeEnding('land');
  return begun.transition;
}

// ---- 1. the draw offers distinct, eligible bodies and remembers their odds ----
{
  const pending = beginChoiceLife();
  const cards = pending.next.candidateIds;
  assert.equal(cards.length, 3, 'three bodies are offered when three exist');
  assert.equal(new Set(cards).size, 3, 'and they are three different bodies');
  for (const id of cards) {
    assert(FORMS.some((form) => form.id === id && form.rebirth === true), `${id} is a body that can be reborn`);
    assert(Number.isFinite(pending.next.probabilities[id]), `${id} carries its real chance`);
    assert(pending.next.probabilities[id] > 0 && pending.next.probabilities[id] <= 1, `${id}: the chance is a probability`);
  }
  assert.equal(pending.next.chosen, false, 'and nothing is chosen yet');
  assert.equal(choicePending(), true, 'the choice is pending');
  log('cards ok');
}

// ---- 2. the same seed gives the same cards, and a reload gives the same cards ----
{
  const first = beginChoiceLife({ seed: 777 }).next;
  const again = beginChoiceLife({ seed: 777 }).next;
  assert.deepEqual(first.candidateIds, again.candidateIds, 'the same seed offers the same bodies');
  const other = beginChoiceLife({ seed: 778 }).next;
  assert.notDeepEqual(first.candidateIds, other.candidateIds, 'a different seed offers (almost surely) different ones');
  beginChoiceLife({ seed: 777 });
  const saved = JSON.parse(JSON.stringify(snapshot()));
  applySaveRuntime(saved);
  assert.deepEqual(pendingTransition().next.candidateIds, first.candidateIds, 'a reload keeps the cards');
  assert.deepEqual(pendingTransition().next.probabilities, first.probabilities, 'and their odds');
  assert.equal(pendingTransition().next.chosen, false, 'and the choice is still the player\'s');
  log('cards survive a reload ok');
}

// ---- 3. nothing is born before the player chooses ----
{
  initLifeSummary();
  const pending = beginChoiceLife({ seed: 909 });
  showLifeSummary('land');
  assert.equal(state.lifeId, 3, 'the life has not advanced');
  for (let i = 0; i < 12; i++) tick();
  assert.equal(state.lifeId, 3, 'and a countdown does not advance it either');
  assert.equal(query('#lifeReborn').disabled, true, 'the button waits for a choice');
  assert.equal(advanceLife(), false, 'and advancing directly is refused');
  assert.equal(state.lifeId, 3, 'so nothing is decided for the player');
  log('no birth before the choice ok');
}

// ---- 4. only a body on offer may be chosen, and choosing is not scored ----
{
  const pending = beginChoiceLife({ seed: 909 });
  const offered = pending.next.candidateIds;
  const outside = FORMS.find((form) => form.rebirth && !offered.includes(form.id)).id;
  resetKarma();
  const meritBefore = getKarma().merit;
  const demeritBefore = getKarma().demerit;
  assert.equal(chooseNextBody(outside), false, 'a body that was not offered cannot be chosen');
  assert.equal(chooseNextBody('human'), false, 'and neither can a form the cycle does not offer');
  const pick = offered[1];
  assert.equal(chooseNextBody(pick), true, 'a body on offer can be chosen');
  assert.equal(getKarma().merit, meritBefore, 'choosing records no merit');
  assert.equal(getKarma().demerit, demeritBefore, 'and no demerit');
  const after = pendingTransition();
  assert.equal(after.next.formId, pick, 'the choice is written into the reservation');
  assert.equal(after.next.chosen, true, 'and marked chosen');
  assert.equal(after.next.probability, pending.next.probabilities[pick], 'with the odds of the chosen body');
  log('choosing ok');
}

// ---- 5. after choosing, the reserved body is the one born ----
{
  const pending = beginChoiceLife({ seed: 3131 });
  const pick = pending.next.candidateIds[2];
  chooseNextBody(pick);
  const plan = plannedNextLife();
  assert.equal(plan.formId, pick, 'the card reads the chosen body');
  state.lifeLog = [{ lifeId: state.lifeId, formId: 'human' }];
  assert.equal(advanceLife(), true, 'and the life advances once chosen');
  assert.equal(state.formId, pick, 'into the body that was chosen');
  assert.equal(choicePending(), false, 'with the choice closed');
  log('the chosen body is born ok');
}

// ---- 6. a save mid-choice resumes waiting, with the same cards and the same pick ----
{
  const pending = beginChoiceLife({ seed: 4242 });
  const pick = pending.next.candidateIds[0];
  const savedBefore = JSON.parse(JSON.stringify(snapshot()));
  chooseNextBody(pick);
  const savedAfter = JSON.parse(JSON.stringify(snapshot()));
  applySaveRuntime(savedBefore);
  assert.equal(choicePending(), true, 'a save taken before the choice still waits');
  assert.deepEqual(pendingTransition().next.candidateIds, pending.next.candidateIds, 'with the same cards');
  applySaveRuntime(savedAfter);
  assert.equal(choicePending(), false, 'a save taken after the choice remembers it');
  assert.equal(pendingTransition().next.formId, pick, 'including which body was chosen');
  log('mid-choice saves ok');
}

// ---- 7. flow mode is untouched by any of this ----
{
  resetTransition('flow-run');
  state.runId = 'flow-run';
  rebirth.resetRebirth('flow-run');
  rebirth.setRunSeed(8080);
  rebirth.setRebirthMode('flow');
  state.lifeMode = true;
  state.lifeId = 5;
  state.chapter = 3;
  state.formId = 'deer';
  state.formHistory = ['human', 'deer'];
  state.lifeLog = [{ lifeId: 5, formId: 'deer' }];
  const begun = beginLifeEnding('land');
  assert.equal(begun.transition.next.candidateIds, null, 'the stream offers no cards');
  assert.equal(choicePending(), false, 'and nothing is pending');
  assert(advanceLife(), true, 'so the life advances on its own');
  assert.equal(state.lifeId, 6, 'as before');
  log('flow mode unchanged ok');
}

// ---- 8. a malformed stored choice cannot smuggle a body in ----
{
  resetTransition('bad-run');
  importTransition({
    phase: 'summary',
    fromLifeId: 1,
    completionId: 'land',
    next: {
      lifeId: 2, chapter: 2, formId: 'owl',
      candidateIds: ['deer', 'deer', 7, null, 'crab'],
      probabilities: { deer: 0.2, crab: 'lots' },
      chosen: true,
    },
  });
  const restored = pendingTransition().next;
  assert.deepEqual(restored.candidateIds, ['deer', 'crab'], 'duplicates and non-bodies are dropped from the cards');
  assert.deepEqual(Object.keys(restored.probabilities), ['deer'], 'and impossible odds are dropped');
  assert.equal(restored.chosen, false, 'a choice outside the cards is not a choice');
  assert.equal(chooseNextBody('owl'), false, 'and that body cannot be chosen');
  assert.equal(chooseNextBody('crab'), true, 'while one that is on offer can');
  log('malformed choices ok');
}

// ---- 9. the mode is a setting that survives the save ----
{
  state.realmId = 'manussa';
  rebirth.setRebirthMode('choice');
  const saved = JSON.parse(JSON.stringify(snapshot()));
  rebirth.setRebirthMode('flow');
  applySaveRuntime(saved);
  assert.equal(rebirth.rebirthMode(), 'choice', 'the chosen mode comes back');
  assert.equal(rebirth.importRebirth({ mode: 'explore', algorithmVersion: 1 }), true, 'explore is a known name');
  assert.equal(rebirth.setRebirthMode('explore'), 'explore', 'and can be stored');
  assert.equal(rebirth.drawNextLife({ chapter: 1, lifeId: 1, history: [], chapterIds: chapters }).candidateIds, undefined,
    'but a mode with no screen offers no cards');
  rebirth.setRebirthMode('flow');
  loadChapter(CHAPTERS[0].id);
  log('mode setting ok');
}

console.error('REBIRTH CHOICE TEST OK — three bodies on real odds, nothing born until the player picks, and the cards survive a reload');
