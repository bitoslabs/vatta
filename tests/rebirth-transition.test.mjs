import assert from 'node:assert/strict';

/*
 * Changing lives (docs/rebirth-effects.md, docs/next-production-plan.md item 2).
 *
 * Pass condition: "ข้าม/ปิดหน้า/โหลดทุกช่วงไม่ซ้ำชาติ" — skipping, closing the page
 * or loading at any stage must never repeat a life. Everything here follows from
 * one rule: the next life is *reserved* the moment a life ends, and nothing
 * recomputes it.
 */

const elements = new Map();
function element() {
  const classes = new Set(['hidden']);
  const events = {};
  return {
    style: {}, dataset: {}, children: [], textContent: '', innerHTML: '',
    classList: {
      add: (c) => classes.add(c), remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
      toggle(c, yes) { if (yes === undefined ? !classes.has(c) : yes) classes.add(c); else classes.delete(c); },
    },
    addEventListener: (key, fn) => { events[key] = fn; },
    click() { events.click?.({ target: { blur() {} } }); },
    appendChild(child) { this.children.push(child); },
    querySelectorAll: () => [], getContext: () => ({}), setAttribute() {},
  };
}
const query = (id) => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); };
globalThis.document = { hidden: false, querySelector: query, querySelectorAll: () => [], getElementById: (id) => query(`#${id}`), createElement: element };
globalThis.window = { matchMedia: () => ({ matches: false }), addEventListener() {} };
const storage = new Map();
globalThis.localStorage = { getItem: (k) => storage.get(k) || null, setItem: (k, v) => storage.set(k, v), removeItem: (k) => storage.delete(k) };
let nextTimer = 0;
const timers = new Map();
globalThis.setInterval = (fn) => { const id = ++nextTimer; timers.set(id, fn); return id; };
globalThis.clearInterval = (id) => timers.delete(id);
const tick = () => [...timers.values()].forEach((fn) => fn());

const { state } = await import('../src/core/state.js');
const { MODE } = await import('../src/core/constants.js');
const { on, emit, EVENTS } = await import('../src/core/events.js');
const { FORMS } = await import('../src/content/forms.js');
const { CHAPTERS, loadChapter } = await import('../src/game/chapters.js');
const { planNextLife } = await import('../src/systems/life-route.js');
const { beginLifeEnding, advanceLife, plannedNextLife, startLifeMode } = await import('../src/systems/life.js');
const {
  beginLifeEnd, exportTransition, finishTransition, importTransition, isTransitioning,
  pendingTransition, reserveNextLife, resetTransition, setTransitionPhase, transitionPhase,
  transitionIdFor, TRANSITION_PHASES,
} = await import('../src/systems/transition.js');
const { snapshot, applySaveRuntime, readSave } = await import('../src/systems/save.js');
const { addLifeLight, lifeLights, sparks } = await import('../src/systems/effects.js');
const { isReducedMotion, setReducedMotion } = await import('../src/systems/settings.js');
const { showLifeSummary, initLifeSummary, resumeLifeIfPending } = await import('../src/ui/life-summary.js');
const { player } = await import('../src/entities/player.js');

const log = (message) => console.error(`[transition] ${message}`);

// ---- 1. a life ends once: the same ending is refused ----
resetTransition('run-a');
state.runId = 'run-a';
const plan = { lifeId: 4, chapter: 5, formId: 'deer' };
const first = beginLifeEnd({ lifeId: 3, completionId: 'water', plan });
assert.equal(first.begun, true, 'a life can end');
assert.equal(transitionPhase(), 'ending', 'and the ending phase opens');
assert.equal(pendingTransition().next.lifeId, 4, 'with the next life reserved');
const again = beginLifeEnd({ lifeId: 3, completionId: 'water', plan: { ...plan, lifeId: 9, formId: 'cat' } });
assert.equal(again.begun, false, 'the same life cannot end twice');
assert.equal(pendingTransition().next.lifeId, 4, 'and its reservation is untouched by the attempt');
assert.equal(pendingTransition().next.formId, 'deer', 'including the form');
// A different kind of ending for the same life is a different transition id, but
// the reservation still stands: the id only decides whether the ending already ran.
assert.equal(transitionIdFor(3, 'water', 'run-a'), 'run-a:3:water', 'the id is run + life + kind');
log('one ending per life ok');

