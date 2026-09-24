import assert from 'node:assert/strict';

/*
 * The snail's ridge (docs/animal-lives-story.md story table, "หอยทาก — ผ่านพื้นที่
 * ชื้นและพักเมื่อแห้ง · รู้ข้อจำกัดและจังหวะของตัวเอง").
 *
 * A body's own *limitation* as the mechanic, for the first time: the ridge of dry
 * ground rings the garden, and it is a wall to exactly one body in the forest — a
 * snail, which may cross it only while the ground is damp. Waiting is never a
 * failure and the damp always comes round, so the life moves at the world's pace;
 * a trail left damp by a snail that went before opens the crossing for good.
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
const { DAMP, TREES } = await import('../src/world/world-data.js');
const {
  assembleRooms, assembleDryRidge, validateSnailRoute, blockedAt, validateRoute,
} = await import('../src/world/rooms.js');
const { BIOMES } = await import('../src/content/biomes.js');
const { goalFor, updateLifeGoal } = await import('../src/systems/goals.js');
const { initDynamicWorld } = await import('../src/systems/worldgen.js');
const { getKarma, resetKarma } = await import('../src/systems/karma.js');
const { hasEffect, worldEffects } = await import('../src/systems/world-effects.js');
const moisture = await import('../src/systems/moisture.js');
const { planNextLife, candidatesFor } = await import('../src/systems/life-route.js');
const { loadChapter } = await import('../src/game/chapters.js');
const { player } = await import('../src/entities/player.js');
const { dist } = await import('../src/core/math.js');
const snail = await import('../src/game/snail.js');

const log = (message) => console.error(`[snail] ${message}`);

// ---- 1. the ground's dampness is a slow, readable rhythm ----
moisture.resetMoisture();
assert.equal(moisture.moisturePhase(), 0.5, 'a life starts at the dampest hour');
assert.equal(moisture.isDamp(), true, 'which is damp');
moisture.setMoisturePhase(0);
assert.equal(moisture.isDry(), true, 'the start of the round is as dry as it gets');
moisture.setMoisturePhase(0.25);
assert.equal(moisture.moistureLevel().toFixed(2), '0.50', 'and it passes through half');
const turns = [];
on(EVENTS.MOISTURE_TURNED, (which) => turns.push(which));
moisture.resetMoisture();
for (let i = 0; i < 11; i++) moisture.updateMoisture(moisture.MOISTURE_CONSTANTS.period / 11);
// starting at the dampest hour, the round crosses the dry mark first and the
// damp mark again on its way back
assert.deepEqual(turns, ['dry', 'damp'], 'one round announces the dry and the damp once each');
const before = moisture.moisturePhase();
moisture.updateMoisture(moisture.MOISTURE_CONSTANTS.period / 2);
assert.notEqual(moisture.moisturePhase(), before, 'and the ground keeps going round');
log('ground rhythm ok');

// ---- 2. the ridge is a barrier for exactly one body ----
assert.equal(BIOMES['memory-forest'].sites.includes('damp'), true, 'the ridge belongs to the forest plane');
const ridge = assembleDryRidge();
assert(ridge.length > 10, 'the ridge rings the garden');
assert(ridge.every((stone) => stone.type === 'dry' && stone.fixed === true), 'and is fixed ground');
const stone = ridge[0];
assert.equal(blockedAt([stone], stone.x, stone.y, { needsDamp: true, dampGround: false }), true, 'a snail is stopped while the ground is dry');
assert.equal(blockedAt([stone], stone.x, stone.y, { needsDamp: true, dampGround: true }), false, 'and passes while it is damp');
assert.equal(blockedAt([stone], stone.x, stone.y, {}), false, 'a body that does not need the damp never notices it');
assert.equal(blockedAt([stone], stone.x, stone.y, { small: true, climbing: true }), false, 'nor does anyone else');

for (let s = 1; s <= 60; s++) {
  const features = assembleRooms(s * 7919, 'memory-forest');
  const proof = validateSnailRoute(features, {});
  assert.equal(proof.drySnail, false, `seed ${s}: a snail cannot cross dry ground when it is dry`);
  assert.equal(proof.dampSnail, true, `seed ${s}: and crosses when it is damp`);
  assert.equal(proof.walker, true, `seed ${s}: while every other body walks in and out`);
  assert.equal(proof.ok, true, `seed ${s}: the ridge is proven`);
  assert.equal(validateRoute(features, 'human').ok, true, `seed ${s}: the road still walks`);
  assert.equal(validateRoute(features, 'snail').ok, true, `seed ${s}: and the snail's own road`);
}
log('ridge proof ok (60 seeds)');

// ---- 3. the world grants the crossing by the hour, and by an old snail's trail ----
state.formId = 'snail';
state.realmId = 'manussa';
state.world.effects = {};
moisture.setMoisturePhase(0.5);
assert.equal(snail.canCrossDry(), true, 'at the damp hour a snail may cross');
moisture.setMoisturePhase(0);
assert.equal(snail.canCrossDry(), false, 'at the dry hour it may not');
state.world.effects = { 'damp-trail': true };
assert.equal(snail.canCrossDry(), true, 'and a trail an earlier life left opens it at any hour');
state.world.effects = {};
state.formId = 'human';
assert.equal(snail.canCrossDry(), true, 'a body that does not need the damp always may');
state.formId = 'snail';
log('crossing granted ok');

// ---- 4. the snail's life: cross, decide, and close at the garden ----
resetKarma();
worldEffects();
state.world.effects = {};
snail.resetSnail();
moisture.resetMoisture();
state.lifeMode = true;
state.mode = 'world';
state.interact = null;
initDynamicWorld(2);

assert.equal(isRebirthForm(FORMS.find((f) => f.id === 'snail')), true, 'the snail may be reborn now');
assert.equal(mapsFor('snail').includes('water'), true, 'and it names a map that carries it');
assert.equal(goalFor().kind, 'garden-guide', 'the life is pointed at the garden across the ridge');

let completions = 0;
on(EVENTS.LIFE_COMPLETE, () => { completions += 1; });
const { initChoices } = await import('../src/ui/choices.js');
initChoices();

player.x = DAMP.garden.x;
player.y = DAMP.garden.y;
state.interact = null;
snail.updateSnail();
assert(state.interact && state.interact.labelKey === 'prompt.leaveTrail', 'the garden asks about the crossing');
assert.equal(completions, 0, 'and arriving does not end the life before the answer');
state.interact.fn();
emit(EVENTS.CHOICE_PICK, 0); // leave the trail damp
assert.equal(snail.didLeaveTrail(), true, 'the snail left the trail damp');
assert.equal(hasEffect('damp-trail'), true, 'and the world records it');
assert(getKarma().merit > 0, 'leaving a way for others is remembered as giving');
assert.equal(goalFor().kind, 'damp-garden', 'and only now does the garden end the life');
updateLifeGoal();
assert.equal(completions, 1, 'the garden completes the life');
assert.equal(snail.settleGarden(), true, 'and the world remembers the trail');
log('garden ok');

// ---- 5. a snail that follows finds the crossing open ----
moisture.setMoisturePhase(0);
state.formId = 'snail';
initDynamicWorld(2);
assert.equal(snail.canCrossDry(), true, 'a later snail crosses at the dry hour, because of the trail');
assert.equal(
  blockedAt(state.dynamic.features, DAMP.garden.x - DAMP.ring, DAMP.garden.y, { needsDamp: true, dampGround: true }),
  false,
  'and the ground under the ridge is passable to it',
);
log('trail inherited ok');

// ---- 6. going on without a trail is also a life ----
resetKarma();
state.world.effects = {};
state.formId = 'snail';
snail.resetSnail();
state.interact = null;
initDynamicWorld(2);
player.x = DAMP.garden.x;
player.y = DAMP.garden.y;
state.interact = null;
snail.updateSnail();
state.interact.fn();
emit(EVENTS.CHOICE_PICK, 1); // go on without leaving a trail
assert.equal(snail.didLeaveTrail(), false, 'this snail left no trail');
assert.equal(hasEffect('damp-trail'), false, 'so nothing was left for the next snail');
assert.equal(goalFor().kind, 'damp-garden', 'the garden still ends the life — the answer is not a punishment');
log('no trail ok');

// ---- 7. a new life arrives on ground whose dampness it must wait for ----
loadChapter(1, { autosave: false });
assert.equal(snail.hasDecided(), false, 'a new chapter (and a new life) starts undecided');
assert.equal(moisture.moisturePhase(), 0.5, 'and the ground starts at its known hour');

// ---- 8. the snail can really crawl its errand ----
for (const tree of TREES) {
  for (const spot of [DAMP.hollow, DAMP.garden]) {
    assert(dist(tree.x, tree.y, spot.x, spot.y) > 110, 'no trunk stands on the hollow or the garden');
  }
}
state.formId = 'snail';
state.lifeMode = true;
state.lifeId = 1;
state.world.effects = {};
state.world.removed = [];
state.world.planks = [];
initDynamicWorld(1);
const features = state.dynamic.features;
const step = 18;
const cols = Math.ceil((await import('../src/core/constants.js')).WORLD.w / step);
const rows = Math.ceil((await import('../src/core/constants.js')).WORLD.h / step);
const index = (c, r) => r * cols + c;
const build = (abilities) => {
  const grid = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * step + step / 2;
      const y = r * step + step / 2;
      let solid = TREES.some((tree) => dist(x, y, tree.x, tree.y) < tree.r + 13);
      if (!solid) solid = blockedAt(features, x, y, abilities);
      grid[index(c, r)] = solid ? 1 : 0;
    }
  }
  return grid;
};
const reaches = (grid, from, to) => {
  const seen = new Uint8Array(cols * rows);
  const start = { c: Math.floor(from.x / step), r: Math.floor(from.y / step) };
  const goal = { c: Math.floor(to.x / step), r: Math.floor(to.y / step) };
  const near = (cell) => Math.abs(cell.c - goal.c) <= 2 && Math.abs(cell.r - goal.r) <= 2;
  const queue = [start];
  seen[index(start.c, start.r)] = 1;
  while (queue.length) {
    const cell = queue.shift();
    if (near(cell)) return true;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = cell.c + dc;
      const r = cell.r + dr;
      if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
      const i = index(c, r);
      if (grid[i] || seen[i]) continue;
      seen[i] = 1;
      queue.push({ c, r });
    }
  }
  return false;
};
assert.equal(reaches(build({ needsDamp: true, dampGround: true }), DAMP.hollow, DAMP.garden), true,
  'at the damp hour the snail crawls the whole way to the garden');
assert.equal(reaches(build({ needsDamp: true, dampGround: false }), DAMP.hollow, DAMP.garden), false,
  'and at the dry hour it cannot get there at all');
assert.equal(reaches(build({}), DAMP.hollow, DAMP.garden), true,
  'while any other body goes straight in');
log('errand crawlable ok');

// ---- 9. the snail is offered in the chapter pools ----
assert.equal(candidatesFor(3, ['land', 'water']).includes('snail'), true, 'the snail is offered where a slow body is carried');
let sawSnail = false;
const chapterIds = Array.from({ length: 14 }, (_, i) => i + 1);
let route = { chapter: 1, lifeId: 1, history: [], chapterIds };
for (let i = 0; i < 900; i++) {
  const next = planNextLife(route);
  if (next.formId === 'snail') sawSnail = true;
  route = { ...next, history: [...route.history, next.formId], chapterIds };
}
assert.equal(sawSnail, true, 'the snail is born during a long journey');
log('rebirth ok');

console.error('SNAIL TEST OK — one body\'s limit, the ground\'s own rhythm, and a trail that keeps the crossing damp for whoever follows');
