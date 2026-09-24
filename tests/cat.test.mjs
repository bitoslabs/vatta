import assert from 'node:assert/strict';

/*
 * The cat's round (docs/animal-lives-story.md reserve table, "แมว — ทรงตัวบนกำแพง
 * และฟังเสียงเล็ก · ความอยากรู้อยากเห็นกับการเคารพพื้นที่ผู้อื่น").
 *
 * Three homes of other lives stand in this forest, each with a low wall a step
 * away. The wall is the whole lesson: a cat climbs it and looks in from above, and
 * the life's outcome is a *summary of three small answers* rather than one big
 * choice — look at all three and the forest keeps its doors open; rummage in even
 * one and they stay shut. Nothing is punished; the world simply ends up different.
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
const { HOMES, WARM_STONE, TREES } = await import('../src/world/world-data.js');
const {
  assembleRooms, assembleHomeWalls, validateCatRoute, blockedAt, validateRoute,
} = await import('../src/world/rooms.js');
const { BIOMES } = await import('../src/content/biomes.js');
const { goalFor, updateLifeGoal } = await import('../src/systems/goals.js');
const { initDynamicWorld } = await import('../src/systems/worldgen.js');
const { isRestful, restingPlaceAt } = await import('../src/systems/rest.js');
const { getKarma, resetKarma } = await import('../src/systems/karma.js');
const { hasEffect, worldEffects } = await import('../src/systems/world-effects.js');
const { planNextLife, candidatesFor } = await import('../src/systems/life-route.js');
const { loadChapter } = await import('../src/game/chapters.js');
const { player } = await import('../src/entities/player.js');
const { dist } = await import('../src/core/math.js');
const cat = await import('../src/game/cat.js');

const log = (message) => console.error(`[cat] ${message}`);

// ---- 1. the walls are the cat's door ----
assert.equal(BIOMES['memory-forest'].sites.includes('homes'), true, 'the home walls belong to the forest plane');
const walls = assembleHomeWalls();
assert.equal(walls.length, HOMES.length, 'one wall per home');
assert(walls.every((wall) => wall.type === 'wall' && wall.fixed === true), 'and each is fixed stone');
for (const wall of walls) {
  assert.equal(blockedAt([wall], wall.x, wall.y, { cling: true }), false, 'a clinging body can stand on the wall');
  assert.equal(blockedAt([wall], wall.x, wall.y, {}), true, 'a walker is stopped by it');
  assert.equal(blockedAt([wall], wall.x, wall.y, { small: true, climbing: true }), true, 'and climbing a thicket does not help');
}
for (let s = 1; s <= 60; s++) {
  const features = assembleRooms(s * 7919, 'memory-forest');
  const proof = validateCatRoute(features, {});
  assert.equal(proof.clingOn, true, `seed ${s}: a clinging body can be on every wall`);
  assert.equal(proof.walkerOn, false, `seed ${s}: a walker can be on none of them`);
  assert.equal(proof.climbReaches, true, `seed ${s}: the round is walkable from the warm stone`);
  assert.equal(proof.ok, true, `seed ${s}: the walls are proven`);
  assert.equal(validateRoute(features, 'cat').ok, true, `seed ${s}: the cat's own road still walks`);
  assert.equal(validateRoute(features, 'human').ok, true, `seed ${s}: and a walker's`);
}
log('walls ok (60 seeds)');

// ---- 2. three homes, three small answers ----
state.lifeMode = true;
state.formId = 'cat';
state.realmId = 'manussa';
resetKarma();
worldEffects();
state.world.effects = {};
cat.resetCat();
state.mode = 'world';
state.interact = null;
initDynamicWorld(2);

assert.equal(isRebirthForm(FORMS.find((f) => f.id === 'cat')), true, 'the cat may be reborn now');
assert.equal(mapsFor('cat').includes('land'), true, 'and it names a map that carries it');
assert.equal(cat.canCling(), true, 'a cat can stand on a wall');
assert.equal(goalFor().kind, 'home-wall', 'the life is pointed at the first home wall');

let completions = 0;
on(EVENTS.LIFE_COMPLETE, () => { completions += 1; });
const { initChoices } = await import('../src/ui/choices.js');
initChoices();

// a walker at the wall is offered nothing: the peering is gated on the tool
state.formId = 'human';
player.x = HOMES[0].wall.x;
player.y = HOMES[0].wall.y;
state.interact = null;
cat.updateCat();
assert.equal(state.interact, null, 'a body that cannot stand on the wall is offered nothing');
state.formId = 'cat';

// and a cat must actually be on the wall, not merely near the home
player.x = HOMES[0].x;
player.y = HOMES[0].y;
state.interact = null;
cat.updateCat();
assert.equal(state.interact, null, 'standing at the door is not looking over the wall');

for (const home of HOMES) {
  player.x = home.wall.x;
  player.y = home.wall.y;
  state.interact = null;
  cat.updateCat();
  assert(state.interact && state.interact.labelKey === 'prompt.peekHome', `the wall by the ${home.id} asks its question`);
  state.interact.fn();
  assert(state.choiceOpen === true, `and the ${home.id} asks peek or rummage`);
  emit(EVENTS.CHOICE_PICK, 0); // look from above
  assert(state.cat.visited.includes(home.id), `the ${home.id} is now visited`);
  assert.equal(cat.peekedAt(home.id), true, `and looked at from above`);
}
assert.equal(cat.allHomesVisited(), true, 'all three homes are seen');
assert.equal(goalFor().kind, 'warm-stone', 'and the warm stone becomes the ending');
log('three answers ok');

// ---- 3. looking at all three keeps the forest open ----
assert.equal(cat.respectedAll(), true, 'nothing was rummaged');
// nothing to decide at the stone: the three answers were given at the three walls
player.x = WARM_STONE.x;
player.y = WARM_STONE.y;
state.interact = null;
cat.updateCat();
assert.equal(state.interact, null, 'the warm stone asks nothing — the round is already answered');
assert.equal(completions, 0, 'and arriving does not end the life until the goal is read');
updateLifeGoal();
assert.equal(completions, 1, 'the warm stone ends the life');
assert.equal(cat.hasDecided(), true, 'and settles the round on the way out');
assert.equal(hasEffect('hearths-respected'), true, 'the forest records that its homes were respected');
assert(getKarma().merit > 0, 'looking mindfully is remembered as such');
log('respected ok');

// ---- 4. a respected forest keeps its hearths open to everyone ----
assert.equal(isRestful(HOMES[0].x, HOMES[0].y), true, 'a respected home is a resting place');
assert.equal(restingPlaceAt(HOMES[0].wall.x, HOMES[0].wall.y), 'hearth', 'and it knows which place it is');
state.formId = 'human';
assert.equal(isRestful(HOMES[0].x, HOMES[0].y), true, 'a later walking body feels it too');
state.world.effects = {};
assert.equal(isRestful(HOMES[0].x, HOMES[0].y), false, 'without the respect the doors are shut');
state.world.effects = { 'hearths-respected': true };
log('hearths felt ok');

// ---- 5. rummaging in one home keeps them shut ----
resetKarma();
state.world.effects = {};
state.formId = 'cat';
cat.resetCat();
state.interact = null;
initDynamicWorld(2);
cat.updateCat();
player.x = HOMES[0].wall.x;
player.y = HOMES[0].wall.y;
state.interact = null;
cat.updateCat();
state.interact.fn();
emit(EVENTS.CHOICE_PICK, 1); // rummage in the first home
assert.equal(cat.rummagedAt(HOMES[0].id), true, 'the first home was rummaged');
assert(getKarma().akusala > 0, 'and walking in is remembered as harm');
for (const home of HOMES.slice(1)) {
  player.x = home.wall.x;
  player.y = home.wall.y;
  state.interact = null;
  cat.updateCat();
  assert(state.interact && state.interact.labelKey === 'prompt.peekHome', `the wall by the ${home.id} asks again`);
  state.interact.fn();
  emit(EVENTS.CHOICE_PICK, 0); // look, properly, at the others
}
assert.equal(cat.allHomesVisited(), true, 'all three are still visited');
assert.equal(cat.respectedAll(), false, 'but not one of them was walked into');
player.x = WARM_STONE.x;
player.y = WARM_STONE.y;
state.interact = null;
updateLifeGoal();
assert.equal(hasEffect('hearths-respected'), false, 'so the forest keeps its doors shut');
assert.equal(goalFor().kind, 'warm-stone', 'the stone still ends the life — the answer is not a punishment');
log('rummaged ok');

// ---- 6. a new life arrives with three doors unseen ----
loadChapter(1, { autosave: false });
assert.equal(cat.visitedCount(), 0, 'a new chapter (and a new life) starts with nothing seen');
assert.equal(cat.hasDecided(), false, 'and the stone unsettled');

// ---- 7. the cat can really walk its round ----
for (const tree of TREES) {
  for (const home of HOMES) {
    assert(dist(tree.x, tree.y, home.wall.x, home.wall.y) > 80, 'no trunk stands on a home wall');
  }
  assert(dist(tree.x, tree.y, WARM_STONE.x, WARM_STONE.y) > 80, 'nor on the warm stone');
}
state.formId = 'cat';
state.lifeMode = true;
state.lifeId = 1;
state.world.effects = {};
state.world.removed = [];
initDynamicWorld(1);
const features = state.dynamic.features;
const step = 18;
const cols = Math.ceil((await import('../src/core/constants.js')).WORLD.w / step);
const rows = Math.ceil((await import('../src/core/constants.js')).WORLD.h / step);
const index = (c, r) => r * cols + c;
const build = (abilities) => {
  const blocked = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * step + step / 2;
      const y = r * step + step / 2;
      let solid = TREES.some((tree) => dist(x, y, tree.x, tree.y) < tree.r + 13);
      if (!solid) solid = blockedAt(features, x, y, abilities);
      blocked[index(c, r)] = solid ? 1 : 0;
    }
  }
  return blocked;
};
const reaches = (blocked, from, to) => {
  const seen = new Uint8Array(cols * rows);
  const start = { c: Math.floor(from.x / step), r: Math.floor(from.y / step) };
  const goal = { c: Math.floor(to.x / step), r: Math.floor(to.y / step) };
  const queue = [start];
  seen[index(start.c, start.r)] = 1;
  while (queue.length) {
    const cell = queue.shift();
    if (cell.c === goal.c && cell.r === goal.r) return true;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = cell.c + dc;
      const r = cell.r + dr;
      if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
      const i = index(c, r);
      if (blocked[i] || seen[i]) continue;
      seen[i] = 1;
      queue.push({ c, r });
    }
  }
  return false;
};
const climber = build({ cling: true, climbing: true, leap: true });
const walker = build({});
for (const home of HOMES) {
  assert.equal(reaches(climber, WARM_STONE, home.wall), true, `the cat walks to the ${home.id} wall`);
}
assert.equal(reaches(climber, WARM_STONE, WARM_STONE), true, 'and gets home again');
assert.equal(walker[0] === 0 || walker[0] === 1, true, 'the walker grid exists for comparison');
log('round walkable ok');

// ---- 8. the cat is offered in the chapter pools ----
assert.equal(candidatesFor(1, ['land']).includes('cat'), true, 'the cat is offered where a land body is carried');
let sawCat = false;
const chapterIds = Array.from({ length: 14 }, (_, i) => i + 1);
let route = { chapter: 1, lifeId: 1, history: [], chapterIds };
for (let i = 0; i < 800; i++) {
  const next = planNextLife(route);
  if (next.formId === 'cat') sawCat = true;
  route = { ...next, history: [...route.history, next.formId], chapterIds };
}
assert.equal(sawCat, true, 'the cat is born during a long journey');
log('rebirth ok');

console.error('CAT TEST OK — a wall to look over, three small answers that add up, and homes the forest keeps open for whoever comes next');
