import assert from 'node:assert/strict';

/*
 * The bee's chain (docs/animal-lives-story.md reserve table, "ผึ้ง — เชื่อมดอกไม้
 * หลายจุด · งานเล็กของแต่ละตัวส่งผลต่อทั้งป่า").
 *
 * The first route in the game that is about *reach* rather than about tools: each
 * flower sits within a comfortable flight of the last, so the life is worked
 * through in order, and drifting off course only means flying back. What the bee
 * leaves at the far meadow becomes a plant in every later life — the only effect
 * that adds flowers to the world's own dressing.
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
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.performance = { now: () => 0 };

const { state } = await import('../src/core/state.js');
const { on, emit, EVENTS } = await import('../src/core/events.js');
const { FORMS, mapsFor, isRebirthForm } = await import('../src/content/forms.js');
const { BLOOMS, TREES } = await import('../src/world/world-data.js');
const {
  assembleRooms, assemblePollinatedBlooms, validateRoute, blockedAt,
} = await import('../src/world/rooms.js');
const { BIOMES } = await import('../src/content/biomes.js');
const { goalFor, updateLifeGoal } = await import('../src/systems/goals.js');
const { initDynamicWorld } = await import('../src/systems/worldgen.js');
const { getKarma, resetKarma } = await import('../src/systems/karma.js');
const { hasEffect, worldEffects } = await import('../src/systems/world-effects.js');
const { planNextLife, candidatesFor } = await import('../src/systems/life-route.js');
const { loadChapter } = await import('../src/game/chapters.js');
const { player } = await import('../src/entities/player.js');
const { dist } = await import('../src/core/math.js');
const bee = await import('../src/game/bee.js');

const log = (message) => console.error(`[bee] ${message}`);
const flowers = BLOOMS.flowers;

// ---- 1. the way is a chain of hops, each within reach ----
assert(flowers.length >= 5, 'the chain has flowers to work');
let previous = BLOOMS.hive;
let longest = 0;
for (const flower of flowers) {
  const hop = dist(previous.x, previous.y, flower.x, flower.y);
  longest = Math.max(longest, hop);
  assert(hop <= BLOOMS.flightRange, `every hop is within a flight (worst ${Math.round(longest)})`);
  previous = flower;
}
const lastHop = dist(previous.x, previous.y, BLOOMS.meadow.x, BLOOMS.meadow.y);
assert(lastHop <= BLOOMS.flightRange, 'and the meadow is one hop past the last flower');
assert(BIOMES['memory-forest'].sites.includes('seeds'), 'the forest still carries its other sites');
log('chain ok');

// ---- 2. the chain is worked in order, and only from within a flight ----
state.lifeMode = true;
state.formId = 'bee';
state.realmId = 'manussa';
resetKarma();
worldEffects();
state.world.effects = {};
bee.resetBee();
state.mode = 'world';
state.interact = null;
initDynamicWorld(2);

assert.equal(isRebirthForm(FORMS.find((f) => f.id === 'bee')), true, 'the bee may be reborn now');
assert.equal(mapsFor('bee').includes('air'), true, 'and it names a map that carries it');
assert.equal(goalFor().kind, 'flower', 'the life is first pointed at a flower');
assert.equal(goalFor().x, flowers[0].x, 'the first flower of the chain');

let completions = 0;
on(EVENTS.LIFE_COMPLETE, () => { completions += 1; });
const { initChoices } = await import('../src/ui/choices.js');
initChoices();

// sitting on a later flower does nothing at all: the hop is out of reach
player.x = flowers[3].x;
player.y = flowers[3].y;
assert.equal(bee.reachableFlower(), null, 'a flower three hops away cannot be worked yet');
bee.updateBee();
assert.equal(state.interact, null, 'so the game offers nothing');

// and the first flower only offers once the bee is on it
player.x = BLOOMS.hive.x;
player.y = BLOOMS.hive.y;
assert.equal(bee.reachableFlower()?.index, 0, 'from the hive the first flower is within a flight');
bee.updateBee();
assert.equal(state.interact, null, 'but the flower must be landed on to be worked');

for (const [index, flower] of flowers.entries()) {
  player.x = flower.x;
  player.y = flower.y;
  state.interact = null;
  bee.updateBee();
  assert(state.interact && state.interact.labelKey === 'prompt.pollinate', `flower ${index + 1} offers its pollen`);
  state.interact.fn();
  assert.equal(bee.visitedCount(), index + 1, `flower ${index + 1} is worked`);
  assert.equal(bee.flowerVisited(index), true, `and marked as worked`);
}
assert.equal(bee.allFlowersVisited(), true, 'the whole chain is worked');
assert.equal(goalFor().kind, 'meadow', 'now the meadow is where the question is');
log('chain worked ok');

// ---- 3. the meadow: share the pollen, and the forest grows flowers ----
player.x = BLOOMS.meadow.x;
player.y = BLOOMS.meadow.y;
state.interact = null;
bee.updateBee();
assert(state.interact && state.interact.labelKey === 'prompt.sharePollen', 'the meadow asks its question');
assert.equal(completions, 0, 'reaching the meadow does not end the life before the answer');
state.interact.fn();
emit(EVENTS.CHOICE_PICK, 0); // share it
assert.equal(bee.didShare(), true, 'the bee left a share in the far field');
assert.equal(hasEffect('forest-pollinated'), true, 'and the world records it');
assert(getKarma().merit > 0, 'sharing the pollen is remembered as giving');
assert.equal(goalFor().kind, 'hive', 'now the hive is where the life ends');

// ---- 4. a pollinated forest grows flowers in later lives ----
const plain = assembleRooms(777, 'memory-forest');
const pollinated = assembleRooms(777, 'memory-forest', { pollinated: true });
assert.equal(plain.filter((f) => f.type === 'bloom').length, 0, 'an unpollinated forest has none of those flowers');
const grown = pollinated.filter((f) => f.type === 'bloom');
assert(grown.length > 3, `a pollinated forest grows flowers along its road (${grown.length})`);
assert(grown.every((flower) => flower.r > 0 && flower.r < 60), 'and they are small dressing, not obstacles');
for (const flower of grown) {
  assert.equal(blockedAt([flower], flower.x, flower.y, {}), false, 'a flower blocks no one');
}
assert.equal(validateRoute(pollinated, 'human').ok, true, 'and the road still walks');
assert.equal(validateRoute(pollinated, 'deer').ok, true, 'for other bodies too');
assert(assemblePollinatedBlooms(777).length === grown.length, 'the same seed grows the same flowers');
log('pollinated forest ok');

// ---- 5. the hive ends the life ----
player.x = BLOOMS.hive.x;
player.y = BLOOMS.hive.y;
updateLifeGoal();
assert.equal(completions, 1, 'reaching the hive completes the life');
assert.equal(bee.settleHive(), true, 'and the world remembers the pollen was shared');
log('hive ok');

// ---- 6. keeping it all for the hive is also a life ----
resetKarma();
state.world.effects = {};
state.formId = 'bee';
bee.resetBee();
state.interact = null;
initDynamicWorld(2);
for (const flower of flowers) {
  player.x = flower.x;
  player.y = flower.y;
  state.interact = null;
  bee.updateBee();
  state.interact.fn();
}
player.x = BLOOMS.meadow.x;
player.y = BLOOMS.meadow.y;
state.interact = null;
bee.updateBee();
state.interact.fn();
emit(EVENTS.CHOICE_PICK, 1); // carry it all home
assert.equal(bee.didShare(), false, 'this bee kept every grain');
assert.equal(hasEffect('forest-pollinated'), false, 'so the forest was not pollinated');
assert.equal(getKarma().merit, 0, 'and nothing is recorded as giving');
assert(getKarma().tendencies.clinging > 0, 'the keeping is what it leaves in itself');
assert.equal(goalFor().kind, 'hive', 'the hive still ends the life — the choice is not a punishment');
log('keeping ok');

// ---- 7. a new life arrives with the whole chain waiting ----
loadChapter(1, { autosave: false });
assert.equal(bee.visitedCount(), 0, 'a new chapter (and a new life) starts with nothing gathered');
assert.equal(bee.hasDecided(), false, 'and the meadow undecided');

// ---- 8. the bee can really fly its chain ----
for (const tree of TREES) {
  for (const spot of [...flowers, BLOOMS.meadow, BLOOMS.hive]) {
    assert(dist(tree.x, tree.y, spot.x, spot.y) > 70, 'no trunk stands on a flower, the meadow or the hive');
  }
}
state.formId = 'bee';
state.lifeMode = true;
state.lifeId = 1;
state.world.effects = {};
state.world.removed = [];
initDynamicWorld(1);
const features = state.dynamic.features;
assert.equal(blockedAt(features, flowers[0].x, flowers[0].y, { flying: true }), false, 'a flying body reaches every flower');
log('flight ok');

// ---- 9. the bee is offered in the chapter pools ----
assert.equal(candidatesFor(3, ['land', 'air']).includes('bee'), true, 'the bee is offered where a flying body is carried');
let sawBee = false;
const chapterIds = Array.from({ length: 14 }, (_, i) => i + 1);
// Walk the lives the way the game does: the chapter and the life both advance,
// and the pool rotates, so every body in a pool comes round in time.
let route = { chapter: 1, lifeId: 1, history: [], chapterIds };
for (let i = 0; i < 700; i++) {
  const next = planNextLife(route);
  if (next.formId === 'bee') sawBee = true;
  route = { ...next, history: [...route.history, next.formId], chapterIds };
}
assert.equal(sawBee, true, 'the bee is born during a long journey');
log('rebirth ok');

console.error('BEE TEST OK — a chain of hops worked in order, a meadow that asks, and flowers the forest keeps because one bee shared');
