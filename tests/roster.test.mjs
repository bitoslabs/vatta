import assert from 'node:assert/strict';

/*
 * The roster audit (docs/animal-roster-audit.md, docs/next-production-plan.md
 * item 1): the real readiness table of every form in the game.
 *
 * "ครบหนึ่งตัว" means it can be *born* somewhere it can move, *walk* the plane it
 * is born into, *act* with its own tools, *reach* the goal its life points at, and
 * survive a save and a load. This suite derives all of that from the data, so a
 * newly added form is covered the day it appears — and the exceptions (the three
 * story bodies, and the one form whose goal is sealed until its own act) are named
 * here rather than skipped silently.
 */

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
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.performance = { now: () => 0 };

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const { state } = await import('../src/core/state.js');
const { FORMS, mapsFor } = await import('../src/content/forms.js');
const { BIOMES } = await import('../src/content/biomes.js');
const { CHAPTERS, chapterSpawn } = await import('../src/game/chapters.js');
const { CHAPTER_ANIMALS, candidatesFor } = await import('../src/systems/life-route.js');
const { goalFor, ENDING_GOALS } = await import('../src/systems/goals.js');
const { currentBiomeId } = await import('../src/systems/biome.js');
const { worldAbilities } = await import('../src/systems/worldgen.js');
const { resetTide } = await import('../src/systems/tide.js');
const { resetMoisture } = await import('../src/systems/moisture.js');
const { resetLight } = await import('../src/systems/light.js');
const {
  buildDynamicWorld, validateRoute, validateBoarRoute, validateElephantRoute, reachableBetween,
} = await import('../src/world/rooms.js');
const { inWater } = await import('../src/systems/forms.js');
const { snapshot, applySaveRuntime } = await import('../src/systems/save.js');
const { drawFormBody, FORM_PALETTES } = await import('../src/render/forms-sprites.js');

const GAME_DIR = fileURLToPath(new URL('../src/game', import.meta.url));
const log = (message) => console.error(`[roster] ${message}`);

/** Forms that are not born by the life cycle, with the reason they are here. */
const STORY_ONLY = new Map([
  ['human', 'the journey starts as a human (systems/life.js#startLifeMode)'],
  ['asura', 'realm-specific being with the shared story goal'],
  ['deva', 'realm-specific being with the shared story goal'],
  ['niraya', 'realm-specific being with the shared story goal'],
  ['peta', 'realm-specific being with the shared story goal'],
]);

/**
 * Forms whose first goal stands behind their own *act* rather than their ability, so
 * "walk to the goal" is the wrong question. Each is proven by its own site proof
 * instead — the proof that the act opens the way for the life that can do it.
 */
const GOAL_BEHIND_ACT = new Map([
  ['boar', (features) => validateBoarRoute(features).ok],
  ['elephant', (features) => validateElephantRoute(features).ok],
]);
// (The spider's first errand — the posts — is open ground; what stands behind its
// own act is the *ending*, the hollow past the fissure, and tests/spider.test.mjs
// proves that crossing for it.)

/**
 * Every plane a life can meet, not just the ones its own body suggests: a realm
 * decides the map (systems/biome.js), so any animal can be born in the city, the
 * garden, the market or the formless line. A goal that cannot be reached in one of
 * them is a wall across a life.
 */
const PLANES = ['memory-forest', 'woeful', 'light-garden', 'craving-market', 'formless', 'asura-city'];
const SEEDS = [7919, 15838];

/** The planes this body can actually be born into (systems/biome.js). */
function planesFor(form) {
  const planes = [...PLANES];
  if (form.abilities && form.abilities.burrow === true) planes.push('under-root');
  return planes;
}