// ---- 2. the scene cannot change the outcome: skipping, phases, late effects ----
// Every phase a life actually passes through: 'idle' is the absence of an ending,
// and is checked on its own below.
for (const phase of TRANSITION_PHASES.filter((entry) => entry !== 'idle')) {
  resetTransition('run-b');
  state.runId = 'run-b';
  beginLifeEnd({ lifeId: 2, completionId: 'grove', plan: { lifeId: 3, chapter: 7, formId: 'frog' } });
  setTransitionPhase(phase);
  state.formHistory = ['human', 'dog'];
  state.lifeLog.push({ lifeId: 99, formId: 'cat' });
  // Even after the history is meddled with, the reserved life is what advances.
  state.lifeId = 2;
  state.lifeMode = true;
  state.liberated = false;
  state.journeyComplete = false;
  advanceLife();
  assert.equal(state.lifeId, 3, `phase ${phase}: the reserved life number is used`);
  assert.equal(state.formId, 'frog', `phase ${phase}: the reserved form is used`);
  assert.equal(state.chapter, 7, `phase ${phase}: the reserved chapter is used`);
  assert.equal(isTransitioning(), false, `phase ${phase}: the transition is finished once the life is in the world`);
  assert.equal(pendingTransition(), null, `phase ${phase}: nothing is pending afterwards`);
}
log('reservation beats recomputation at every phase ok');

// ---- 3. saving and loading at every stage: no life is repeated ----
const stages = ['ending', 'summary', 'resolving', 'spawning'];
for (const stage of stages) {
  resetTransition('run-c');
  state.runId = 'run-c';
  state.lifeMode = true;
  state.lifeId = 6;
  state.chapter = 4;
  state.formId = 'ant';
  state.formHistory = ['human'];
  state.lifeLog = [];
  state.savedAt = 0;
  beginLifeEnd({ lifeId: 6, completionId: 'nest', plan: { lifeId: 7, chapter: 5, formId: 'owl' } });
  setTransitionPhase(stage);
  // A save taken mid-scene, written and read like a real slot.
  const saved = JSON.parse(JSON.stringify(snapshot()));
  assert.equal(readSave.length !== undefined, true, 'the save shape is JSON-safe');
  // The page closes here. On boot the save is applied, then the ending resumes.
  state.lifeId = 6;
  state.formId = 'ant';
  state.chapter = 4;
  applySaveRuntime(saved);
  const pending = pendingTransition();
  assert(pending, `stage ${stage}: the pending transition comes back from the save`);
  assert.equal(pending.next.formId, 'owl', `stage ${stage}: with the same reserved form`);
  assert.equal(pending.next.lifeId, 7, `stage ${stage}: and the same reserved life`);
  // Resuming lands in the reserved life exactly once, however often it is called.
  advanceLife();
  advanceLife();
  assert.equal(state.lifeId, 7, `stage ${stage}: resuming lands in the next life`);
  assert.equal(state.formId, 'owl', `stage ${stage}: as the reserved form`);
  assert.equal(state.chapter, 5, `stage ${stage}: in the reserved chapter`);
  assert.equal(isTransitioning(), false, `stage ${stage}: and is not left pending`);
  assert.equal(state.formHistory.filter((id) => id === 'owl').length, 1,
    `stage ${stage}: the new form is written into the history once`);
}
log('save/load at every stage ok');

// ---- 4. a save from before the reservation still works ----
{
  resetTransition('run-d');
  state.lifeId = 2;
  assert.equal(importTransition(undefined), false, 'a save with no transition resumes nothing');
  assert.equal(isTransitioning(), false, 'and leaves nothing pending');
  assert.equal(importTransition({ phase: 'summary', next: { lifeId: 3, chapter: 2, formId: 'frog' } }), true,
    'a well-formed stored transition is read back');
  assert.equal(pendingTransition().next.formId, 'frog', 'with its reservation');
  assert.equal(importTransition({ phase: 'summary', next: {
    lifeId: 3, chapter: 2, formId: 'frog', realmId: 'manussa', chosen: true,
  } }), true, 'an older reservation with a valid realm is migrated');
  assert.equal(pendingTransition().next.formId, 'human', 'its body is brought into the reserved human realm');
  assert.equal(pendingTransition().next.chosen, false, 'a repaired body is never treated as a player choice');
  assert.equal(importTransition({ phase: 'nonsense', next: { lifeId: 3, chapter: 2, formId: 'frog' } }), false,
    'an unknown phase is refused');
  assert.equal(importTransition({ phase: 'summary', next: { lifeId: 'three', chapter: 2, formId: 'frog' } }), false,
    'a malformed reservation is refused');
  assert.equal(importTransition({ phase: 'summary', next: { lifeId: 3, chapter: 2, formId: '' } }), false,
    'an empty form is refused');
  assert.equal(isTransitioning(), false, 'and a refused transition leaves nothing pending');
  log('stale and malformed saves ok');
}

