import assert from 'node:assert/strict';

/*
 * The firefly's swarm (docs/animal-lives-story.md reserve table, "หิ่งห้อย — ส่งแสง
 * เป็นจังหวะ · สื่อสารกับฝูงและนำทางในหมอก").
 *
 * The reserve table asks for two things: signalling in rhythm, and *guiding in fog*.
 * The mist at the gate is nothing to a body that glows — the firefly's own, private
 * way in — and a wall to everything else. What the life does at the stone turns that
 * private way into a common one, and the proof says exactly that: a body that does
 * not glow cannot pass before, and can after; a glowing body can, either way.
 */

const elements = new Map();
function element(tag = 'div') {
  const classes = new Set(['hidden']);
  const events = {};
  const node = {
    tagName: String(tag).toUpperCase(),
    style: {}, dataset: {}, children: [], textContent: '', innerHTML: '',
    classList: {
      add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c),
      toggle(c, yes) { if (yes === undefined ? !classes.has(c) : yes) classes.add(c); else classes.delete(c); },
    },
    addEventListener: (key, fn) => { events[key] = fn; },
    click() { events.click?.({ target: { blur() {} } }); },
    appendChild(child) { this.children.push(child); return child; },
    querySelectorAll: () => [], getContext: () => ({}), setAttribute() {},
  };
  Object.defineProperty(node, 'innerHTML', { get: () => '', set: (value) => { if (!value) node.children.length = 0; } });
  return node;
}
const query = (id) => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); };
globalThis.document = { hidden: false, querySelector: query, querySelectorAll: () => [], getElementById: query, createElement: element };
globalThis.window = { matchMedia: () => ({ matches: false }), addEventListener() {}, location: { reload() {} } };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.performance = { now: () => 0 };

const { state } = await import('../src/core/state.js');
const { MODE } = await import('../src/core/constants.js');
const { FORMS, mapsFor, isRebirthForm } = await import('../src/content/forms.js');
const { SIGNAL, TREES, signalGate } = await import('../src/world/world-data.js');
const { dist } = await import('../src/core/math.js');
const {
  assembleRooms, assembleSignalSite, validateFireflyRoute, blockedAt, validateRoute,
} = await import('../src/world/rooms.js');
const { BIOMES } = await import('../src/content/biomes.js');
const { goalFor, updateLifeGoal } = await import('../src/systems/goals.js');
const { initDynamicWorld, dynamicFeatures, worldAbilities } = await import('../src/systems/worldgen.js');
const { getKarma, resetKarma } = await import('../src/systems/karma.js');
const { hasEffect, leavingList } = await import('../src/systems/world-effects.js');
const { candidatesFor, planNextLife } = await import('../src/systems/life-route.js');
const { loadChapter } = await import('../src/game/chapters.js');
const { player } = await import('../src/entities/player.js');
const firefly = await import('../src/game/firefly.js');

const log = (message) => console.error(`[firefly] ${message}`);