// ---- 1. what every form must have, whatever it is ----
const goalsByLifeGoal = new Map();
const kindsByForm = new Map();
for (const form of FORMS) {
  assert.equal(typeof form.speed, 'number', `${form.id} has a speed`);
  assert.equal(typeof form.vision, 'number', `${form.id} has a vision range`);
  assert.equal(typeof form.waterSpeed, 'number', `${form.id} has a water speed`);
  assert(form.abilities && typeof form.abilities === 'object', `${form.id} declares its abilities`);
  assert(Array.isArray(form.maps) && form.maps.length > 0, `${form.id} declares the maps that can carry it`);
  assert.equal(mapsFor(form.id).length > 0, true, `${form.id} resolves to at least one map`);
  assert.equal(form.rebirth, true, `${form.id} is marked rebirth: true`);
  assert.equal(form.id === form.id.toLowerCase(), true, `${form.id} is a stable lowercase id`);

  // Art from code: its own palette, and a body that draws ops on a canvas. (The
  // deeper silhouette check lives in tests/render.test… / render-test harness.)
  assert(FORM_PALETTES[form.id], `${form.id} has its own palette`);
  const calls = [];
  const drawCtx = {
    save() { calls.push(1); }, restore() { calls.push(1); }, beginPath() { calls.push(1); },
    moveTo() { calls.push(1); }, lineTo() { calls.push(1); }, quadraticCurveTo() { calls.push(1); },
    arc() { calls.push(1); }, ellipse() { calls.push(1); }, closePath() { calls.push(1); },
    fill() { calls.push(1); }, stroke() { calls.push(1); }, fillRect() { calls.push(1); },
    translate() { calls.push(1); }, rotate() { calls.push(1); }, scale() { calls.push(1); },
    setLineDash() {}, createLinearGradient: () => ({ addColorStop() {} }),
  };
  drawFormBody(drawCtx, form.id, 100, 200, { face: 1, phase: 0.4, moving: true, bob: 0.5, act: 0.3 });
  assert(calls.length > 6, `${form.id} actually draws a body (${calls.length} ops)`);

  if (STORY_ONLY.has(form.id)) {
    assert.equal(CHAPTER_ANIMALS.flat().includes(form.id), false,
      `${form.id} stays out of the chapter pools, as the audit records`);
    continue;
  }

  // A body the life cycle may be born into must resolve to a goal it can act on.
  state.formId = form.id;
  const goal = goalFor();
  assert(typeof goal.x === 'number' && typeof goal.y === 'number', `${form.id} resolves to a goal position`);
  assert.equal(typeof goal.kind, 'string', `${form.id} resolves to a goal kind`);
  if (form.lifeGoal === undefined) {
    // The original bodies have no errand of their own: their life is ended by the
    // chapter they are walking (systems/goals.js), and the temple is a guide.
    assert.equal(goal.kind, 'land', `${form.id} without a lifeGoal is guided by the chapter's own goal`);
    continue;
  }
  assert.equal(typeof form.lifeGoal, 'string', `${form.id} declares a lifeGoal`);
  // One lifeGoal, one first goal kind: a shared kind is how two bodies came to
  // fight over one ending before (see the bat/owl and cat/crab collisions).
  assert.equal(kindsByForm.has(goal.kind), false,
    `first goal kind '${goal.kind}' belongs to one life only (saw ${kindsByForm.get(goal.kind)} and ${form.id})`);
  kindsByForm.set(goal.kind, form.id);
  if (!goalsByLifeGoal.has(form.lifeGoal)) goalsByLifeGoal.set(form.lifeGoal, goal.kind);
  assert.equal(goalsByLifeGoal.get(form.lifeGoal), goal.kind,
    `${form.id}: one lifeGoal always means one goal kind`);
}
assert.equal(FORMS.length, 33, 'the roster includes the two new lower-realm beings');
assert.equal(FORMS.length - STORY_ONLY.size, 28, 'and the rest are the 28 animals');
// Every ending kind is *declared* in one animal's own module and nowhere else: the
// collision guard for the whole set (a kind shared by two bodies ends the wrong
// life — see cat.js's own note about the crab's ending). Comments are stripped
// first, so a note about a neighbour's kind is not mistaken for a claim on it.
const stripComments = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').map((line) => line.replace(/\/\/.*$/, '')).join('\n');
const gameSources = readdirSync(GAME_DIR)
  .filter((name) => name.endsWith('.js'))
  .map((name) => ({ name, text: stripComments(readFileSync(`${GAME_DIR}/${name}`, 'utf8')) }));
