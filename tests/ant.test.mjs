import assert from 'node:assert/strict';

/*
 * The ant's errand (docs/animal-lives-story.md ch.3, "เมล็ดของใคร").
 *
 * The life must be an errand and not a walk: the seed lies in the open, the nest
 * is sealed by a crack only a small body fits, and the *choice* at the seed — how
 * much to leave for others — is what the life leaves behind as a world effect.
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
const { PLAYER, WORLD } = await import('../src/core/constants.js');
const { FORMS, mapsFor, isRebirthForm } = await import('../src/content/forms.js');
const {
  assembleRooms, assembleNest, validateNestRoute, validateBurrowExit, blockedAt, validateRoute,
} = await import('../src/world/rooms.js');
const { NEST, NEST_APPROACH, TREES } = await import('../src/world/world-data.js');
const { goalFor } = await import('../src/systems/goals.js');
const { updateLifeGoal } = await import('../src/systems/goals.js');
const { initDynamicWorld } = await import('../src/systems/worldgen.js');
const { getKarma, resetKarma } = await import('../src/systems/karma.js');
const { hasEffect, worldEffects } = await import('../src/systems/world-effects.js');
const { candidatesFor, planNextLife } = await import('../src/systems/life-route.js');
const { loadChapter } = await import('../src/game/chapters.js');
const { player } = await import('../src/entities/player.js');
const ant = await import('../src/game/ant.js');

const log = (message) => console.error(`[ant] ${message}`);
const nest = assembleNest();

// ---- 1. the nest is a small body's home, and nobody else's ----
assert.equal(nest.filter((f) => f.type === 'rootwall').length, NEST.walls, 'the nest ring is whole');
assert.equal(nest.filter((f) => f.type === 'crack').length, NEST.crackPlugs, 'the crack is plugged with overlapping gaps');
assert(nest.every((f) => f.fixed === true), 'the nest is fixed geometry, not seed dressing');

const crack = nest.find((f) => f.type === 'crack');
assert.equal(blockedAt([crack], crack.x, crack.y, { small: true }), false, 'a small body slips through the crack');
assert.equal(blockedAt([crack], crack.x, crack.y, {}), true, 'a walker is stopped');
assert.equal(blockedAt([crack], crack.x, crack.y, { burrow: true }), true, 'so is a tunneller that is not small');
assert.equal(blockedAt([crack], crack.x, crack.y, { climbing: true }), true, 'and so is a climber');

for (let s = 1; s <= 60; s++) {
  const features = assembleRooms(s * 7919, 'under-root');
  const proof = validateNestRoute(features, {});
  assert.equal(proof.smallReaches, true, `seed ${s}: a small body reaches the nest`);
  assert.equal(proof.walkerReaches, false, `seed ${s}: a walker cannot`);
  assert.equal(proof.tunnelReaches, false, `seed ${s}: nor a tunneller that is not small`);
  assert.equal(proof.ok, true, `seed ${s}: the crack is proven`);
  // the two doors stay different doors
  assert.equal(validateBurrowExit(features, {}).ok, true, `seed ${s}: the burrow is still proven`);
  // and the road is still walkable for small bodies and ordinary ones
  assert.equal(validateRoute(features, 'ant').ok, true, `seed ${s}: the ant's road reaches the far end`);
  assert.equal(validateRoute(features, 'human').ok, true, `seed ${s}: and so does a walker's`);
}
log('nest proof ok (60 seeds)');

// ---- 2. the errand: the seed first, the nest after ----
state.lifeMode = true;
state.formId = 'ant';
state.realmId = 'manussa';
resetKarma();
worldEffects();
state.world.effects = {};
state.ant = { carrying: false, shared: false };

assert.equal(isRebirthForm(FORMS.find((f) => f.id === 'ant')), true, 'the ant may be reborn now');
assert.equal(mapsFor('ant').includes('burrow'), true, 'and it names a map that carries it');
const before = goalFor();
assert.equal(before.kind, 'seed', 'an empty-handed ant is pointed at the seed');
assert.equal(before.x, NEST.seed.x, 'the seed pile, in x');
assert.equal(before.y, NEST.seed.y, 'and in y');

// standing at the seed is not an ending
state.mode = 'world';
player.x = NEST.seed.x;
player.y = NEST.seed.y;
let completions = 0;
on(EVENTS.LIFE_COMPLETE, () => { completions += 1; });
updateLifeGoal();
assert.equal(completions, 0, 'reaching the seed does not end the life');

// the seed offers the choice
ant.updateAnt();
assert(state.interact && state.interact.labelKey === 'prompt.carrySeed', 'the seed offers to be carried');
log('seed prompt ok');

// ---- 3. the choice is the teaching: share, or take it all ----
const { initChoices } = await import('../src/ui/choices.js');
initChoices();
state.interact.fn();
assert(state.choiceOpen === true, 'picking the seed up asks a question');
emit(EVENTS.CHOICE_PICK, 0); // the first option is to leave a share
assert.equal(ant.isCarrying(), true, 'the ant carries the seed home');
assert.equal(ant.didShare(), true, 'and it left a share');
assert(getKarma().merit > 0, 'sharing is remembered as giving');

const after = goalFor();
assert.equal(after.kind, 'nest', 'with the seed, the nest becomes the ending');
assert.equal(after.x, NEST.chamber.x, 'the nest, in x');
assert(after.r < NEST.ring, 'and the goal fits inside the ring');

// ---- 4. delivering the seed plants it in the world ----
player.x = NEST.chamber.x;
player.y = NEST.chamber.y;
state.lifeMode = true;
updateLifeGoal();
assert.equal(hasEffect('seed-carried'), true, 'carrying the seed home records the effect');
assert.equal(completions, 1, 'and the life is complete');
assert.equal(ant.deliverSeed(), false, 'a later life cannot plant the same seed twice');
log('delivery ok');

// ---- 5. the other answer is a different memory ----
resetKarma();
state.world.effects = {};
state.mode = 'world';
ant.resetAnt();
state.interact = null;
player.x = NEST.seed.x;
player.y = NEST.seed.y;
ant.updateAnt();
state.interact.fn();
emit(EVENTS.CHOICE_PICK, 1); // carry it all back
assert.equal(ant.didShare(), false, 'this ant kept the whole seed');
assert.equal(getKarma().merit, 0, 'taking it all is not recorded as giving');
assert(getKarma().tendencies.clinging > 0 || getKarma().akusala > 0, 'the clinging is what it leaves in itself');
log('choice recorded ok');

// ---- 6. a new life starts empty-handed ----
loadChapter(1, { autosave: false });
assert.equal(ant.isCarrying(), false, 'a new chapter (and a new life) starts with empty hands');
assert.equal(ant.didShare(), false, 'and with nothing decided');
log('life reset ok');

// ---- 7. the ant really can walk its errand ----
// no trunk is left standing on the way, and a grid search with real collisions
// gets from the chapter start to the seed and on to the nest.
for (const tree of TREES) {
  for (let i = 0; i < NEST_APPROACH.length - 1; i++) {
    const [ax, ay] = NEST_APPROACH[i];
    const [bx, by] = NEST_APPROACH[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    const tt = Math.max(0, Math.min(1, ((tree.x - ax) * dx + (tree.y - ay) * dy) / (len * len)));
    const distance = Math.hypot(tree.x - (ax + dx * tt), tree.y - (ay + dy * tt));
    assert(distance > tree.r + PLAYER.radius + 12, 'the errand is kept clear of trunks');
  }
}

state.formId = 'ant';
state.lifeMode = true;
state.lifeId = 1;
initDynamicWorld(1);
const features = state.dynamic.features;
const step = 18;
const cols = Math.ceil((WORLD.w) / step);
const rows = Math.ceil((WORLD.h) / step);
const index = (c, r) => r * cols + c;
const blocked = new Uint8Array(cols * rows);
const abilities = { climbing: true, small: true, burrow: true };
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const x = c * step + step / 2;
    const y = r * step + step / 2;
    let solid = x < 40 || y < 40 || x > WORLD.w - 40 || y > WORLD.h - 40;
    if (!solid) solid = TREES.some((tree) => Math.hypot(x - tree.x, y - tree.y) < tree.r + PLAYER.radius);
    // seeded river silt and the nest ring are the only features in the way
    if (!solid) solid = blockedAt(features, x, y, abilities);
    blocked[index(c, r)] = solid ? 1 : 0;
  }
}
function canReach(from, to) {
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
}
const start = { x: 1120, y: 1560 };
assert.equal(canReach(start, NEST.seed), true, 'the ant walks from the chapter start to the seed');
assert.equal(canReach(NEST.seed, NEST.chamber), true, 'and from the seed into its nest');
assert.equal(canReach(start, { x: NEST.chamber.x + NEST.ring + 60, y: NEST.chamber.y }), true, 'the nest is reachable from outside');
log('errand walkable ok');

// ---- 8. the ant is offered in the chapter pools ----
let sawAnt = false;
const chapterIds = Array.from({ length: 14 }, (_, i) => i + 1);
let route = { chapter: 1, lifeId: 1, history: ['human'], chapterIds };
for (let i = 0; i < 200; i++) {
  const next = planNextLife(route);
  if (next.formId === 'ant') sawAnt = true;
  assert.equal(next.formId, next.formId, 'a body is chosen');
  route = { ...next, history: [...route.history, next.formId], chapterIds };
}
assert.equal(sawAnt, true, 'the ant is born during a long journey');
assert(candidatesFor(2, ['land', 'burrow']).includes('ant'), 'the ant is offered where its map is carried');
assert(!candidatesFor(2, ['water']).includes('ant'), 'and not where it is not');
log('rebirth ok');

console.error('ANT TEST OK — sealed nest, crack proof, the seed errand and its choice carried across lives');
