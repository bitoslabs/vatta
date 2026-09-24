import assert from 'node:assert/strict';

/*
 * The rabbit's field (docs/animal-lives-story.md ch.10, "ที่หลบก่อนพายุ").
 *
 * The life is a relay, not a race: join the warrens in turn, leap the washed rim
 * to the far warren, and answer for the storm shelter. The design is explicit
 * that speed is not a score, so this suite also asserts there is no clock in the
 * errand at all.
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
  assembleRooms, assembleField, validateRabbitRoute, validateFrogRoute,
  validateSnakeRoute, blockedAt, validateRoute,
} = await import('../src/world/rooms.js');
const { FIELD, FIELD_APPROACH, TREES } = await import('../src/world/world-data.js');
const { goalFor, updateLifeGoal } = await import('../src/systems/goals.js');
const { initDynamicWorld } = await import('../src/systems/worldgen.js');
const { getKarma, resetKarma } = await import('../src/systems/karma.js');
const { hasEffect, worldEffects } = await import('../src/systems/world-effects.js');
const { planNextLife } = await import('../src/systems/life-route.js');
const { loadChapter } = await import('../src/game/chapters.js');
const { player } = await import('../src/entities/player.js');
const rabbit = await import('../src/game/rabbit.js');

const log = (message) => console.error(`[rabbit] ${message}`);
const field = assembleField();
const warrens = FIELD.warrens;

// ---- 1. the washed rim is a leaping body's door ----
assert(field.length >= FIELD.gully.segments, 'the washed rim is unbroken all the way round');
assert(field.every((f) => f.fixed === true && f.type === 'gully'), 'the rim is fixed geometry, not seed dressing');
const channel = field[0];
assert.equal(blockedAt([channel], channel.x, channel.y, { leap: true }), false, 'a leaping body crosses the gully');
assert.equal(blockedAt([channel], channel.x, channel.y, {}), true, 'a walker is stopped');
assert.equal(blockedAt([channel], channel.x, channel.y, { small: true }), true, 'so is a small body');
assert.equal(blockedAt([channel], channel.x, channel.y, { burrow: true }), true, 'so is a tunneller');
assert.equal(blockedAt([channel], channel.x, channel.y, { slither: true }), true, 'so is a slitherer');

for (let s = 1; s <= 60; s++) {
  const features = assembleRooms(s * 7919, 'memory-forest');
  const proof = validateRabbitRoute(features, {});
  assert.equal(proof.leapReaches, true, `seed ${s}: a rabbit reaches the far warren`);
  assert.equal(proof.walkerReaches, false, `seed ${s}: a walker cannot`);
  assert.equal(proof.smallReaches, false, `seed ${s}: nor the ant`);
  assert.equal(proof.tunnelReaches, false, `seed ${s}: nor the earthworm`);
  assert.equal(proof.slitherReaches, false, `seed ${s}: nor the snake`);
  assert.equal(proof.ok, true, `seed ${s}: the rim is proven`);
  // the field did not disturb the other sites
  assert.equal(validateFrogRoute(features, {}).ok, true, `seed ${s}: the marsh is still proven`);
  assert.equal(validateSnakeRoute(features, {}).ok, true, `seed ${s}: the crevice is still proven`);
  assert.equal(validateRoute(features, 'rabbit').ok, true, `seed ${s}: the rabbit's road reaches the far end`);
  assert.equal(validateRoute(features, 'human').ok, true, `seed ${s}: and so does a walker's`);
}
log('washed rim proof ok (60 seeds)');

// ---- 2. the relay: warren by warren, then the shelter, then the field ----
state.lifeMode = true;
state.formId = 'rabbit';
state.realmId = 'manussa';
resetKarma();
worldEffects();
state.world.effects = {};
rabbit.resetRabbit();
state.mode = 'world';

assert.equal(isRebirthForm(FORMS.find((f) => f.id === 'rabbit')), true, 'the rabbit may be reborn now');
assert.equal(mapsFor('rabbit').includes('land'), true, 'and it names a map that carries it');
assert.equal(rabbit.connectedCount(), 0, 'a new life has no warrens joined');
assert.equal(rabbit.allConnected(), false, 'and nothing joined yet');

let completions = 0;
on(EVENTS.LIFE_COMPLETE, () => { completions += 1; });

// the first goal is the first warren: a guide, not an ending
const first = goalFor();
assert.equal(first.kind, 'warren', 'the rabbit is first pointed at a warren');
assert.equal(first.x, warrens[0].x, 'the first warren, in x');
player.x = warrens[0].x;
player.y = warrens[0].y;
updateLifeGoal();
assert.equal(completions, 0, 'joining a warren does not end the life');

// the warrens are joined in turn, and each counts once
const { initChoices } = await import('../src/ui/choices.js');
initChoices();
for (const [index, warren] of warrens.entries()) {
  player.x = warren.x;
  player.y = warren.y;
  state.interact = null;
  rabbit.updateRabbit();
  assert(state.interact && state.interact.labelKey === 'prompt.connectWarren', `warren ${warren.id} offers to be joined`);
  state.interact.fn();
  assert.equal(rabbit.connectedCount(), index + 1, `warren ${warren.id} is joined (${index + 1} of ${warrens.length})`);
}
assert.equal(rabbit.allConnected(), true, 'all the warrens are joined');
log('relay ok');

// ---- 3. there is no clock anywhere in this errand ----
assert.deepEqual(Object.keys(state.rabbit).sort(), ['connected', 'decided', 'shared'],
  'the relay state holds only what was done, never when');
assert(!Object.keys(state.rabbit).some((key) => /time|deadline|elapsed|limit/i.test(key)),
  'no field of the relay is about time');
// and the life still completes after an enormous amount of world time has passed
state.stats.time += 60 * 60 * 24;
player.x = warrens[warrens.length - 1].x;
player.y = warrens[warrens.length - 1].y;
state.interact = null;
rabbit.updateRabbit();
assert(state.interact && state.interact.labelKey === 'prompt.shareShelter', 'the far shelter asks its question whenever you arrive');

// ---- 4. the shelter: share it, and the field remembers ----
const shelter = goalFor();
assert.equal(shelter.kind, 'shelter', 'before answering, the goal is the shelter itself');
state.interact.fn();
assert(state.choiceOpen === true, 'the far shelter asks a question');
emit(EVENTS.CHOICE_PICK, 0); // share it
assert.equal(rabbit.didShare(), true, 'the rabbit left the shelter open');
assert.equal(hasEffect('nest-sheltered'), true, 'the world records the shelter');
assert(getKarma().merit > 0, 'sharing shelter is remembered as giving');

const back = goalFor();
assert.equal(back.kind, 'storm', 'with the question answered, the open field becomes the ending');
assert.equal(back.x, FIELD.meadow.x, 'the field, in x');
assert.equal(back.y, FIELD.meadow.y, 'and in y');

player.x = FIELD.meadow.x;
player.y = FIELD.meadow.y;
updateLifeGoal();
assert.equal(completions, 1, 'finishing in the open field completes the life');
assert.equal(rabbit.tendField(), true, 'and the world remembers the shelter was shared');
log('shelter ok');

// ---- 5. a sheltered field is felt: shelter is a place, not a flag ----
assert.equal(rabbit.inShelter(warrens[0].x, warrens[0].y), true, 'a warren is shelter once it was shared');
assert.equal(rabbit.inShelter(FIELD.meadow.x, FIELD.meadow.y), false, 'the open field is not');
state.world.effects = {};
assert.equal(rabbit.inShelter(warrens[0].x, warrens[0].y), false, 'without the effect a warren shelters no one');
state.world.effects = { 'nest-sheltered': true };
log('shelter felt ok');

// ---- 6. keeping the shelter is also a life, and a quieter world ----
resetKarma();
state.world.effects = {};
state.mode = 'world';
rabbit.resetRabbit();
for (const warren of warrens) {
  player.x = warren.x;
  player.y = warren.y;
  state.interact = null;
  rabbit.updateRabbit();
  state.interact.fn();
}
player.x = warrens[warrens.length - 1].x;
player.y = warrens[warrens.length - 1].y;
state.interact = null;
rabbit.updateRabbit();
state.interact.fn();
emit(EVENTS.CHOICE_PICK, 1); // keep it
assert.equal(rabbit.didShare(), false, 'this rabbit kept the shelter');
assert.equal(hasEffect('nest-sheltered'), false, 'so the world records no shelter');
assert.equal(getKarma().merit, 0, 'and nothing is recorded as giving');
assert.equal(goalFor().kind, 'storm', 'the field still ends the life — the choice is not a punishment');
log('choice recorded ok');

// ---- 7. a new life arrives with the warrens unjoined ----
loadChapter(1, { autosave: false });
assert.equal(rabbit.connectedCount(), 0, 'a new chapter (and a new life) starts with no warrens joined');
assert.equal(rabbit.hasDecided(), false, 'and with the shelter undecided');

// ---- 8. the rabbit can really walk its errand ----
for (const tree of TREES) {
  for (let i = 0; i < FIELD_APPROACH.length - 1; i++) {
    const [ax, ay] = FIELD_APPROACH[i];
    const [bx, by] = FIELD_APPROACH[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    const tt = Math.max(0, Math.min(1, ((tree.x - ax) * dx + (tree.y - ay) * dy) / (len * len)));
    const distance = Math.hypot(tree.x - (ax + dx * tt), tree.y - (ay + dy * tt));
    assert(distance > tree.r + PLAYER.radius + 12, 'the errand is kept clear of trunks');
  }
}

state.formId = 'rabbit';
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
const road = { x: FIELD_APPROACH[0][0], y: FIELD_APPROACH[0][1] };
assert.equal(canReach(road, warrens[0]), true, 'the rabbit reaches the first warren');
assert.equal(canReach(road, warrens[1]), true, 'and the second');
assert.equal(canReach(road, warrens[2]), true, 'and leaps the rim to the far one');
assert.equal(canReach(road, FIELD.meadow), true, 'and the open field');
assert.equal(canReach(road, { x: 1120, y: 1560 }), true, 'the field is reachable from the chapter start');
log('errand walkable ok');

// ---- 9. the rabbit is offered in the chapter pools ----
let sawRabbit = false;
const chapterIds = Array.from({ length: 14 }, (_, i) => i + 1);
let route = { chapter: 1, lifeId: 1, history: ['human'], chapterIds };
for (let i = 0; i < 300; i++) {
  const next = planNextLife(route);
  if (next.formId === 'rabbit') sawRabbit = true;
  route = { ...next, history: [...route.history, next.formId], chapterIds };
}
assert.equal(sawRabbit, true, 'the rabbit is born during a long journey');
for (const id of ['elephant', 'tiger']) {
  assert.equal(isRebirthForm(FORMS.find((f) => f.id === id)), false, `${id} waits for its chapter`);
}
log('rebirth ok');

console.error('RABBIT TEST OK — warrens joined without a clock, the rim leapt, and the shelter that keeps sheltering');
