import assert from 'node:assert/strict';

/*
 * The snake's crevice (docs/animal-lives-story.md ch.6, "ช่องแคบ").
 *
 * A spring is sealed inside a ring of stone whose only way in is a slot a body
 * slips through by flattening itself. Inside, the snake decides whether to widen
 * the slot for every body — linking the water to the river — or keep it narrow.
 * Widening is a world effect later lives can walk through.
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
  assembleRooms, assembleCrevice, validateSnakeRoute, validateFrogRoute,
  validateBurrowExit, validateNestRoute, blockedAt, validateRoute,
} = await import('../src/world/rooms.js');
const { CREVICE, CREVICE_APPROACH, TREES } = await import('../src/world/world-data.js');
const { BIOMES } = await import('../src/content/biomes.js');
const { goalFor, updateLifeGoal } = await import('../src/systems/goals.js');
const { initDynamicWorld, worldAbilities, dynamicBlocked } = await import('../src/systems/worldgen.js');
const { getKarma, resetKarma } = await import('../src/systems/karma.js');
const { hasEffect, worldEffects, WORLD_EFFECTS } = await import('../src/systems/world-effects.js');
const { planNextLife } = await import('../src/systems/life-route.js');
const { loadChapter } = await import('../src/game/chapters.js');
const { player } = await import('../src/entities/player.js');
const snake = await import('../src/game/snake.js');

const log = (message) => console.error(`[snake] ${message}`);
const stone = assembleCrevice();

// ---- 1. the slot in the stone is a flattened body's door ----
assert.equal(stone.filter((f) => f.type === 'stone').length, CREVICE.walls, 'the stone ring is whole');
assert.equal(stone.filter((f) => f.type === 'crevice').length, CREVICE.gapPlugs, 'the slot is plugged with overlapping gaps');
assert(stone.every((f) => f.fixed === true), 'the crevice is fixed geometry, not seed dressing');
assert(!BIOMES['memory-forest'].sites.includes('burrow'), 'and it lives on the forest plane, not in the soil');

const slot = stone.find((f) => f.type === 'crevice');
assert.equal(blockedAt([slot], slot.x, slot.y, { slither: true }), false, 'a slithering body slips through');
assert.equal(blockedAt([slot], slot.x, slot.y, {}), true, 'a walker is stopped');
assert.equal(blockedAt([slot], slot.x, slot.y, { small: true }), true, 'so is a small body that is not flat (the ant)');
assert.equal(blockedAt([slot], slot.x, slot.y, { burrow: true }), true, 'and so is a tunneller (the earthworm)');
assert.equal(blockedAt([slot], slot.x, slot.y, { leap: true }), true, 'and a leaper (the frog)');
const rock = stone.find((f) => f.type === 'stone');
assert.equal(blockedAt([rock], rock.x, rock.y, { slither: true }), true, 'solid stone stops everyone');

for (let s = 1; s <= 60; s++) {
  const features = assembleRooms(s * 7919, 'memory-forest');
  const proof = validateSnakeRoute(features, {});
  assert.equal(proof.slitherReaches, true, `seed ${s}: a snake reaches the spring`);
  assert.equal(proof.walkerReaches, false, `seed ${s}: a walker cannot`);
  assert.equal(proof.smallReaches, false, `seed ${s}: nor the ant`);
  assert.equal(proof.tunnelReaches, false, `seed ${s}: nor the earthworm`);
  assert.equal(proof.ok, true, `seed ${s}: the crevice is proven`);
  // the other fixed sites and the road still hold
  assert.equal(validateFrogRoute(features, {}).ok, true, `seed ${s}: the marsh is still proven`);
  assert.equal(validateRoute(features, 'snake').ok, true, `seed ${s}: the snake's road reaches the far end`);
  assert.equal(validateRoute(features, 'human').ok, true, `seed ${s}: and so does a walker's`);
}
log('crevice proof ok (60 seeds)');

// ---- 2. the spring first, the outflow after ----
state.lifeMode = true;
state.formId = 'snake';
state.realmId = 'manussa';
resetKarma();
worldEffects();
state.world.effects = {};
snake.resetSnake();

assert.equal(isRebirthForm(FORMS.find((f) => f.id === 'snake')), true, 'the snake may be reborn now');
assert.equal(mapsFor('snake').includes('land'), true, 'and it names a map that carries it');
assert.equal(WORLD_EFFECTS['water-linked'].key, 'effect.waterLinked', 'the linked water has its own effect code');

const before = goalFor();
assert.equal(before.kind, 'spring', 'before deciding, the snake is pointed at the spring');
assert.equal(before.x, CREVICE.spring.x, 'the spring, in x');
assert.equal(before.y, CREVICE.spring.y, 'and in y');

state.mode = 'world';
let completions = 0;
on(EVENTS.LIFE_COMPLETE, () => { completions += 1; });

// the outflow is not an ending until the question is answered
player.x = CREVICE.outflow.x;
player.y = CREVICE.outflow.y;
updateLifeGoal();
assert.equal(completions, 0, 'reaching the outflow before deciding ends nothing');

// the spring asks its one question
player.x = CREVICE.spring.x;
player.y = CREVICE.spring.y;
snake.updateSnake();
assert(state.interact && state.interact.labelKey === 'prompt.openCrevice', 'the spring asks about the crevice');
log('crevice prompt ok');

// ---- 3. widening opens the stone for every later life ----
const { initChoices } = await import('../src/ui/choices.js');
initChoices();
state.interact.fn();
assert(state.choiceOpen === true, 'the spring asks a question');
emit(EVENTS.CHOICE_PICK, 0); // widen
assert.equal(snake.didWiden(), true, 'the snake widened the slot');
assert.equal(hasEffect('water-linked'), true, 'the water is linked in the world');
assert(getKarma().merit > 0, 'opening the way for others is remembered as giving');

const after = goalFor();
assert.equal(after.kind, 'link', 'with the question answered, the outflow becomes the ending');
assert.equal(after.x, CREVICE.outflow.x, 'the outflow, in x');

// ---- 4. out by the water, and the life ends ----
player.x = CREVICE.outflow.x;
player.y = CREVICE.outflow.y;
updateLifeGoal();
assert.equal(completions, 1, 'leaving by the linked water completes the life');
assert.equal(snake.linkWater(), true, 'and the world remembers the water was linked');

// ---- 5. the widened stone really is open to a body that cannot slither ----
initDynamicWorld(2);
// the middle of the slot: the plugs at the edges of the opening overlap the
// stone itself, so the centre is the point that is only ever the crevice's
// to allow or refuse.
const crevices = state.dynamic.features.filter((f) => f.type === 'crevice');
const stoneHere = state.dynamic.features.filter((f) => f.type === 'stone');
const slotFeature = crevices
  .map((f) => ({ f, clearance: Math.min(...stoneHere.map((s) => Math.hypot(f.x - s.x, f.y - s.y) - s.r)) }))
  .sort((a, b) => b.clearance - a.clearance)[0].f;
assert(slotFeature, 'the crevice is on the map');
state.world.effects = {};
state.formId = 'human';
assert.equal(worldAbilities().slither, undefined, 'a human has no slither of its own');
assert.equal(dynamicBlocked(slotFeature.x, slotFeature.y), true, 'so the closed slot stops it');
state.world.effects = { 'water-linked': true };
assert.equal(worldAbilities().slither, true, 'with the link recorded the stone stays open');
assert.equal(dynamicBlocked(slotFeature.x, slotFeature.y), false, 'and a later body walks through where the snake slipped');
log('cross-life consequence ok');

// ---- 6. keeping the way narrow is also a life, and a quieter world ----
resetKarma();
state.world.effects = {};
state.mode = 'world';
state.formId = 'snake';
snake.resetSnake();
state.interact = null;
player.x = CREVICE.spring.x;
player.y = CREVICE.spring.y;
snake.updateSnake();
state.interact.fn();
emit(EVENTS.CHOICE_PICK, 1); // keep it
assert.equal(snake.didWiden(), false, 'this snake kept its narrow way');
assert.equal(hasEffect('water-linked'), false, 'so the water stays unlinked');
assert.equal(getKarma().merit, 0, 'and nothing is recorded as giving');
assert.equal(goalFor().kind, 'link', 'the outflow still ends the life — the choice is not a punishment');
log('choice recorded ok');

// ---- 7. a new life arrives at stone that is shut again ----
loadChapter(1, { autosave: false });
assert.equal(snake.hasDecided(), false, 'a new chapter (and a new life) asks again');
assert.equal(snake.didWiden(), false, 'with the crevice narrow again');

// ---- 8. the snake can really walk its errand ----
for (const tree of TREES) {
  for (let i = 0; i < CREVICE_APPROACH.length - 1; i++) {
    const [ax, ay] = CREVICE_APPROACH[i];
    const [bx, by] = CREVICE_APPROACH[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    const tt = Math.max(0, Math.min(1, ((tree.x - ax) * dx + (tree.y - ay) * dy) / (len * len)));
    const distance = Math.hypot(tree.x - (ax + dx * tt), tree.y - (ay + dy * tt));
    assert(distance > tree.r + PLAYER.radius + 12, 'the errand is kept clear of trunks');
  }
}

state.formId = 'snake';
state.lifeMode = true;
state.lifeId = 1;
state.world.effects = {};
initDynamicWorld(1);
const features = state.dynamic.features;
const step = 18;
const cols = Math.ceil(WORLD.w / step);
const rows = Math.ceil(WORLD.h / step);
const index = (c, r) => r * cols + c;
const blocked = new Uint8Array(cols * rows);
const abilities = { slither: true, small: true };
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
const road = { x: CREVICE_APPROACH[0][0], y: CREVICE_APPROACH[0][1] };
assert.equal(canReach(road, CREVICE.spring), true, 'the snake slips into the spring from the road');
assert.equal(canReach(road, CREVICE.outflow), true, 'and reaches the outflow');
assert.equal(canReach(road, { x: 1120, y: 1560 }), true, 'the crevice is reachable from the chapter start');
log('errand walkable ok');

// ---- 9. the snake is offered in the chapter pools ----
let sawSnake = false;
const chapterIds = Array.from({ length: 14 }, (_, i) => i + 1);
let route = { chapter: 1, lifeId: 1, history: ['human'], chapterIds };
for (let i = 0; i < 200; i++) {
  const next = planNextLife(route);
  if (next.formId === 'snake') sawSnake = true;
  route = { ...next, history: [...route.history, next.formId], chapterIds };
}
assert.equal(sawSnake, true, 'the snake is born during a long journey');
for (const id of ['rabbit', 'elephant', 'tiger', 'owl']) {
  assert.equal(isRebirthForm(FORMS.find((f) => f.id === id)), false, `${id} waits for its chapter`);
}
log('rebirth ok');

console.error('SNAKE TEST OK — a slot only a flattened body fits, the choice to widen it, and the linked water carried across lives');