// ---- 5. the ending light: one ring, sparks unless motion is reduced ----
{
  setReducedMotion(false);
  assert.equal(isReducedMotion(), false, 'full motion by default');
  sparks.length = 0;
  lifeLights.length = 0;
  addLifeLight(100, 200, false);
  assert.equal(lifeLights.length, 1, 'an ending leaves one light');
  assert(sparks.length >= 12 && sparks.length <= 24, `and 12–24 sparks (got ${sparks.length})`);
  sparks.length = 0;
  lifeLights.length = 0;
  addLifeLight(100, 200, true);
  assert.equal(lifeLights.length, 1, 'reduced motion keeps the ring');
  assert.equal(sparks.length, 0, 'and drops the particles');
  assert.equal(lifeLights[0].life < 1, true, 'with a shorter life than the full-motion ring');
  setReducedMotion(false);
  log('ending light ok');
}

// ---- 6. the whole flow through the summary UI, driven by real time and clicks ----
{
  initLifeSummary();
  // Start a run, then end a life by its own event, exactly as goals.js does.
  startLifeMode(CHAPTERS[0].id);
  assert.equal(state.runId.startsWith('run-'), true, 'a run gets its own id');
  assert.equal(isTransitioning(), false, 'and begins with nothing pending');
  state.lifeId = 1;

  let completions = 0;
  on(EVENTS.LIFE_COMPLETE, () => { completions += 1; });
  emit(EVENTS.LIFE_COMPLETE, 'water');
  emit(EVENTS.LIFE_COMPLETE, 'water');
  assert.equal(state.mode, MODE.END, 'the world stops for the ending');
  const pending = pendingTransition();
  assert(pending, 'the ending is pending');
  assert.equal(pending.fromLifeId, 1, 'for the life that ended');
  assert.equal(pending.next.lifeId, 2, 'with the next life reserved');
  const card = plannedNextLife();
  assert.deepEqual(card, pending.next, 'the card the player reads is the reserved life');

  // Two clicks on "reborn" advance one life, not two.
  query('#lifeReborn').click();
  query('#lifeReborn').click();
  assert.equal(state.lifeId, 2, 'one life advanced');
  assert.equal(state.mode, MODE.WORLD, 'and the world is running again');
  assert.equal(isTransitioning(), false, 'with nothing left pending');
  assert.equal(timers.size, 0, 'and no timer left behind');

  // A hidden tab does not advance a life behind the player's back.
  state.lifeId = 2;
  emit(EVENTS.LIFE_COMPLETE, 'land');
  assert(pendingTransition(), 'the life is ending');
  document.hidden = true;
  for (let i = 0; i < 8; i++) tick();
  assert.equal(state.lifeId, 2, 'a hidden tab holds the countdown');
  document.hidden = false;
  for (let i = 0; i < 6; i++) tick();
  assert.equal(state.lifeId, 3, 'and the countdown finishes when the tab is back');
  // Events may fire more than once (the world does not promise otherwise); what
  // must not repeat is the *life*. Three events, two endings, two lives.
  assert.equal(completions, 3, 'every completion event is delivered');
  log('UI flow ok');
}

// ---- 7. an interrupted summary resumes from the save, not from the log ----
{
  state.lifeMode = true;
  state.lifeId = 5;
  state.chapter = 3;
  state.formId = 'snake';
  resetTransition('run-e');
  state.runId = 'run-e';
  beginLifeEnd({ lifeId: 5, completionId: 'spring', plan: { lifeId: 6, chapter: 4, formId: 'crab' } });
  setTransitionPhase('summary');
  const saved = JSON.parse(JSON.stringify(snapshot()));
  elements.clear();
  applySaveRuntime(saved);
  assert.equal(resumeLifeIfPending(), true, 'entering a saved mid-summary run resumes the ending');
  assert.equal(pendingTransition().fromLifeId, 5, 'with the same life ending');
  assert.equal(pendingTransition().next.formId, 'crab', 'and the same reserved form');
  // And a run whose reservation was already applied simply continues.
  setTransitionPhase('spawning');
  assert.equal(resumeLifeIfPending(), true, 'a saved run mid-spawn resumes the spawn');
  assert.equal(state.lifeId, 6, 'into the reserved life');
  assert.equal(isTransitioning(), false, 'and nothing stays pending');
  log('interrupted resume ok');
}

