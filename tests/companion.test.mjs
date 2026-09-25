import assert from 'node:assert/strict';

/*
 * A companion (docs/player-interactions.md "เพื่อนร่วมทาง", docs/next-production-plan.md
 * item 6): one dog, that follows at a distance, is visibly *afraid of water*, and
 * remembers being called. The brief is "ตอบสนองชัด ไม่ติดผู้เล่นหรือกีดทาง" — responds
 * clearly, never sticks to the player, never blocks the way — and both of those are
 * assertions here rather than hopes.
 */

const elements = new Map();
function element(tag = 'div') {
  const classes = new Set(['hidden']);
  const events = {};
  const node = {
    tagName: String(tag).toUpperCase(),
    style: {}, dataset: {}, children: [], textContent: '', innerHTML: '', disabled: false,
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
globalThis.document = { hidden: false, querySelector: query, querySelectorAll: () => [], getElementById: (id) => query(`#${id}`), createElement: element };
globalThis.window = { matchMedia: () => ({ matches: false }), addEventListener() {}, location: { reload() {} } };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.performance = { now: () => 0 };

const { state } = await import('../src/core/state.js');
const { MODE } = await import('../src/core/constants.js');
const { dist } = await import('../src/core/math.js');
const { inWater } = await import('../src/systems/forms.js');
const rooms = await import('../src/world/rooms.js');
const { RIVER: RIVER_POLY } = await import('../src/world/world-data.js');
const companion = await import('../src/systems/companion.js');
const effects = await import('../src/systems/world-effects.js');
const { loadChapter, CHAPTERS } = await import('../src/game/chapters.js');
const { player } = await import('../src/entities/player.js');

const log = (message) => console.error(`[companion] ${message}`);
const world = () => state.dynamic?.features || [];

function startLife({ chapter = 1, effects: preset = {} } = {}) {
  state.lifeMode = true;
  state.liberated = false;
  state.lifeId = 1;
  state.formHistory = ['human'];
  state.lifeLog = [];
  state.world = { ...(state.world || {}), effects: { ...preset }, leavings: [] };
  state.mode = MODE.WORLD;
  loadChapter(chapter);
  return companion.companionState();
}

// ---- 1. it is there at the first meeting, and only there or when remembered ----
{
  startLife({ chapter: 1 });
  const dog = () => companion.companionState();
  assert.equal(dog().active, true, 'a dog is at the gate in the first chapter');
  assert.equal(dog().bonded, false, 'and it does not know us yet');
  assert(dist(dog().x, dog().y, player.x, player.y) <= 190, 'it starts near the life it joins');
  assert.equal(companion.companionWanted(), true, 'and the life wants it');
  startLife({ chapter: 3 });
  assert.equal(companion.companionState().active, false, 'without the friendship, a later chapter has no dog');
  startLife({ chapter: 3, effects: { 'friend-kept': true } });
  assert.equal(companion.companionState().active, true, 'while a memory of one brings it back');
  assert.equal(companion.companionState().bonded, true, 'already knowing us');
  log('presence ok');
}

// ---- 2. it follows at a distance and never crowds or blocks ----
{
  startLife({ chapter: 1 });
  const dog = () => companion.companionState();
  const features = world();
  // Walk the player a long way; the dog must close the gap but keep its distance.
  player.x += 600;
  let closest = Infinity;
  for (let i = 0; i < 240; i++) {
    companion.updateCompanion(1 / 60);
    const gap = dist(dog().x, dog().y, player.x, player.y);
    if (i > 60) closest = Math.min(closest, gap);
  }
  const gap = dist(dog().x, dog().y, player.x, player.y);
  assert(gap < 200, `it catches up (gap ${Math.round(gap)})`);
  assert(closest > 30, `and never walks into the player (closest ${Math.round(closest)})`);
  // It is not a feature, so it cannot block anything: the player's own step through
  // the dog's square is allowed.
  assert.equal(world().some((feature) => feature.type === 'companion'), false, 'the dog is not world geometry');
  assert.equal(rooms.blockedAt(features, dog().x, dog().y, {}), false, 'and nothing blocks where it stands');
  assert.equal(rooms.blockedAt(features, player.x, player.y, {}), false, 'the player stands free too');
  log('follow ok');
}

// ---- 3. it is afraid of water: it waits on the bank, and says so once ----
{
  startLife({ chapter: 1 });
  const dog = () => companion.companionState();
  // Stand the dog just outside the river band, with the player straight across it, so
  // the very first step it wants to take is into the water — and pick a stretch of
  // river whose bank is actually clear, or the dog would be stopped by silt before
  // the water ever mattered (which is fine in play, but proves nothing here).
  const features = world();
  let a = RIVER_POLY[3];
  let perp = { x: -1, y: 0 };
  let edge = 0;
  for (let i = 2; i < RIVER_POLY.length - 2; i++) {
    const from = RIVER_POLY[i];
    const to = RIVER_POLY[i + 1];
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
    const guess = { x: -(to[1] - from[1]) / length, y: (to[0] - from[0]) / length };
    let firstDry = 0;
    for (let d = 0; d < 400; d += 2) {
      if (!inWater(from[0] + guess.x * d, from[1] + guess.y * d)) { firstDry = d; break; }
    }
    const dogSpot = { x: from[0] + guess.x * (firstDry + 2), y: from[1] + guess.y * (firstDry + 2) };
    const wetSpot = { x: from[0] + guess.x * (firstDry - 8), y: from[1] + guess.y * (firstDry - 8) };
    if (!rooms.blockedAt(features, dogSpot.x, dogSpot.y, {}) && !rooms.blockedAt(features, wetSpot.x, wetSpot.y, {})) {
      a = from;
      perp = guess;
      edge = firstDry;
      break;
    }
  }
  companion.placeCompanionAt(a[0] + perp.x * (edge + 2), a[1] + perp.y * (edge + 2));
  player.x = a[0] - perp.x * (edge + 200);
  player.y = a[1] - perp.y * (edge + 200);
  assert.equal(inWater(dog().x, dog().y), false, 'the dog starts on dry ground');
  assert.equal(inWater(player.x, player.y), false, 'and the life it follows is on the far bank');

  let enteredWater = false;
  let barks = 0;
  const trace = [];
  for (let i = 0; i < 400; i++) {
    companion.updateCompanion(1 / 60);
    if (inWater(dog().x, dog().y)) enteredWater = true;
    if (dog().bark > 0) barks += 1;
    if (i < 4 || i % 60 === 0) {
      trace.push(`f${i} at ${dog().x.toFixed(1)},${dog().y.toFixed(1)} wet ${inWater(dog().x, dog().y)} blocked ${rooms.blockedAt(world(), dog().x, dog().y, {})} stuck ${dog().stuck.toFixed(2)}`);
    }
  }
  if (barks === 0) console.error('[companion] water trace:', trace.join(' | '), '· edge', edge, '· a', JSON.stringify(a));
  assert.equal(enteredWater, false, 'the dog never enters the water');
  assert(barks > 0, `and it makes a sound about it (${barks} frames)`);
  assert.equal(inWater(dog().x, dog().y), false, 'it is still on dry ground');
  log('afraid of water ok');
}

// ---- 4. it comes back to your side rather than pathfinding forever ----
{
  startLife({ chapter: 1 });
  const dog = () => companion.companionState();
  // A real wall between them: the dog is close enough to want the player, and every
  // step toward the life is blocked, so it must come back rather than push forever.
  const wall = [];
  for (let i = -3; i <= 3; i++) wall.push({ i: 900 + i, site: 'test', type: 'citywall', fixed: true, x: player.x + 100, y: player.y - i * 60, r: 60 });
  state.dynamic.features = [...state.dynamic.features, ...wall];
  companion.placeCompanionAt(player.x + 200, player.y);
  for (let i = 0; i < 400; i++) companion.updateCompanion(1 / 60);
  const gap = dist(dog().x, dog().y, player.x, player.y);
  assert(gap < 220, `it rehomes beside the life instead of pushing at a wall (gap ${Math.round(gap)})`);
  state.dynamic.features = state.dynamic.features.filter((feature) => feature.site !== 'test');
  assert.equal(inWater(dog().x, dog().y), false, 'onto dry ground');
  assert.equal(rooms.blockedAt(world(), dog().x, dog().y, {}), false, 'and onto free ground');
  // Never stuck inside geometry across a long walk either.
  let insideSolid = false;
  for (let i = 0; i < 600; i++) {
    player.x += 3;
    player.y += i % 2 ? 2 : -2;
    companion.updateCompanion(1 / 60);
    if (rooms.blockedAt(world(), dog().x, dog().y, {})) insideSolid = true;
  }
  assert.equal(insideSolid, false, 'and it is never inside stone');
  log('never stuck ok');
}

// ---- 5. the call: it answers, waits, follows again ----
{
  startLife({ chapter: 1 });
  const dog = () => companion.companionState();
  assert.equal(companion.callCompanion(), true, 'the dog can be called');
  assert.equal(dog().mode, 'following', 'and it follows');
  assert.equal(dog().calls, 1, 'the call is counted while it is beside you');
  assert.equal(companion.callCompanion(), true, 'a second call');
  assert.equal(dog().mode, 'waiting', 'asks it to wait');
  const held = { x: dog().x, y: dog().y };
  player.x += 500;
  for (let i = 0; i < 120; i++) companion.updateCompanion(1 / 60);
  assert.deepEqual({ x: dog().x, y: dog().y }, held, 'a waiting dog stays where it was told');
  assert.equal(companion.callCompanion(), true, 'calling again');
  assert.equal(dog().mode, 'following', 'it comes along');
  log('call/wait/follow ok');
}

// ---- 6. three calls make a friendship, which becomes a leaving at the gate ----
{
  startLife({ chapter: 1 });
  const dog = () => companion.companionState();
  companion.callCompanion();
  companion.callCompanion(); // wait
  companion.callCompanion(); // follow again
  companion.callCompanion(); // third counting call
  assert.equal(dog().bonded, true, 'three calls beside it make a friendship');
  assert.equal(dog().metLifeId, 1, 'and the life that made it is named');
  assert.equal(effects.hasEffect('friend-kept'), true, 'the friendship is a world effect');
  const leaving = effects.leavingList().find((entry) => entry.code === 'friend-kept');
  assert(leaving, 'and a leaving in the world book');
  assert.equal(leaving.site, 'gate', 'placed at the gate where it began');
  assert(leaving.place && Number.isFinite(leaving.place.x), 'with a real place to walk back to');
  assert.equal(effects.recordEffect('friend-kept'), false, 'and it is recorded once, not per call');
  log('friendship ok');
}

// ---- 7. a later life is met by a dog that knows you ----
{
  startLife({ chapter: 4, effects: { 'friend-kept': true } });
  const dog = () => companion.companionState();
  assert.equal(dog().active, true, 'the dog is there in a later life');
  assert.equal(dog().bonded, true, 'already a friend');
  companion.callCompanion();
  assert.equal(dog().mode, 'following', 'and it comes when called');
  assert.equal(dog().calls, 0, 'and a friend is not counted again — it is already yours');
  log('cross-life ok');
}

// ---- 8. a companion can always be found: it carries a mark of its own ----
{
  const { drawCompanion } = await import('../src/render/forms-sprites.js');
  startLife({ chapter: 1 });
  const dog = companion.companionState();
  const colours = [];
  const ctx = new Proxy({}, {
    get: (target, key) => (key in target ? target[key] : (...args) => {
      for (const arg of args) if (typeof arg === 'string' && arg.startsWith('rgba')) colours.push(arg);
      return undefined;
    }),
    set: (target, key, value) => {
      if ((key === 'fillStyle' || key === 'strokeStyle') && typeof value === 'string') colours.push(value);
      target[key] = value;
      return true;
    },
  });
  assert.equal(drawCompanion(ctx, dog, { pose: 'idle' }), true, 'the companion draws');
  // Luminance of an rgba string, so "bright enough to find on dark ground" is a
  // number rather than an opinion.
  const luminance = (colour) => {
    const [r, g, b] = colour.match(/[\d.]+/g).slice(0, 3).map(Number);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  };
  const brightest = Math.max(...colours.map(luminance));
  assert(brightest >= 0.6, `the companion carries a bright mark (brightest ${brightest.toFixed(2)})`);
  const hasHalo = colours.some((colour) => colour.includes('233,217,160'));
  assert.equal(hasHalo, true, 'and a soft halo, so it reads as a presence before it reads as a dog');
  log('the companion is findable ok');
}

// Animation must stay beside the dog's position even after a long session.
{
  const { drawCompanion } = await import('../src/render/forms-sprites.js');
  const originalNow = performance.now;
  try {
    for (const mode of ['following', 'waiting']) {
      for (const elapsed of [0, 1000, 60000, 3600000]) {
        performance.now = () => elapsed;
        const headPositions = [];
        const ctx = new Proxy({}, {
          get: (target, key) => key === 'arc'
            ? (x, y, radius) => { if (radius === 5) headPositions.push(y); }
            : () => {},
        });
        drawCompanion(ctx, { active: true, x: 100, y: 200, face: 1, mode },
          { pose: mode === 'waiting' ? 'rest' : 'idle' });
        assert.equal(headPositions.length, 1, 'the dog has one head');
        assert(Math.abs(headPositions[0] - 185) <= 1.2,
          `the head stays attached after ${elapsed}ms while ${mode}`);
      }
    }
  } finally {
    performance.now = originalNow;
  }
  log('long-session animation stays attached ok');
}

console.error('COMPANION TEST OK — a dog that follows at a distance, refuses the water, is never stuck, and remembers being called');
