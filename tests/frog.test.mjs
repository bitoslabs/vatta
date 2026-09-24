import assert from 'node:assert/strict';

/*
 * The frog's marsh (docs/animal-lives-story.md ch.4, "ฝนหยดแรก").
 *
 * The forest is short of water. The channel gate stands inside deep mire: only a
 * leaping body crosses, the gate asks one question — open the water, or leave it
 * — and only afterwards does the bank become the place the life can end.
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
  assembleRooms, assembleMarsh, validateFrogRoute, blockedAt, validateRoute,
} = await import('../src/world/rooms.js');
const { MARSH, MARSH_APPROACH, TREES } = await import('../src/world/world-data.js');
const { goalFor, updateLifeGoal } = await import('../src/systems/goals.js');
const { initDynamicWorld } = await import('../src/systems/worldgen.js');
const { getKarma, resetKarma } = await import('../src/systems/karma.js');
const { hasEffect, worldEffects } = await import('../src/systems/world-effects.js');
const { planNextLife } = await import('../src/systems/life-route.js');
const { loadChapter } = await import('../src/game/chapters.js');
const { player } = await import('../src/entities/player.js');
const frog = await import('../src/game/frog.js');

const log = (message) => console.error(`[frog] ${message}`);
const marsh = assembleMarsh();

// ---- 1. the mire is a door for a leaping body alone ----
assert.equal(marsh.filter((f) => f.type === 'mire').length, MARSH.walls + MARSH.mirePlugs, 'the mire ring is whole');
assert(marsh.every((f) => f.fixed === true), 'the marsh is fixed geometry, not seed dressing');
const mire = marsh.find((f) => f.type === 'mire');
assert.equal(blockedAt([mire], mire.x, mire.y, { leap: true }), false, 'a leaping body crosses the mire');
assert.equal(blockedAt([mire], mire.x, mire.y, {}), true, 'a walker is stopped');
assert.equal(blockedAt([mire], mire.x, mire.y, { burrow: true }), true, 'the mud is not a burrow');
assert.equal(blockedAt([mire], mire.x, mire.y, { small: true, climbing: true }), true, 'and nothing squeezes through standing water');

for (let s = 1; s <= 60; s++) {
  const features = assembleRooms(s * 7919, 'memory-forest');
  const proof = validateFrogRoute(features, {});
  assert.equal(proof.leapReaches, true, `seed ${s}: a leaping body reaches the channel gate`);
  assert.equal(proof.walkerReaches, false, `seed ${s}: a walker cannot`);
  assert.equal(proof.tunnelReaches, false, `seed ${s}: nor a tunneller`);
  assert.equal(proof.smallReaches, false, `seed ${s}: nor a small body`);
  assert.equal(proof.ok, true, `seed ${s}: the mire is proven`);
  assert.equal(validateRoute(features, 'frog').ok, true, `seed ${s}: the frog's road still reaches the far end`);
  assert.equal(validateRoute(features, 'human').ok, true, `seed ${s}: and so does a walker's`);
}
log('mire proof ok (60 seeds)');

// ---- 2. the marsh is water, and the gate asks before the life can end ----
state.lifeMode = true;
state.formId = 'frog';
state.realmId = 'manussa';
resetKarma();
worldEffects();
state.world.effects = {};
frog.resetFrog();

assert.equal(isRebirthForm(FORMS.find((f) => f.id === 'frog')), true, 'the frog may be reborn now');
assert.equal(mapsFor('frog').includes('water'), true, 'and it names a map that carries it');

const before = goalFor();
assert.equal(before.kind, 'inlet', 'before deciding, the frog is pointed at the channel');
assert.equal(before.x, MARSH.inlet.x, 'the gate, in x');
assert.equal(before.y, MARSH.inlet.y, 'and in y');

state.mode = 'world';
let completions = 0;
on(EVENTS.LIFE_COMPLETE, () => { completions += 1; });

// the bank is not an ending until the question is answered
player.x = MARSH.bank.x;
player.y = MARSH.bank.y;
updateLifeGoal();
assert.equal(completions, 0, 'reaching the bank before deciding ends nothing');
assert.equal(hasEffect('water-opened'), false, 'and nothing has been opened');

// the gate offers the question
player.x = MARSH.inlet.x;
player.y = MARSH.inlet.y;
frog.updateFrog();
assert(state.interact && state.interact.labelKey === 'prompt.openChannel', 'the gate asks about the channel');
log('gate prompt ok');

// ---- 3. opening the channel shares the water with the forest below ----
const { initChoices } = await import('../src/ui/choices.js');
initChoices();
state.interact.fn();
assert(state.choiceOpen === true, 'the gate asks a question');
emit(EVENTS.CHOICE_PICK, 0); // open it
assert.equal(frog.didOpen(), true, 'the frog opened the channel');
assert.equal(hasEffect('water-opened'), true, 'the waterway is opened in the world');
assert(getKarma().merit > 0, 'sharing the water is remembered as giving');

const after = goalFor();
assert.equal(after.kind, 'spawn', 'with the question answered, the bank becomes the ending');
assert.equal(after.x, MARSH.bank.x, 'the bank, in x');
assert(after.r < 1e3, 'and it is a place, not everywhere');

// ---- 4. the eggs are laid, and the life ends ----
player.x = MARSH.bank.x;
player.y = MARSH.bank.y;
updateLifeGoal();
assert.equal(completions, 1, 'laying the eggs on the bank completes the life');
assert.equal(frog.spawnAtBank(), true, 'and the marsh remembers that it was opened');
log('spawn ok');

// ---- 5. leaving the channel shut is also a life, and a different world ----
resetKarma();
state.world.effects = {};
state.mode = 'world';
frog.resetFrog();
state.interact = null;
player.x = MARSH.inlet.x;
player.y = MARSH.inlet.y;
frog.updateFrog();
state.interact.fn();
emit(EVENTS.CHOICE_PICK, 1); // leave it
assert.equal(frog.didOpen(), false, 'this frog left the channel shut');
assert.equal(hasEffect('water-opened'), false, 'so the waterway stays closed');
assert.equal(getKarma().merit, 0, 'and nothing is recorded as giving');
assert.equal(goalFor().kind, 'spawn', 'the bank still becomes the ending — the choice is not a punishment');
log('choice recorded ok');

// ---- 6. a new life arrives with the channel blocked again ----
loadChapter(1, { autosave: false });
assert.equal(frog.hasDecided(), false, 'a new chapter (and a new life) asks again');
assert.equal(frog.didOpen(), false, 'with the channel shut');

// ---- 7. the frog can really walk its errand ----
for (const tree of TREES) {
  for (let i = 0; i < MARSH_APPROACH.length - 1; i++) {
    const [ax, ay] = MARSH_APPROACH[i];
    const [bx, by] = MARSH_APPROACH[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    const tt = Math.max(0, Math.min(1, ((tree.x - ax) * dx + (tree.y - ay) * dy) / (len * len)));
    const distance = Math.hypot(tree.x - (ax + dx * tt), tree.y - (ay + dy * tt));
    assert(distance > tree.r + PLAYER.radius + 12, 'the errand is kept clear of trunks');
  }
}

state.formId = 'frog';
state.lifeMode = true;
state.lifeId = 1;
initDynamicWorld(1);
const features = state.dynamic.features;
const step = 18;
const cols = Math.ceil(WORLD.w / step);
const rows = Math.ceil(WORLD.h / step);
const index = (c, r) => r * cols + c;
const blocked = new Uint8Array(cols * rows);
const abilities = { leap: true };
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const x = c * step + step / 2;
    const y = r * step + step / 2;
    let solid = x < 40 || y < 40 || x > WORLD.w - 40 || y > WORLD.h - 40;
    if (!solid) solid = TREES.some((tree) => Math.hypot(x - tree.x, y - tree.y) < tree.r + PLAYER.radius);
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
const road = { x: MARSH_APPROACH[0][0], y: MARSH_APPROACH[0][1] };
assert.equal(canReach(road, MARSH.inlet), true, 'the frog leaps in from the road');
assert.equal(canReach(road, MARSH.bank), true, 'and reaches the bank');
assert.equal(canReach(road, { x: 1120, y: 1560 }), true, 'the marsh is reachable from the chapter start');
log('errand walkable ok');

// ---- 8. the frog is offered in the chapter pools ----
let sawFrog = false;
const chapterIds = Array.from({ length: 14 }, (_, i) => i + 1);
let route = { chapter: 1, lifeId: 1, history: ['human'], chapterIds };
for (let i = 0; i < 200; i++) {
  const next = planNextLife(route);
  if (next.formId === 'frog') sawFrog = true;
  route = { ...next, history: [...route.history, next.formId], chapterIds };
}
assert.equal(sawFrog, true, 'the frog is born during a long journey');
assert.equal(isRebirthForm(FORMS.find((f) => f.id === 'tiger')), false, 'the tiger still waits for its chapter');
log('rebirth ok');

console.error('FROG TEST OK — mire crossed only by leaping, the channel question, and the bank that ends the life');