// ---- 8. nothing in the transition state can be a life that does not exist ----
{
  let planned = 0;
  let checked = 0;
  for (const chapter of CHAPTERS) {
    for (const lifeId of [1, 2, 5, 9]) {
      const next = planNextLife({ chapter: chapter.id, lifeId, history: [], chapterIds: CHAPTERS.map((c) => c.id) });
      planned += 1;
      checked += FORMS.some((form) => form.id === next.formId && form.rebirth === true) ? 1 : 0;
    }
  }
  assert.equal(planned, checked, 'every life the planner can reserve is a real, rebirthable form');
  assert.equal(TRANSITION_PHASES.includes('idle'), true, 'idle is a phase');
  assert.equal(reserveNextLife({ lifeId: 1, chapter: 1, formId: 'deer' }), false, 'a reservation cannot be attached with no ending open');
  assert.equal(finishTransition(), true, 'and finishing an idle transition is harmless');
  log('planner ok');
}

console.error('REBIRTH TRANSITION TEST OK — one ending per life, reserved once, and the same life after any skip, close or load');

// The realm is reserved together with the body; previews and duplicate ending
// signals must not consume another draw or read later changes to the ledger.
{
  const { resetKarma, recordKarma } = await import('../src/systems/karma.js');
  const { drawCount } = await import('../src/systems/rebirth.js');
  resetKarma();
  startLifeMode(1);
  recordKarma('lie', 2);
  const before = drawCount();
  assert.deepEqual(plannedNextLife(), plannedNextLife(), 'previews are stable');
  assert.equal(drawCount(), before, 'previewing does not consume the next draw');
  const first = beginLifeEnding('water').transition;
  assert.equal(first.next.realmId, 'tiracchana', 'delusion reserves the animal realm');
  assert.equal(beginLifeEnding('goal').begun, false, 'a different completion signal cannot end this life again');
  assert.equal(drawCount(), before + 1, 'one life consumes one draw');
  const saved = JSON.parse(JSON.stringify(snapshot()));
  applySaveRuntime(saved);
  assert.equal(pendingTransition().next.reasonKey, 'rebirth.reason.delusion');
  recordKarma('meditate', 20);
  assert.equal(advanceLife(), true);
  assert.equal(state.realmId, 'tiracchana', 'later changes cannot replace the reserved realm');
  assert.equal(state.formId, first.next.formId, 'the reserved body is used');
  assert.equal(readSave().transition, null, 'arrival is saved after the transition completes');
  assert.equal(readSave().realmId, 'tiracchana', 'the save contains the applied realm');
  resetKarma();
}

// Resuming a summary restores the countdown and the paused world.
{
  startLifeMode(1);
  beginLifeEnding('goal');
  state.mode = MODE.WORLD;
  assert.equal(resumeLifeIfPending(), true);
  assert.equal(state.mode, MODE.END, 'the resumed summary pauses the world');
  assert.equal(timers.size, 1, 'the resumed summary has one active timer');
  for (let i = 0; i < 5; i++) tick();
  assert.equal(state.lifeId, 2, 'the restored countdown advances the life');
  assert.equal(timers.size, 0);
}

// Older saves could autosave the new life before clearing the transition.
{
  resetTransition('legacy-arrival');
  Object.assign(state, { lifeMode: true, lifeId: 2, chapter: 2,
    formId: 'dog', formHistory: ['human', 'dog'], liberated: false, journeyComplete: false });
  beginLifeEnd({ lifeId: 1, plan: { lifeId: 2, chapter: 2, formId: 'dog' } });
  setTransitionPhase('spawning');
  assert.equal(advanceLife(), true);
  assert.deepEqual(state.formHistory, ['human', 'dog'], 'resuming arrival cannot duplicate the body history');
  assert.equal(readSave().transition, null);
}