const sharedEndings = [];
for (const kind of ENDING_GOALS) {
  const holders = gameSources.filter((file) => file.text.includes(`kind: '${kind}'`)).map((file) => file.name);
  if (holders.length > 1) sharedEndings.push(`${kind} (${holders.join(', ')})`);
}
assert.deepEqual(sharedEndings, [], 'no ending kind is claimed by two game modules');
log(`structure ok — ${FORMS.length} forms, ${kindsByForm.size} distinct first-goal kinds, ${ENDING_GOALS.size} ending kinds`);
log(`  endings each live in one module: ${gameSources.length} game modules read`);

// ---- 2. born: every animal is offered by a chapter, and can be drawn from it ----
const offered = new Set(CHAPTER_ANIMALS.flat());
for (const form of FORMS) {
  if (STORY_ONLY.has(form.id)) continue;
  assert.equal(offered.has(form.id), true, `${form.id} is offered by at least one chapter`);
  const chapters = CHAPTERS.filter((chapter) => candidatesFor(chapter.id).includes(form.id));
  assert(chapters.length > 0, `${form.id} survives the map/rebirth filter of at least one chapter`);
}
for (const id of offered) {
  assert(FORMS.some((form) => form.id === id), `pool entry '${id}' is a real form`);
}
log(`born ok — ${offered.size} forms offered across ${CHAPTERS.length} chapters`);

// ---- 3. walk and reach: born where it can move, and the goal its life points at ----
const waterBound = FORMS.filter((form) => form.waterBound === true);
for (const form of FORMS) {
  if (STORY_ONLY.has(form.id)) continue;
  // The abilities a life actually starts with: the body's own tools plus what the
  // world gives at this hour (low water, damp ground, light, empty hands).
  state.formId = form.id;
  resetTide();
  resetMoisture();
  resetLight();
  const abilities = worldAbilities();
  for (const plane of planesFor(form)) {
    for (const seed of SEEDS) {
      const built = buildDynamicWorld(seed, form.id, abilities, plane);
      assert.equal(built.validation.fallback, undefined,
        `${form.id} in ${plane} (seed ${seed}): the world assembles without falling back`);
      assert.equal(validateRoute(built.features, form.id, abilities, plane).ok, true,
        `${form.id} in ${plane} (seed ${seed}): its route walks`);
      assert.equal(built.features.length > 0, true, `${form.id} in ${plane}: the world has ground in it`);

      // Where the life enters, and whether it can get to what its life points at.
      const chapter = CHAPTERS[(seed + plane.length) % CHAPTERS.length];
      const spawn = chapterSpawn(chapter, { waterBound: form.waterBound === true, start: chapter.start });
      if (form.waterBound === true) {
        // A water-bound body is born into water, and its goal is on the water too.
        assert.equal(inWater(spawn.x, spawn.y), true, `${form.id}: born in water, not on the bank`);
        const goal = goalFor();
        assert.equal(inWater(goal.x, goal.y), true, `${form.id}: its goal is on the water`);
        continue;
      }
      if (GOAL_BEHIND_ACT.has(form.id)) continue; // proven by its own site proof
      const goal = goalFor();
      // "Reaching the goal" means getting to where the errand starts — beside a
      // solid goal if the goal itself is a thing (the buffalo's log), not inside it.
      assert.equal(reachableBetween(built.features, spawn, goal, abilities, goal.r + 60), true,
        `${form.id} in ${plane} (seed ${seed}): its first goal can be reached from where it is born`);
    }
  }
}
log(`walk + reach ok — ${FORMS.length - STORY_ONLY.size} forms × 2 seeds × their planes`);

