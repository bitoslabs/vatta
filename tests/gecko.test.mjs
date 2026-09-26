import assert from 'node:assert/strict';

/*
 * The gecko's enclosure (docs/animal-lives-story.md reserve table, "มองปัญหาจาก
 * มุมใหม่" — see the problem from a new angle).
 *
 * A sheer wall nothing walks over, a gate that only opens from the inside, and a
 * life whose point is that a way can be opened *for others*. This is the first
 * gate in the game that a body opens on the far side of a barrier it alone
 * crossed.
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
const { on, EVENTS } = await import('../src/core/events.js');
const { PLAYER, WORLD } = await import('../src/core/constants.js');
const { FORMS, mapsFor, isRebirthForm } = await import('../src/content/forms.js');
const {
  assembleRooms, assembleEnclosure, enclosureWithGateOpen, validateGeckoRoute,
  validateElephantRoute, validateRabbitRoute, blockedAt,
} = await import('../src/world/rooms.js');
const { ENCLOSURE, ENCLOSURE_APPROACH, TREES } = await import('../src/world/world-data.js');
const { goalFor, updateLifeGoal } = await import('../src/systems/goals.js');
const { initDynamicWorld } = await import('../src/systems/worldgen.js');
const { isRestful, restingPlaceAt } = await import('../src/systems/rest.js');
const { getKarma, resetKarma } = await import('../src/systems/karma.js');
const { hasEffect, worldEffects } = await import('../src/systems/world-effects.js');
const { planNextLife } = await import('../src/systems/life-route.js');
const { loadChapter } = await import('../src/game/chapters.js');
const { player } = await import('../src/entities/player.js');
const gecko = await import('../src/game/gecko.js');

const log = (message) => console.error(`[gecko] ${message}`);
const ring = assembleEnclosure();
const gate = ring.find((f) => f.gate === true);

// ---- 1. a wall only a clinging body climbs ----
assert(ring.length === ENCLOSURE.segments, 'the wall is whole');
assert(gate, 'and one of its stones is a gate');
assert(gate.fixed === true && gate.liftable === true, 'the gate is fixed like the wall, and the one stone that can go');
assert.equal(blockedAt([gate], gate.x, gate.y, {}), true, 'the barred gate stops a walker');
assert.equal(blockedAt([gate], gate.x, gate.y, { cling: true }), false, 'a clinging body goes over it');
assert.equal(blockedAt([gate], gate.x, gate.y, { strong: true }), true, 'strength alone does not climb');
assert.equal(blockedAt([gate], gate.x, gate.y, { small: true }), true, 'nor does being small');
assert.equal(blockedAt([gate], gate.x, gate.y, { flying: true }), false, 'a flyer passes over the wall too');

for (let s = 1; s <= 60; s++) {
  const features = assembleRooms(s * 7919, 'memory-forest');
  const proof = validateGeckoRoute(features, {});
  assert.equal(proof.climbReaches, true, `seed ${s}: the gecko reaches the inside`);
  assert.equal(proof.walkerBefore, false, `seed ${s}: a walker cannot, while the gate is barred`);
  assert.equal(proof.walkerAfter, true, `seed ${s}: and can, once it is opened`);
  assert.equal(proof.ok, true, `seed ${s}: the gate is proven`);
  assert(enclosureWithGateOpen(features).every((f) => f.gate !== true), `seed ${s}: opening removes the gate`);
  assert.equal(validateElephantRoute(features, {}).ok, true, `seed ${s}: the grove is still proven`);
  assert.equal(validateRabbitRoute(features, {}).ok, true, `seed ${s}: the field is still proven`);
}
log('wall and gate proof ok (60 seeds)');

// ---- 2. the gate is offered only from the inside ----
state.lifeMode = true;
state.formId = 'gecko';
state.realmId = 'manussa';
state.world.effects = {};
resetKarma();
worldEffects();
gecko.resetGecko();
state.mode = 'world';
initDynamicWorld(2);

assert.equal(isRebirthForm(FORMS.find((f) => f.id === 'gecko')), true, 'the gecko may be reborn now');
assert.equal(mapsFor('gecko').includes('land'), true, 'and it names a map that carries it');
assert.equal(gecko.gateOpened(), false, 'a new life arrives at a barred gate');
assert.equal(gecko.gateFeature() !== null, true, 'the gate is on the map this life walks');

const before = goalFor();
assert.equal(before.kind, 'gate', 'the life is first pointed at the gate');

let completions = 0;
on(EVENTS.LIFE_COMPLETE, () => { completions += 1; });

// from outside, nothing is offered — the wall is between the body and the bar
player.x = gate.x;
player.y = gate.y + ENCLOSURE.wallRadius + 30;
gecko.updateGecko();
assert.equal(state.interact, null, 'outside the wall the bar cannot be reached');

// from inside, the bar offers itself
player.x = ENCLOSURE.center.x;
player.y = ENCLOSURE.center.y + ENCLOSURE.ring - 60;
assert.equal(gecko.isInside(), true, 'this stands inside the wall');
gecko.updateGecko();
assert(state.interact && state.interact.labelKey === 'prompt.openGate', 'inside, the gate offers its bar');
log('gate prompt ok');

// ---- 3. opening it is a change for everyone ----
state.interact.fn();
assert.equal(gecko.isOpened(), true, 'the gate is opened');
assert.equal(hasEffect('gate-opened'), true, 'and the world records it');
assert(getKarma().merit > 0, 'opening a way for others is remembered as giving');
assert.equal(gecko.gateFeature(), null, 'the gate has left the world');
assert.equal(gecko.openGate(), false, 'and cannot be opened twice');
assert.equal(goalFor().kind, 'enclosure', 'now the refuge itself is the ending');
log('opening ok');

// ---- 4. the refuge is rest, and only once it is open ----
assert.equal(isRestful(ENCLOSURE.center.x, ENCLOSURE.center.y), true, 'the inside is a resting place now');
assert.equal(restingPlaceAt(ENCLOSURE.center.x, ENCLOSURE.center.y), 'enclosure', 'and it knows which place it is');
state.world.effects = {};
assert.equal(isRestful(ENCLOSURE.center.x, ENCLOSURE.center.y), false, 'without the opening it is not rest');
state.world.effects = { 'gate-opened': true };
log('refuge felt ok');

// ---- 5. settling inside ends the life ----
player.x = ENCLOSURE.center.x;
player.y = ENCLOSURE.center.y;
updateLifeGoal();
assert.equal(completions, 1, 'resting inside completes the life');
assert.equal(gecko.settleRefuge(), true, 'and the world remembers the gate was opened');

// ---- 6. a new life arrives at a barred gate again (the world keeps the opening) ----
loadChapter(1, { autosave: false });
assert.equal(gecko.isOpened(), false, 'a new chapter (and a new life) starts at a barred gate');
// Keep the route proof in the gecko's forest; opening the gate earned merit and
// would otherwise move the next life to a heavenly map.
resetKarma();
state.realmId = 'manussa';

// ---- 7. the gecko can really walk its errand ----
for (const tree of TREES) {
  for (let i = 0; i < ENCLOSURE_APPROACH.length - 1; i++) {
    const [ax, ay] = ENCLOSURE_APPROACH[i];
    const [bx, by] = ENCLOSURE_APPROACH[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    const tt = Math.max(0, Math.min(1, ((tree.x - ax) * dx + (tree.y - ay) * dy) / (len * len)));
    const distance = Math.hypot(tree.x - (ax + dx * tt), tree.y - (ay + dy * tt));
    assert(distance > tree.r + PLAYER.radius + 12, 'the errand is kept clear of trunks');
  }
}

state.formId = 'gecko';
state.lifeMode = true;
state.lifeId = 1;
state.world.effects = {};
state.world.removed = [];
initDynamicWorld(1);
const features = state.dynamic.features;
const step = 18;
const cols = Math.ceil(WORLD.w / step);
const rows = Math.ceil(WORLD.h / step);
const index = (c, r) => r * cols + c;
const build = (abilities) => {
  const blocked = new Uint8Array(cols * rows);
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
  return blocked;
};
const canReach = (blocked, from, to) => {
  const seen = new Uint8Array(cols * rows);
  const start = { c: Math.floor(from.x / step), r: Math.floor(from.y / step) };
  const goalCell = { c: Math.floor(to.x / step), r: Math.floor(to.y / step) };
  const queue = [start];
  seen[index(start.c, start.r)] = 1;
  while (queue.length) {
    const cell = queue.shift();
    if (cell.c === goalCell.c && cell.r === goalCell.r) return true;
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
const road = { x: ENCLOSURE_APPROACH[0][0], y: ENCLOSURE_APPROACH[0][1] };
const climber = build({ climbing: true, cling: true });
const walker = build({});
assert.equal(canReach(climber, road, ENCLOSURE.center), true, 'the gecko climbs in from the road');
assert.equal(canReach(walker, road, ENCLOSURE.center), false, 'a walker cannot get in while the gate is barred');
log('errand walkable ok');

// ---- 8. the gecko is offered in the chapter pools ----
let sawGecko = false;
const chapterIds = Array.from({ length: 14 }, (_, i) => i + 1);
let route = { chapter: 1, lifeId: 1, history: ['human'], chapterIds };
for (let i = 0; i < 600; i++) {
  const next = planNextLife(route);
  if (next.formId === 'gecko') sawGecko = true;
  route = { ...next, history: [...route.history, next.formId], chapterIds };
}
assert.equal(sawGecko, true, 'the gecko is born during a long journey');
log('rebirth ok');

console.error('GECKO TEST OK — a sheer wall climbed, a barred gate opened from the inside, and a way left open for others');
