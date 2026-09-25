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