// ---- 1. the mist: nothing to a glowing body, a wall to everything else ----
{
  const bare = assembleSignalSite();
  const bramble = bare.filter((f) => f.type === 'bramble');
  const mist = bare.filter((f) => f.type === 'mist');
  assert(bramble.length >= 14, `the bramble rings the field (${bramble.length})`);
  assert(mist.length >= 3, 'with mist across its gate');
  assert.equal(bare.filter((f) => f.type === 'swarmstone').length, 1, 'and one stone at the middle');
  // The gate runs across the ring, so the crossing is radial: sample the corridor
  // just inside and just outside the mist, where only the mist lies.
  const gate = signalGate();
  const face = { x: Math.cos(gate.angle), y: Math.sin(gate.angle) };
  const outside = { x: gate.x + face.x * 22, y: gate.y + face.y * 22 };
  const inside = { x: gate.x - face.x * 22, y: gate.y - face.y * 22 };
  assert.equal(blockedAt(bare, bramble[0].x, bramble[0].y, { glow: true }), true, 'a bramble stops even a glowing body');
  for (const point of [outside, inside]) {
    assert.equal(blockedAt(bare, point.x, point.y, {}), true, 'the mist stops a body that does not glow');
    assert.equal(blockedAt(bare, point.x, point.y, { glow: true }), false, 'and is nothing to one that does');
    assert.equal(blockedAt(bare, point.x, point.y, { swarmGuide: true }), false, 'and nothing to a life the swarm guides');
    // Flying ignores walls everywhere in this game, and the mist is a wall like any
    // other: a flyer crosses it — which is why the swarm's gift matters most to the
    // bodies that *walk*.
    assert.equal(blockedAt(bare, point.x, point.y, { flying: true }), false, 'a flyer is above it, as above every wall');
    assert.equal(blockedAt(bare, bramble[0].x, bramble[0].y, { flying: true }), false, 'as it is above the brambles');
  }
  assert.equal(blockedAt(bare, SIGNAL.stone.x, SIGNAL.stone.y, {}), false, 'the stone itself is a place, not an obstacle');
  assert.equal(BIOMES['memory-forest'].sites.includes('signal'), true, 'the field belongs to the forest plane');
  log('the mist ok');
}

// ---- 2. the four-part proof, in every seed ----
for (let seed = 1; seed <= 40; seed++) {
  const features = assembleRooms(seed * 7919, 'memory-forest');
  const proof = validateFireflyRoute(features);
  assert.equal(proof.walkerBefore, false, `seed ${seed}: a body that does not glow cannot reach the stone`);
  assert.equal(proof.glowerBefore, true, `seed ${seed}: a body that glows can — the firefly's private way`);
  assert.equal(proof.glowerAfter, true, `seed ${seed}: and still can after the swarm is lit`);
  assert.equal(proof.walkerAfter, true, `seed ${seed}: while every body may pass once the swarm is lit — the way is shared`);
  assert.equal(proof.ok, true, `seed ${seed}: the swarm field is proven`);
  assert.equal(validateRoute(features, 'human').ok, true, `seed ${seed}: the road still walks`);
}
log('four-part proof ok (40 seeds)');

// ---- 3. the life: in past the mist, signal, and the swarm answers ----
{
  resetKarma();
  state.world = { effects: {}, leavings: [] };
  state.formId = 'firefly';
  state.realmId = 'manussa';
  state.lifeId = 21;
  state.lifeMode = true;
  state.mode = MODE.WORLD;
  firefly.resetFirefly();
  initDynamicWorld(2);

  assert.equal(isRebirthForm(FORMS.find((form) => form.id === 'firefly')), true, 'the firefly may be reborn');
  assert.equal(mapsFor('firefly').includes('air'), true, 'and it names a map that carries it');
  assert.equal(goalFor().kind, 'swarm-guide', 'the life is pointed at the stone');
  assert.equal(worldAbilities().glow, true, 'and its body glows, which is the mist\'s key');
  assert.equal(firefly.swarmLit(), false, 'the swarm is not lit yet');

  player.x = SIGNAL.stone.x;
  player.y = SIGNAL.stone.y;
  state.interact = null;
  firefly.updateFirefly();
  assert(state.interact && state.interact.labelKey === 'prompt.signalSwarm', 'the stone offers the one act');
  state.interact.fn();
  assert.equal(firefly.hasSignalled(), true, 'the rhythm is signalled');
  assert.equal(hasEffect('swarm-lit'), true, 'and the swarm answers in the world');
  assert(getKarma().merit > 0, 'sharing its own way is remembered as giving');
  assert.equal(goalFor().kind, 'swarm-answered', 'the stone is now an ending');
  assert.equal(worldAbilities().swarmGuide, true, 'and the mist guides the life that lit it');
  {
    const gate = signalGate();
    const face = { x: Math.cos(gate.angle), y: Math.sin(gate.angle) };
    const crossing = { x: gate.x - face.x * 22, y: gate.y - face.y * 22 };
    assert.equal(blockedAt(dynamicFeatures(), crossing.x, crossing.y, worldAbilities()), false,
      'and in this very life the mist now guides it too');
  }

  let completions = 0;
  const { on, EVENTS } = await import('../src/core/events.js');
  on(EVENTS.LIFE_COMPLETE, () => { completions += 1; });
  updateLifeGoal();
  assert.equal(completions, 1, 'and standing at the stone ends the life');
  assert.equal(firefly.settleSwarm(), true, 'with the swarm answering');
  log('the life ok');
}

