import assert from 'node:assert/strict';

/*
 * The elephant's grove (docs/animal-lives-story.md ch.11, "กำลังที่คุ้มครอง").
 *
 * Strength is not the question; where it is put is. The mouth is shut until a
 * strong body lifts the log, the small have their own crawlway either way, and
 * the two nests under the log decide what the act costs.
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
const {
  assembleRooms, assembleGrove, groveWithoutLog, validateElephantRoute,
  validateRabbitRoute, validateSnakeRoute, validateFrogRoute, blockedAt,
} = await import('../src/world/rooms.js');
const { GROVE, GROVE_APPROACH, TREES } = await import('../src/world/world-data.js');
const { BIOMES } = await import('../src/content/biomes.js');
const { goalFor, updateLifeGoal } = await import('../src/systems/goals.js');
const { initDynamicWorld } = await import('../src/systems/worldgen.js');
const { getKarma, resetKarma } = await import('../src/systems/karma.js');
const { hasEffect, worldEffects } = await import('../src/systems/world-effects.js');
const { planNextLife } = await import('../src/systems/life-route.js');
const { loadChapter } = await import('../src/game/chapters.js');
const { player } = await import('../src/entities/player.js');
const elephant = await import('../src/game/elephant.js');

const log = (message) => console.error(`[elephant] ${message}`);
const wall = assembleGrove();

// ---- 1. one wall, two ways: the log and the crawlway ----
assert(wall.some((f) => f.type === 'log'), 'the log lies across the mouth');
assert(wall.some((f) => f.type === 'crawlway'), 'and a crawlway sits in the wall beside it');
assert(wall.every((f) => f.fixed === true), 'the wall is fixed geometry, not seed dressing');
assert(BIOMES['memory-forest'].sites.includes('grove'), 'the grove belongs to the forest plane');

const logRock = wall.find((f) => f.type === 'log');
const crawl = wall.find((f) => f.type === 'crawlway');
assert.equal(blockedAt([logRock], logRock.x, logRock.y, {}), true, 'the log blocks a walker');
assert.equal(blockedAt([logRock], logRock.x, logRock.y, { strong: true }), true, 'and it is not lifted by walking into it — the strong must choose');
assert.equal(blockedAt([logRock], logRock.x, logRock.y, { flying: true }), false, 'a flyer passes over it');
assert.equal(blockedAt([crawl], crawl.x, crawl.y, { small: true }), false, 'a small body slips through the crawlway');
assert.equal(blockedAt([crawl], crawl.x, crawl.y, {}), true, 'a walker is stopped by the crawlway');
assert.equal(blockedAt([crawl], crawl.x, crawl.y, { strong: true }), true, 'and strength is no use in a crawlway');

for (let s = 1; s <= 60; s++) {
  const features = assembleRooms(s * 7919, 'memory-forest');
  const proof = validateElephantRoute(features, {});
  assert.equal(proof.beforeLifting, false, `seed ${s}: the grove is shut before the lift`);
  assert.equal(proof.afterLifting, true, `seed ${s}: and open after it`);
  assert.equal(proof.smallWithoutLifting, true, `seed ${s}: the small road never needed the lift`);
  assert.equal(proof.walkerReaches, false, `seed ${s}: and a body with no tool at all gets nowhere`);
  assert.equal(proof.ok, true, `seed ${s}: the grove is proven`);
  // the other sites are undisturbed
  assert.equal(validateRabbitRoute(features, {}).ok, true, `seed ${s}: the field is still proven`);
  assert.equal(validateSnakeRoute(features, {}).ok, true, `seed ${s}: the crevice is still proven`);
  assert.equal(validateFrogRoute(features, {}).ok, true, `seed ${s}: the marsh is still proven`);
  // and the grove really is gone from the world once the log is lifted
  assert(groveWithoutLog(features).every((f) => f.type !== 'log'), `seed ${s}: lifting removes the log`);
}
log('grove proof ok (60 seeds)');

// ---- 2. lifting clear keeps the nests whole ----
state.lifeMode = true;
state.formId = 'elephant';
state.realmId = 'manussa';
resetKarma();
worldEffects();
state.world.effects = {};
state.world.crushed = [];
elephant.resetElephant();

assert.equal(isRebirthForm(FORMS.find((f) => f.id === 'elephant')), true, 'the elephant may be reborn now');
assert.equal(mapsFor('elephant').includes('land'), true, 'and it names a map that carries it');
assert.equal(elephant.isLifted(), false, 'a new life arrives at a log that is still across the mouth');
assert.equal(elephant.waysJoined(), false, 'and with the ways unjoined');

let completions = 0;
on(EVENTS.LIFE_COMPLETE, () => { completions += 1; });

const goal = goalFor();
assert.equal(goal.kind, 'grove', 'the elephant\'s life ends in the grove');
assert.equal(goal.x, GROVE.grove.x, 'the grove, in x');

state.mode = 'world';
// the world this life walks: the forest plane, where the walled grove stands
initDynamicWorld(2);
assert(state.dynamic.features.some((f) => f.type === 'log'), 'the log is on the map this life walks');
player.x = GROVE.log.x;
player.y = GROVE.log.y;
elephant.updateElephant();
assert(state.interact && state.interact.labelKey === 'prompt.liftLog', 'the log offers itself to strength');

const { initChoices } = await import('../src/ui/choices.js');
initChoices();
state.interact.fn();
assert(state.choiceOpen === true, 'the log asks how it should be moved');
emit(EVENTS.CHOICE_PICK, 0); // lift it clear
assert.equal(elephant.isLifted(), true, 'the log is lifted');
assert.deepEqual(elephant.crushedNests(), [], 'and no little nest was crushed');
assert.equal(hasEffect('ways-joined'), true, 'the ways are joined (the large road and the small)');
assert(getKarma().merit > 0, 'sparing the nests is remembered as giving');
assert(getKarma().akusala === 0, 'and no harm was recorded');

// the log really left the world, and stays gone for later lives
initDynamicWorld(2);
assert(!state.dynamic.features.some((f) => f.type === 'log'), 'the log is gone from the map');
log('careful lift ok');

// ---- 3. the nest that was spared is cover for small lives ----
assert.equal(elephant.inNestCover(GROVE.nests[0].x, GROVE.nests[0].y), true, 'a whole nest shelters small bodies');
assert.equal(elephant.inNestCover(GROVE.grove.x, GROVE.grove.y), false, 'the middle of the grove is not cover');
state.world.effects = {};
assert.equal(elephant.inNestCover(GROVE.nests[0].x, GROVE.nests[0].y), false, 'without the joined ways a nest shelters no one');
state.world.effects = { 'ways-joined': true };
log('nest cover ok');

// ---- 4. reaching the grove ends the life ----
player.x = GROVE.grove.x;
player.y = GROVE.grove.y;
updateLifeGoal();
assert.equal(completions, 1, 'standing in the grove completes the life');
assert.equal(elephant.gatherInGrove(), true, 'and the world remembers the ways were joined');

// ---- 5. shoving it the quick way costs the nests ----
resetKarma();
state.world.effects = {};
state.world.crushed = [];
// A fresh world for the other answer: the careful lift removed that log for good
// (which is the point of the joined ways), so this run needs its own log.
state.world.removed = [];
state.mode = 'world';
elephant.resetElephant();
initDynamicWorld(2);
player.x = GROVE.log.x;
player.y = GROVE.log.y;
state.interact = null;
elephant.updateElephant();
state.interact.fn();
emit(EVENTS.CHOICE_PICK, 1); // shove it
assert.equal(elephant.isLifted(), true, 'the log still moves');
assert.equal(elephant.crushedNests().length > 0, true, 'but the nests beneath it do not survive');
assert.equal(hasEffect('ways-joined'), false, 'so the ways are not joined');
assert(getKarma().akusala > 0, 'and the harm is remembered');
assert.deepEqual(state.world.crushed, elephant.crushedNests(), 'the crushed nests stay on the world record');
assert.equal(elephant.inNestCover(GROVE.nests[0].x, GROVE.nests[0].y), false, 'a broken nest shelters no one');
assert.equal(goalFor().kind, 'grove', 'the grove still ends the life — the choice is not a punishment');
log('quick lift ok');

// ---- 6. a new life arrives at the log again (the world kept the harm, not the moment) ----
loadChapter(1, { autosave: false });
assert.equal(elephant.isLifted(), false, 'a new chapter (and a new life) starts with the log across the mouth');
assert.equal(elephant.waysJoined(), false, 'and the ways unjoined again');

// ---- 7. the elephant can really walk its errand ----
for (const tree of TREES) {
  for (let i = 0; i < GROVE_APPROACH.length - 1; i++) {
    const [ax, ay] = GROVE_APPROACH[i];
    const [bx, by] = GROVE_APPROACH[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    const tt = Math.max(0, Math.min(1, ((tree.x - ax) * dx + (tree.y - ay) * dy) / (len * len)));
    const distance = Math.hypot(tree.x - (ax + dx * tt), tree.y - (ay + dy * tt));
    assert(distance > tree.r + 13 + 12, 'the errand is kept clear of trunks');
  }
}
log('errand clear ok');

// ---- 8. the elephant is offered in the chapter pools ----
let sawElephant = false;
const chapterIds = Array.from({ length: 14 }, (_, i) => i + 1);
let route = { chapter: 1, lifeId: 1, history: ['human'], chapterIds };
for (let i = 0; i < 400; i++) {
  const next = planNextLife(route);
  if (next.formId === 'elephant') sawElephant = true;
  route = { ...next, history: [...route.history, next.formId], chapterIds };
}
assert.equal(sawElephant, true, 'the elephant is born during a long journey');
assert.equal(FORMS.every((f) => isRebirthForm(f)), true, 'every body of the roster can be reborn now');
log('rebirth ok');

console.error('ELEPHANT TEST OK — one wall with two ways, strength placed carefully, and the nests it keeps or pays for');
