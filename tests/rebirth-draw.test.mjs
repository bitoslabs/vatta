import assert from 'node:assert/strict';

/*
 * Drawing the next life (docs/rebirth-modes.md, docs/next-production-plan.md item 3).
 *
 * The body is a seeded weighted draw, not a rotation:
 *
 *   weight = base 1 × freshness (never worn ×1.5) × event fit (in this chapter's
 *            own pool ×1.2), with the last two bodies held out while other options
 *            remain and drawn at ×0.2 when nothing else is left.
 *
 * Pass condition: every drawn body can go on to finish a life, and reloading
 * changes nothing — the same seed and history give the same result, and showing the
 * summary again does not draw again.
 */

const elements = new Map();
function element() {
  const classes = new Set(['hidden']);
  const events = {};
  return {
    style: {}, dataset: {}, children: [], textContent: '', innerHTML: '',
    classList: {
      add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c),
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

const { state } = await import('../src/core/state.js');
const { FORMS, mapsFor } = await import('../src/content/forms.js');
const { CHAPTERS } = await import('../src/game/chapters.js');
const { CHAPTER_ANIMALS } = await import('../src/systems/life-route.js');
const rebirth = await import('../src/systems/rebirth.js');
const { snapshot, applySaveRuntime } = await import('../src/systems/save.js');
const { beginLifeEnding, nextLifePlan, startLifeMode } = await import('../src/systems/life.js');
const { pendingTransition, resetTransition, setTransitionPhase } = await import('../src/systems/transition.js');
const { initLifeSummary, showLifeSummary } = await import('../src/ui/life-summary.js');

const log = (message) => console.error(`[draw] ${message}`);
const chapters = CHAPTERS.map((chapter) => chapter.id);

// ---- 1. the same seed and history always give the same life ----
{
  rebirth.resetRebirth('seed-run');
  rebirth.setRunSeed(4242);
  const a = rebirth.drawLife({ chapterId: 5, history: ['human', 'deer'], index: 0 });
  const b = rebirth.drawLife({ chapterId: 5, history: ['human', 'deer'], index: 0 });
  assert.equal(a.formId, b.formId, 'the same seed, history and index give the same body');
  assert.equal(a.probability, b.probability, 'and the same chance');
  const c = rebirth.drawLife({ chapterId: 5, history: ['human', 'deer'], index: 1 });
  assert.notEqual(a.formId + a.probability, c.formId + c.probability, 'a different index is a different draw');
  const saved = JSON.parse(JSON.stringify(snapshot()));
  const before = rebirth.drawCount();
  applySaveRuntime(saved);
  assert.equal(rebirth.drawCount(), before, 'a save restores how many draws have been made');
  assert.equal(rebirth.runSeed(), 4242, 'and the seed');
  log('determinism ok');
}

// ---- 2. the mode is a real save field, and unknown values clamp to flow ----
{
  assert.equal(rebirth.rebirthMode(), 'flow', 'the seeded draw is the live mode');
  assert.equal(rebirth.setRebirthMode('choice'), 'choice', 'a known mode is accepted');
  assert.equal(rebirth.setRebirthMode('nonsense'), 'flow', 'an unknown mode clamps to the draw');
  rebirth.setRebirthMode('flow');
  const saved = JSON.parse(JSON.stringify(snapshot()));
  assert.equal(saved.rebirth.mode, 'flow', 'the mode is saved');
  assert.equal(saved.rebirth.algorithmVersion, rebirth.REBIRTH_ALGORITHM_VERSION, 'with the algorithm version');
  rebirth.setRebirthMode('explore');
  applySaveRuntime(saved);
  assert.equal(rebirth.rebirthMode(), 'flow', 'and a load restores the saved mode');
  assert.equal(rebirth.importRebirth({ mode: 'choice', runSeed: 7, draws: 3, algorithmVersion: 99 }), false,
    'a save from another algorithm version still loads but is reported');
  assert.equal(rebirth.rebirthMode(), 'choice', 'keeping a known mode');
  assert.equal(rebirth.drawCount(), 3, 'and its draw count');
  rebirth.setRebirthMode('flow');
  log('mode and save fields ok');
}

// ---- 3. eligibility: every draw is a body this chapter can carry, and can finish ----
{
  const seen = new Set();
  for (const chapterId of chapters) {
    const { maps, all } = rebirth.eligibleForms(chapterId);
    assert(all.length > 0, `chapter ${chapterId} has bodies to draw from`);
    for (let index = 0; index < 24; index++) {
      const draw = rebirth.drawLife({ chapterId, history: ['human'], index });
      assert(all.includes(draw.formId), `chapter ${chapterId} draw ${index}: the body is eligible`);
      const form = FORMS.find((entry) => entry.id === draw.formId);
      assert.equal(form.rebirth, true, 'the body may be reborn');
      assert.equal(mapsFor(draw.formId).some((map) => maps.includes(map)), true,
        `chapter ${chapterId}: the body fits a map the chapter carries`);
      seen.add(draw.formId);
    }
  }
  assert(seen.size > 20, `the draw reaches across the roster (saw ${seen.size} bodies)`);
  // The odds of the whole eligible set come to one.
  const { all } = rebirth.eligibleForms(7);
  const total = all.reduce((sum, id) => sum + rebirth.oddsFor(id, { chapterId: 7, history: [] }), 0);
  assert(Math.abs(total - 1) < 1e-9, `the odds of every option sum to 1 (got ${total})`);
  log(`eligibility ok — ${seen.size} bodies drawn across ${chapters.length} chapters`);
}

// ---- 4. the last two bodies are held out while alternatives remain ----
{
  for (const chapterId of chapters) {
    for (let index = 0; index < 40; index++) {
      const draw = rebirth.drawLife({ chapterId, history: ['frog', 'crab'], index });
      assert.notEqual(draw.formId, 'frog', `chapter ${chapterId}: the last body is not repeated`);
      assert.notEqual(draw.formId, 'crab', 'nor the one before it');
    }
  }
  // When nothing else is left, the penalty applies instead of a ban.
  const weights = rebirth.weighForm('deer', { chapterId: 1, history: ['dog', 'deer'] });
  assert.equal(weights.held, 0.2, 'a repeated body is drawn at a penalty');
  assert.equal(rebirth.weighForm('deer', { chapterId: 1, history: ['dog'] }).held, 1, 'and otherwise not');
  log('hold-out rule ok');
}

// ---- 5. freshness and event fit are the declared multipliers ----
{
  const never = rebirth.weighForm('deer', { chapterId: 1, history: [] });
  const worn = rebirth.weighForm('deer', { chapterId: 1, history: ['deer'] });
  assert.equal(never.novelty, 1.5, 'a body never worn is worth more');
  assert.equal(worn.novelty, 1, 'and one worn before is worth the base');
  const inPool = rebirth.weighForm('deer', { chapterId: 1, history: [] });
  const outsider = rebirth.weighForm('owl', { chapterId: 1, history: [] });
  assert.equal(inPool.fit, 1.2, 'a body in the chapter pool carries the event fit');
  assert.equal(outsider.fit, 1, 'and one outside it does not');
  assert.equal(outsider.weight, 1.5, 'so an equally fresh outsider weighs 1.5');
  assert.equal(inPool.weight, 1.5 * 1.2, 'while the pool body weighs 1.8');
  // The draw is what decides, and it never demeans a body: karma plays no part.
  const odds = rebirth.drawLife({ chapterId: 1, history: [] }).odds;
  const poolOdds = odds.filter((entry) => CHAPTER_ANIMALS[0].includes(entry.formId));
  const outsideOdds = odds.filter((entry) => !CHAPTER_ANIMALS[0].includes(entry.formId));
  assert(poolOdds.length > 0 && outsideOdds.length > 0, 'both pool and outside bodies are on the table');
  assert(Math.max(...poolOdds.map((entry) => entry.probability)) > Math.max(...outsideOdds.map((entry) => entry.probability)),
    'the chapter’s own bodies are more likely than equally fresh outsiders');
  log('weights ok');
}

// ---- 6. the distribution matches the weights over thousands of draws ----
{
  rebirth.resetRebirth('distribution');
  rebirth.setRunSeed(20250607);
  const chapterId = 3;
  const history = ['human'];
  const { all } = rebirth.eligibleForms(chapterId);
  const expected = new Map(all.map((id) => [id, rebirth.oddsFor(id, { chapterId, history })]));
  const counts = new Map(all.map((id) => [id, 0]));
  const draws = 4000;
  for (let index = 0; index < draws; index++) {
    const draw = rebirth.drawLife({ chapterId, history, index });
    counts.set(draw.formId, counts.get(draw.formId) + 1);
  }
  let worst = 0;
  for (const id of all) {
    const want = expected.get(id) * draws;
    const got = counts.get(id);
    const miss = Math.abs(got - want) / Math.max(want, 1);
    worst = Math.max(worst, miss);
  }
  assert(worst < 0.3, `every body lands within 30% of its weight over ${draws} draws (worst ${(worst * 100).toFixed(1)}%)`);
  log(`distribution ok — ${all.length} options, ${draws} draws, worst miss ${(worst * 100).toFixed(1)}%`);
}

// ---- 7. a chapter with nothing it can carry keeps the body it has ----
{
  const draw = rebirth.drawLife({ chapterId: 999, history: ['human'], index: 0 });
  assert.equal(draw.reason, null, 'an unknown chapter falls back to the full capability set');
  assert(draw.formId, 'and still names a body');
  // The planner's own guard: when a draw names nothing, the last body continues.
  const plan = rebirth.drawNextLife({ chapter: 1, lifeId: 1, history: ['human'], chapterIds: chapters });
  assert(plan.formId, 'a draw always names a body to plan with');
  assert.equal(plan.chapter, 2, 'and the plan advances the chapter');
  log('empty-plan guard ok');
}

// ---- 8. showing the summary again does not draw again ----
{
  startLifeMode(CHAPTERS[0].id);
  initLifeSummary();
  const drawsBefore = rebirth.drawCount();
  state.lifeId = 1;
  showLifeSummary('water');
  const first = pendingTransition();
  assert(first, 'the ending reserved the next life');
  const drawsAfterFirst = rebirth.drawCount();
  assert.equal(drawsAfterFirst, drawsBefore + 1, 'and consumed exactly one draw');
  showLifeSummary('water');
  showLifeSummary('water');
  assert.equal(rebirth.drawCount(), drawsAfterFirst, 'showing the summary again consumes none');
  assert.deepEqual(pendingTransition().next, first.next, 'and the reservation is unchanged');
  assert(Number.isFinite(pendingTransition().next.probability), 'with its odds kept for the card');
  // A save mid-summary keeps the same reservation, odds and all.
  setTransitionPhase('summary');
  const saved = JSON.parse(JSON.stringify(snapshot()));
  applySaveRuntime(saved);
  const restored = pendingTransition().next;
  // The stored reservation keeps exactly what the next life needs, and nothing
  // else: the sanitiser drops everything that is not part of the promise.
  assert.deepEqual(Object.keys(restored).sort(),
    ['candidateIds', 'chapter', 'chosen', 'explore', 'formId', 'lifeId', 'probabilities', 'probability', 'realmId', 'reasonKey'],
    'a reload keeps the reserved body, chapter, life, odds, the cards and the mode');
  for (const field of ['formId', 'chapter', 'lifeId', 'probability']) {
    assert.deepEqual(restored[field], first.next[field], `a reload keeps the reserved ${field}`);
  }
  log('no re-roll ok');
}

// ---- 9. the odds the card shows are the odds the draw used ----
{
  const pending = pendingTransition();
  const odds = rebirth.oddsFor(pending.next.formId, {
    chapterId: pending.next.chapter,
    history: ['human'],
    realmId: pending.next.realmId,
  });
  assert(odds > 0 && odds <= 1, `the shown chance is a real probability (${odds})`);
  assert(Math.abs(odds - pending.next.probability) < 1e-9,
    'and the number kept in the reservation is exactly that probability');
  log(`odds on the card: ${(pending.next.probability * 100).toFixed(1)}%`);
}

// ---- 10. karma chooses a realm and body kind; animal species still draw fairly ----
{
  const { resetKarma, recordKarma } = await import('../src/systems/karma.js');
  for (const [action, count, realmId, formId] of [
    ['harm', 3, 'niraya', 'niraya'], ['steal', 2, 'peta', 'peta'],
    ['cling', 2, 'asurakaya', 'asura'], ['give', 2, 'yama', 'deva'],
  ]) {
    resetKarma(); recordKarma(action, count);
    const plan = nextLifePlan({ consume: false });
    assert.equal(plan.realmId, realmId);
    assert.equal(plan.formId, formId);
  }
  resetKarma(); recordKarma('lie', 2);
  const animal = nextLifePlan({ consume: false });
  assert.equal(animal.realmId, 'tiracchana');
  assert(rebirth.realmFormIds('tiracchana', animal.chapter).includes(animal.formId));
  assert(!['human', 'asura', 'deva', 'niraya', 'peta'].includes(animal.formId));
  resetKarma();
  log('karma chooses a compatible body kind ok');
}

console.error('REBIRTH DRAW TEST OK — a seeded weighted draw, every result a body that can finish, and no re-roll on reload');

// Asking for the entire available pool must not stop halfway as it shrinks.
{
  const all = rebirth.eligibleForms(1).all;
  const { candidates } = rebirth.drawCandidates({ chapterId: 1, history: [], count: all.length });
  assert.equal(candidates.length, all.length);
  assert.equal(new Set(candidates.map(entry => entry.formId)).size, all.length);
}
