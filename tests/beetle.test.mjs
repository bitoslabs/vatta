import assert from 'node:assert/strict';

/*
 * The beetle's groove (docs/animal-lives-story.md reserve table, "ด้วง — ผลักวัตถุ
 * ด้วยแรงและทิศ · ร่วมกับมดขนเมล็ดใหญ่ข้ามร่อง").
 *
 * The first directional mechanic in the game: one verb, *push*, and the direction is
 * where the body stands. Five steps seat the big seed in the socket on the trench
 * ring, and a seated seed is a crossing for every body — force and direction turned
 * into something a life has to do.
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
const { PUSH, TREES, seedPoint } = await import('../src/world/world-data.js');
const { dist } = await import('../src/core/math.js');
const {
  assembleRooms, assemblePushSite, validatePushRoute, blockedAt, validateRoute,
} = await import('../src/world/rooms.js');
const { BIOMES } = await import('../src/content/biomes.js');
const { goalFor, updateLifeGoal } = await import('../src/systems/goals.js');
const { initDynamicWorld, dynamicFeatures } = await import('../src/systems/worldgen.js');
const { getKarma, resetKarma } = await import('../src/systems/karma.js');
const { hasEffect, leavingList } = await import('../src/systems/world-effects.js');
const { candidatesFor, planNextLife } = await import('../src/systems/life-route.js');
const { loadChapter } = await import('../src/game/chapters.js');
const { player } = await import('../src/entities/player.js');
const beetle = await import('../src/game/beetle.js');

const log = (message) => console.error(`[beetle] ${message}`);

// ---- 1. the trench, the groove and the seed ----
{
  const bare = assemblePushSite(0);
  const trench = bare.filter((f) => f.type === 'trench');
  const groove = bare.filter((f) => f.type === 'groove');
  const seed = bare.filter((f) => f.type === 'bigseed');
  assert(trench.length >= 18, `the trench rings the hollow (${trench.length} stones)`);
  assert(groove.length >= 5, `the groove is worn towards it (${groove.length} marks)`);
  assert.equal(seed.length, 1, 'and one big seed stands on the groove');
  assert.equal(bare.filter((f) => f.type === 'seat').length, 0, 'with nothing seated at first');
  assert.equal(blockedAt(bare, trench[0].x, trench[0].y, {}), true, 'the trench stops a walker');
  assert.equal(blockedAt(bare, trench[0].x, trench[0].y, { leap: true }), false, 'and a leaper crosses it');
  assert.equal(blockedAt(bare, trench[0].x, trench[0].y, { small: true }), true, 'being small does not help');
  assert.equal(blockedAt(bare, seed[0].x, seed[0].y, {}), true, 'the seed itself is solid');
  assert.equal(blockedAt(assemblePushSite(PUSH.steps), PUSH.socket.x, PUSH.socket.y, {}), false,
    'and where it is seated, the way is open');
  assert.equal(BIOMES['memory-forest'].sites.includes('push'), true, 'the groove belongs to the forest plane');
  log('trench and seed ok');
}

// ---- 2. the four-part proof, in every seed, and no half-pushed shortcut ----
for (let seed = 1; seed <= 40; seed++) {
  const features = assembleRooms(seed * 7919, 'memory-forest');
  const proof = validatePushRoute(features);
  assert.equal(proof.walkerBefore, false, `seed ${seed}: a walker cannot reach the far hollow`);
  assert.equal(proof.walkerAfter, true, `seed ${seed}: and can once the seed is seated`);
  assert.equal(proof.leapBefore, true, `seed ${seed}: a leaper crossed before`);
  assert.equal(proof.leapAfter, true, `seed ${seed}: and still does — nothing was closed`);
  assert.equal(proof.ok, true, `seed ${seed}: the groove is proven`);
  assert.equal(validateRoute(features, 'human').ok, true, `seed ${seed}: the road still walks`);
  // A half-pushed seed is not a crossing: the seat only exists at the socket.
  const half = assembleRooms(seed * 7919, 'memory-forest', { pushes: 2 });
  assert.equal(half.some((feature) => feature.type === 'seat'), false, `seed ${seed}: two pushes seat nothing`);
}
log('four-part proof ok (40 seeds)');

// ---- 3. the life: push with force and direction, then cross ----
{
  resetKarma();
  state.world = { effects: {}, leavings: [], pushes: 0 };
  state.formId = 'beetle';
  state.realmId = 'manussa';
  state.lifeId = 27;
  state.lifeMode = true;
  state.mode = MODE.WORLD;
  beetle.resetBeetle();
  initDynamicWorld(2);

  assert.equal(isRebirthForm(FORMS.find((form) => form.id === 'beetle')), true, 'the beetle may be reborn');
  assert.equal(mapsFor('beetle').includes('land'), true, 'and names a map that carries it');
  assert.equal(goalFor().kind, 'push-seed', 'the life is pointed at the seed');
  assert.equal(beetle.pushedSteps(), 0, 'which nothing has pushed yet');

  // Push from behind the seed: it rolls towards the socket.
  const before = seedPoint(0);
  player.x = before.x - PUSH.dir.x * 60;
  player.y = before.y - PUSH.dir.y * 60;
  state.interact = null;
  beetle.updateBeetle();
  assert(state.interact && state.interact.labelKey === 'prompt.pushSeed', 'the seed offers the one verb');
  state.interact.fn();
  assert.equal(beetle.pushedSteps(), 1, 'the seed rolls on one step');
  assert.equal(beetle.pushedSteps(), state.world.pushes, 'and the world keeps how far it is');
  assert(dist(seedPoint(1).x, seedPoint(1).y, seedPoint(0).x, seedPoint(0).y) > 30, 'it really moved');

  // Stand past the seed and push: it comes back. Direction is where the body stands.
  const now = seedPoint(1);
  player.x = now.x + PUSH.dir.x * 60;
  player.y = now.y + PUSH.dir.y * 60;
  state.interact = null;
  const { dynamicFeatures: featuresNow } = await import('../src/systems/worldgen.js');
  assert(featuresNow().some((f) => f.type === 'bigseed' && dist(f.x, f.y, now.x, now.y) < 2),
    'the live world has the seed where the push left it');
  beetle.updateBeetle();
  state.interact.fn();
  assert.equal(beetle.pushedSteps(), 0, 'pushing from the far side brings it back');
  log('pushing ok');
}

// ---- 4. five pushes seat it, and the crossing is everyone's ----
{
  state.world.pushes = 0;
  beetle.resetBeetle();
  for (let step = 0; step < PUSH.steps; step++) {
    const at = seedPoint(beetle.pushedSteps());
    player.x = at.x - PUSH.dir.x * 60;
    player.y = at.y - PUSH.dir.y * 60;
    state.interact = null;
    beetle.pushSeed();
  }
  assert.equal(beetle.pushedSteps(), PUSH.steps, 'five pushes reach the socket');
  assert.equal(beetle.hasSeated(), true, 'and the seed is seated');
  assert.equal(hasEffect('trench-bridged'), true, 'the world records the crossing');
  assert(getKarma().merit > 0, 'opening a way for others is remembered as giving');
  assert.equal(goalFor().kind, 'push-crossed', 'the far hollow is now the goal');
  assert.equal(blockedAt(dynamicFeatures(), PUSH.socket.x, PUSH.socket.y, {}), false,
    'and a walker may cross where the seed is seated');
  assert.equal(beetle.pushSeed(), false, 'a seated seed is not pushed any further');

  let completions = 0;
  const { on, EVENTS } = await import('../src/core/events.js');
  on(EVENTS.LIFE_COMPLETE, () => { completions += 1; });
  player.x = PUSH.hollow.x;
  player.y = PUSH.hollow.y;
  updateLifeGoal();
  assert.equal(completions, 1, 'and walking into the hollow ends the life');
  assert.equal(beetle.settleTrench(), true, 'with the crossing standing');
  log('the life ok');
}

// ---- 5. a later life walks the crossing, and the leaving is in the book ----
{
  state.world.effects = { 'trench-bridged': true };
  state.formId = 'deer';
  state.lifeId = 28;
  initDynamicWorld(2);
  assert.equal(blockedAt(dynamicFeatures(), PUSH.socket.x, PUSH.socket.y, {}), false,
    'a deer walks over a seed it never pushed');
  assert.equal(beetle.pushedSteps(), PUSH.steps, 'the world remembers how far it was pushed');
  const leaving = leavingList().find((entry) => entry.code === 'trench-bridged');
  assert(leaving, 'the crossing is a leaving in the world book');
  assert.equal(leaving.site, 'push', 'placed at the socket');
  assert(leaving.place && Number.isFinite(leaving.place.x), 'with somewhere to walk back to');
  log('cross-life ok');
}

// ---- 6. it is offered, it draws, and no trunk stands in the groove ----
{
  assert.equal(candidatesFor(3, ['land']).includes('beetle'), true, 'the beetle is offered where a pushing body is carried');
  let saw = false;
  const chapterIds = Array.from({ length: 14 }, (_, i) => i + 1);
  let route = { chapter: 1, lifeId: 1, history: [], chapterIds };
  for (let i = 0; i < 900; i++) {
    const next = planNextLife(route);
    if (next.formId === 'beetle') saw = true;
    route = { ...next, history: [...route.history, next.formId], chapterIds };
  }
  assert.equal(saw, true, 'and it is born during a long journey');
  const { FORM_PALETTES, drawFormBody } = await import('../src/render/forms-sprites.js');
  assert(FORM_PALETTES.beetle, 'the beetle has its own art');
  const calls = [];
  const ctx = new Proxy({}, {
    get: (target, key) => (key in target ? target[key] : (...args) => { calls.push([key, args]); }),
    set: (target, key, value) => { target[key] = value; return true; },
  });
  drawFormBody(ctx, 'beetle', 40, 40, { face: 1, phase: 0.4, moving: true, bob: 0.5, act: 0.3, pose: 'act' });
  assert(calls.length > 8, `and actually draws (${calls.length} ops)`);
  for (const tree of TREES) {
    for (const spot of [PUSH.groove, PUSH.socket, PUSH.hollow, PUSH.road]) {
      assert(dist(tree.x, tree.y, spot.x, spot.y) > 110, 'no trunk stands on the groove, the socket, the hollow or its road');
    }
  }
  log('rebirth and art ok');
}

console.error('BEETLE TEST OK — one verb and a direction: five pushes seat the seed, and the trench becomes everyone\'s way across');