// ---- 4. a later life any body walks through, and the leaving is in the book ----
{
  state.world.effects = { 'swarm-lit': true };
  state.formId = 'deer';
  state.lifeId = 22;
  initDynamicWorld(2);
  const gate = signalGate();
  const face = { x: Math.cos(gate.angle), y: Math.sin(gate.angle) };
  for (const step of [22, -22]) {
    const crossing = { x: gate.x + face.x * step, y: gate.y + face.y * step };
    assert.equal(blockedAt(dynamicFeatures(), crossing.x, crossing.y, worldAbilities()), false,
      'a deer walks through the gate a firefly opened');
    assert.equal(blockedAt(dynamicFeatures(), crossing.x, crossing.y, { glow: false, swarmGuide: false }), true,
      'and without the swarm it would have been walled out');
  }
  const leaving = leavingList().find((entry) => entry.code === 'swarm-lit');
  assert(leaving, 'the lit swarm is a leaving in the world book');
  assert.equal(leaving.site, 'signal', 'placed at the swarm stone');
  assert(leaving.place && Number.isFinite(leaving.place.x), 'with somewhere to walk back to');
  log('cross-life ok');
}

// ---- 5. a new life arrives to a mist closed to everyone but itself ----
{
  loadChapter(1, { autosave: false });
  assert.equal(firefly.hasSignalled(), false, 'a new life has not signalled yet');
  assert.equal(firefly.swarmLit(), true, 'while the swarm a past life lit still shines');
  log('new life ok');
}

// ---- 6. it is offered, it draws, and no trunk stands in its field ----
{
  assert.equal(candidatesFor(3, ['land', 'air']).includes('firefly'), true, 'the firefly is offered where a small flying body is carried');
  let saw = false;
  const chapterIds = Array.from({ length: 14 }, (_, i) => i + 1);
  let route = { chapter: 1, lifeId: 1, history: [], chapterIds };
  for (let i = 0; i < 900; i++) {
    const next = planNextLife(route);
    if (next.formId === 'firefly') saw = true;
    route = { ...next, history: [...route.history, next.formId], chapterIds };
  }
  assert.equal(saw, true, 'and it is born during a long journey');
  const { FORM_PALETTES, drawFormBody } = await import('../src/render/forms-sprites.js');
  assert(FORM_PALETTES.firefly, 'the firefly has its own art');
  const calls = [];
  const ctx = new Proxy({}, {
    get: (target, key) => (key in target ? target[key] : (...args) => { calls.push([key, args]); }),
    set: (target, key, value) => { target[key] = value; return true; },
  });
  drawFormBody(ctx, 'firefly', 40, 40, { face: 1, phase: 0.4, moving: true, bob: 0.5, act: 0.3, pose: 'act' });
  assert(calls.length > 6, `and actually draws (${calls.length} ops)`);
  for (const tree of TREES) {
    for (const spot of [SIGNAL.stone, SIGNAL.rest, SIGNAL.road]) {
      assert(dist(tree.x, tree.y, spot.x, spot.y) > 110, 'no trunk stands in the field, at its gate or on the road it faces');
    }
  }
  log('rebirth and art ok');
}

console.error('FIREFLY TEST OK — a private light shared: the mist that walled the way became a way for every body');