// ---- 4. act: the one form whose goal is sealed by its own act is proven separately ----
for (const [id, proof] of GOAL_BEHIND_ACT) {
  const form = FORMS.find((entry) => entry.id === id);
  state.formId = id;
  const abilities = worldAbilities();
  for (const seed of SEEDS) {
    const features = buildDynamicWorld(seed, id, abilities, 'memory-forest').features;
    assert.equal(proof(features), true, `${id} (seed ${seed}): its goal opens by its own act`);
  }
  log(`  ${id}: goal sealed by its own act — proven by its site proof`);
}
log('act ok — the sealed goals are proven by their own site proofs');

// ---- 5. save and load: a life of any form survives the round trip ----
for (const form of FORMS) {
  state.formId = form.id;
  state.chapter = 3;
  state.lifeId = 7;
  state.lifeMode = true;
  state.world.effects = { 'span-built': true, 'hands-emptied': true };
  state.world.spans = [{ x: 2622, y: 1627 }];
  state.world.dug = [{ x: 3900, y: 2440 }];
  state.world.released = [{ x: 2450, y: 1960 }];
  // A real save is a JSON string in a slot, so the round trip goes through JSON.
  const save = JSON.parse(JSON.stringify(snapshot()));
  state.formId = 'human';
  state.chapter = 1;
  state.lifeId = 1;
  state.world.effects = {};
  state.world.spans = [];
  state.world.dug = [];
  state.world.released = [];
  applySaveRuntime(save);
  assert.equal(state.formId, form.id, `${form.id}: the form comes back`);
  assert.equal(state.lifeId, 7, `${form.id}: the life comes back`);
  assert.equal(state.chapter, 3, `${form.id}: the chapter comes back`);
  assert.equal(state.world.effects['span-built'], true, `${form.id}: what the world remembers comes back`);
  assert.equal(state.world.effects['hands-emptied'], true, `${form.id}: every effect comes back`);
  assert.equal(state.world.spans.length, 1, `${form.id}: what a life built comes back`);
  assert.equal(state.world.dug.length, 1, `${form.id}: what a life rooted open comes back`);
  assert.equal(state.world.released.length, 1, `${form.id}: what a life let go comes back`);
}
log('save/load ok — all forms round-trip, with what the world remembered');

// ---- 6. the table itself: what the audit asked to be able to read ----
const planes = currentBiomeId() ? Object.keys(BIOMES).length : 0;
log(`planes ${planes} · water-bound bodies: ${waterBound.map((form) => form.id).join(', ')}`);
log('  form       goal (first errand)        maps');
for (const form of FORMS) {
  if (STORY_ONLY.has(form.id)) {
    log(`  ${form.id.padEnd(10)} story/lab only — ${STORY_ONLY.get(form.id)}`);
    continue;
  }
  state.formId = form.id;
  const kind = goalFor().kind;
  const note = form.lifeGoal === undefined
    ? `${kind} (the chapter ends this life)`
    : `${kind}${ENDING_GOALS.has(kind) ? ' (ends here)' : ''}`;
  log(`  ${form.id.padEnd(10)} ${note.padEnd(28)} ${mapsFor(form.id).join('+')}`);
}

// ---- 7. the water spawn does not move a walking body ----
{
  const start = { x: 620, y: 1680 };
  const walker = chapterSpawn({ start }, { waterBound: false, start });
  assert.deepEqual(walker, start, 'a walking body enters where the chapter says');
  const fish = chapterSpawn({ start }, { waterBound: true, start });
  assert.equal(inWater(fish.x, fish.y), true, 'and a water-bound body enters the water');
  assert.notDeepEqual(fish, start, 'which is not the bank');
}
log('spawn ok');

console.error(`ROSTER TEST OK — ${FORMS.length} forms audited: structure, birth, route, goal, act and save`);
