import assert from 'node:assert/strict';

/*
 * The levels' ending conditions (the user's question: "กวดเงื่อนไขตอนจบเลเวล").
 *
 * Two things are checked here, because they are the two ways a level's end can go
 * wrong: an end card that cannot be read (a label or lesson with no translation),
 * and a level that ends without its own conditions being met. The third — that a
 * bad life is never *handed* a body as a verdict — is checked where the draw lives
 * (tests/rebirth-draw.test.mjs §10) and shown on the summary card itself
 * (`life.draw.note`).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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
globalThis.window = { matchMedia: () => ({ matches: false }), addEventListener() {}, location: { reload() {} } };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
let nextTimer = 0;
globalThis.setInterval = () => ++nextTimer;
globalThis.clearInterval = () => {};

const { state } = await import('../src/core/state.js');
const { MODE, WORLD } = await import('../src/core/constants.js');
const { CHAPTERS, loadChapter } = await import('../src/game/chapters.js');
const { ENDING_GOALS } = await import('../src/systems/goals.js');
const { showLifeSummary, initLifeSummary } = await import('../src/ui/life-summary.js');
const { showEndScreen } = await import('../src/ui/end-screen.js');

const GAME_DIR = fileURLToPath(new URL('../src/game', import.meta.url));
const log = (message) => console.error(`[levels] ${message}`);

// ---- 1. every level is a whole level: labels, lesson and a place to stand ----
{
  const locales = ['th', 'lo', 'en'].map((lang) => ({
    lang,
    text: readFileSync(fileURLToPath(new URL(`../src/locales/${lang}.js`, import.meta.url)), 'utf8'),
  }));
  const ids = CHAPTERS.map((chapter) => chapter.id);
  assert.deepEqual(ids, ids.slice().sort((a, b) => a - b), 'chapters are in order');
  assert.equal(new Set(ids).size, ids.length, 'and each id appears once');
  assert.equal(ids[0], 1, 'the journey starts at chapter one');
  const missing = [];
  for (const chapter of CHAPTERS) {
    for (const key of [chapter.nameKey, chapter.subtitleKey, chapter.meterKey, chapter.mindHintKey,
      chapter.end.titleKey, chapter.end.nameKey, chapter.end.lessonKey, chapter.end.statsKey]) {
      if (!key) { missing.push(`chapter ${chapter.id}: a label is missing`); continue; }
      for (const locale of locales) if (!locale.text.includes(`'${key}'`)) missing.push(`${locale.lang}: ${key}`);
    }
    for (const place of [chapter.start, chapter.checkpoint]) {
      assert(Number.isFinite(place?.x) && Number.isFinite(place?.y),
        `chapter ${chapter.id}: a start or checkpoint is a real place`);
      assert(place.x > 0 && place.y > 0 && place.x < WORLD.w && place.y < WORLD.h,
        `chapter ${chapter.id}: its start and checkpoint are inside the world`);
    }
  }
  assert.deepEqual(missing, [], 'every level reads in all three languages');
  log(`levels ok — ${CHAPTERS.length} chapters, ${CHAPTERS.length * 8} labels × 3 locales`);
}

// ---- 2. in life mode a level's end hands over to the life's end, not the chapter ----
{
  startLife();
  const chapter = state.chapter;
  showEndScreen();
  assert.equal(state.chapter, chapter, 'ending a level in life mode does not advance the chapter');
  assert.equal(state.mode, MODE.END, 'it stops the world for the ending');
  assert.equal(query('#lifeSummary').classList.contains('hidden'), false, 'and shows the life summary');
  log('a level end is a life end ok');
}

// ---- 3. every ending a life can reach is handled where endings are handled ----
{
  const source = readFileSync(`${GAME_DIR}/../systems/goals.js`, 'utf8');
  const unhandled = [...ENDING_GOALS].filter((kind) => !source.includes(`goal.kind === '${kind}'`));
  // 'water' is the one ending that simply completes: a fish reaches the river and
  // the life is over, with no further act to settle (systems/goals.js). Every other
  // ending names the thing that is settled by reaching it.
  assert.deepEqual(unhandled, ['water'], 'every ending kind is handled except the one that simply completes');
  const gameFiles = readFileSync(`${GAME_DIR}/chapters.js`, 'utf8');
  assert(gameFiles.includes('initDynamicWorld'), 'and the chapter builds its level before the life walks it');
  log(`endings ok — ${ENDING_GOALS.size} kinds, all handled`);
}

// ---- 4. a level's own end is never reached by walking into an ending by accident ----
{
  // A 'land' life is ended by its chapter, not by standing somewhere: the temple is
  // a guide only (systems/goals.js#updateLifeGoal reads ENDING_GOALS).
  startLife();
  state.formId = 'deer';
  state.lifeMode = true;
  state.lifeId = 1;
  state.lifeLog = [];
  const { updateLifeGoal } = await import('../src/systems/goals.js');
  const { TEMPLE } = await import('../src/core/constants.js');
  const { player } = await import('../src/entities/player.js');
  player.x = TEMPLE.x;
  player.y = TEMPLE.y;
  let completed = 0;
  const { on, EVENTS } = await import('../src/core/events.js');
  on(EVENTS.LIFE_COMPLETE, () => { completed += 1; });
  // A previous section left the summary open; this section is about what the walk
  // to the temple does *not* do.
  query('#lifeSummary').classList.add('hidden');
  updateLifeGoal();
  assert.equal(completed, 0, 'a land life is not ended by standing at the temple');
  assert.equal(query('#lifeSummary').classList.contains('hidden'), true, 'and no summary appears');
  log('no accidental ending ok');
}

// ---- 5. chapter seven teaches release and continues to chapter eight ----
{
  const { updateChapter7 } = await import('../src/game/story-chapter7.js');
  const { advanceDialogue, resetDialogue } = await import('../src/ui/dialogue.js');
  const { initChoices } = await import('../src/ui/choices.js');
  const { pendingTransition, resetTransition } = await import('../src/systems/transition.js');
  const { emit, EVENTS } = await import('../src/core/events.js');
  const { player } = await import('../src/entities/player.js');
  const { TEMPLE } = await import('../src/core/constants.js');
  initChoices();
  state.lifeId = 7;
  resetTransition();
  state.lifeMode = true;
  state.liberated = false;
  loadChapter(7, { autosave: false });
  resetDialogue();
  player.x = TEMPLE.x;
  player.y = TEMPLE.y;
  updateChapter7(0);
  for (let i = 0; i < 8 && state.dialogueOpen; i++) advanceDialogue();
  assert.equal(state.choiceOpen, true, 'the seventh chapter offers its final reflection');
  emit(EVENTS.CHOICE_PICK, 1);
  for (let i = 0; i < 8 && state.dialogueOpen; i++) advanceDialogue();
  assert.equal(state.liberated, false, 'choosing release in chapter seven does not end the journey');
  assert.equal(query('#lifeSummary').classList.contains('hidden'), false,
    'the seventh chapter shows a life summary');
  assert.equal(pendingTransition()?.next?.chapter, 8, 'the reserved next life enters chapter eight');
  const { snapshot, readSave, applySaveRuntime } = await import('../src/systems/save.js');
  const legacy = { ...snapshot(), chapter: 7, lifeMode: true, liberated: true, journeyComplete: true };
  const savedEffects = legacy.world.effects;
  globalThis.localStorage = { getItem: () => JSON.stringify(legacy), setItem() {}, removeItem() {} };
  const restored = readSave(1);
  assert.equal(restored.liberated, false, 'an old chapter-seven ending is reopened');
  assert.equal(restored.journeyComplete, false, 'an old completed-run flag cannot block chapter eight');
  assert.deepEqual(restored.world.effects, savedEffects, 'migration keeps the world effects');
  applySaveRuntime(restored);
  assert.equal(state.liberated, false, 'loading the old save can continue the journey');
  assert.equal(state.journeyComplete, false, 'the restored journey remains active');
  log('chapter seven continues ok');
}

// ---- 6. partial release at the real finale still leads to another life ----
{
  const { updateChapter14 } = await import('../src/game/story-chapter14.js');
  const { advanceDialogue, resetDialogue } = await import('../src/ui/dialogue.js');
  const { resetTransition, pendingTransition } = await import('../src/systems/transition.js');
  const { importPath } = await import('../src/systems/path.js');
  const { resetKarma, recordKarma } = await import('../src/systems/karma.js');
  const { isPrototypeComplete, journeyReadiness } = await import('../src/systems/life.js');
  const { emit, EVENTS } = await import('../src/core/events.js');
  const { player } = await import('../src/entities/player.js');
  const { TEMPLE } = await import('../src/core/constants.js');
  resetKarma();
  state.lifeId = 14;
  state.lifeMode = true;
  state.liberated = false;
  resetTransition();
  loadChapter(14, { autosave: false });
  recordKarma('meditate');
  recordKarma('give', 2);
  recordKarma('compassion');
  recordKarma('letgo');
  importPath([]);
  assert.equal(journeyReadiness().ready, true, 'the journey memory is ready for the mirror court');
  assert.equal(isPrototypeComplete(), false, 'readiness alone cannot end chapter fourteen before a choice');
  resetDialogue();
  player.x = TEMPLE.x;
  player.y = TEMPLE.y;
  updateChapter14(0);
  for (let i = 0; i < 8 && state.dialogueOpen; i++) advanceDialogue();
  assert.equal(state.choiceOpen, true, 'the last chapter offers a partial release');
  emit(EVENTS.CHOICE_PICK, 0);
  assert.equal(state.liberated, false, 'partial release does not claim liberation');
  assert.equal(isPrototypeComplete(), false, 'the mirror court cannot override an explicit choice to continue');
  const { snapshot, applySaveRuntime } = await import('../src/systems/save.js');
  const partialSave = snapshot();
  state.finalChoice = null;
  applySaveRuntime(partialSave);
  assert.equal(state.finalChoice, 'continue', 'a reload remembers the choice to continue');
  for (let i = 0; i < 8 && state.dialogueOpen; i++) advanceDialogue();
  assert.equal(pendingTransition()?.next?.chapter, 1, 'a continuing life cycles back to chapter one');
  log('partial release continues ok');
}

// ---- 7. the complete path alone offers and applies the final exit ----
{
  const { updateChapter14 } = await import('../src/game/story-chapter14.js');
  const { advanceDialogue, resetDialogue } = await import('../src/ui/dialogue.js');
  const { resetTransition, pendingTransition } = await import('../src/systems/transition.js');
  const { resetKarma, recordKarma } = await import('../src/systems/karma.js');
  const { resetPath, unlockedCount } = await import('../src/systems/path.js');
  const { keptPreceptCount } = await import('../src/systems/precepts.js');
  const { emit, EVENTS } = await import('../src/core/events.js');
  const { player } = await import('../src/entities/player.js');
  const { TEMPLE } = await import('../src/core/constants.js');
  resetKarma();
  resetPath();
  recordKarma('mindful', 3);
  recordKarma('give', 2);
  recordKarma('letgo');
  recordKarma('meditate', 2);
  assert.equal(unlockedCount(), 8, 'the complete path has all eight factors');
  assert.equal(keptPreceptCount(), 5, 'the five precepts remain kept');
  state.lifeId = 28;
  state.lifeMode = true;
  resetTransition();
  loadChapter(14, { autosave: false });
  resetDialogue();
  player.x = TEMPLE.x;
  player.y = TEMPLE.y;
  updateChapter14(0);
  for (let i = 0; i < 8 && state.dialogueOpen; i++) advanceDialogue();
  assert.equal(state.choiceOpen, true);
  emit(EVENTS.CHOICE_PICK, 0);
  assert.equal(state.liberated, true, 'the fully qualified release exits the wheel');
  assert.equal(state.finalChoice, 'free');
  const { isPrototypeComplete } = await import('../src/systems/life.js');
  assert.equal(isPrototypeComplete(), true, 'the completion check agrees with the accepted final exit');
  for (let i = 0; i < 8 && state.dialogueOpen; i++) advanceDialogue();
  assert.equal(pendingTransition(), null, 'a true ending does not reserve another birth');
  log('complete path exits ok');
}

function startLife() {
  initLifeSummary();
  state.lifeMode = true;
  state.lifeLog = [];
  state.lifeId = 1;
  state.liberated = false;
  state.journeyComplete = false;
  loadChapter(CHAPTERS[0].id);
  for (let i = 0; i < 24; i++) { /* letting the intro dialogue be */ }
}

console.error('LEVELS TEST OK — every level reads in three languages, ends into the life summary, and never ends by accident');
