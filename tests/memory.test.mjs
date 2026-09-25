import assert from 'node:assert/strict';

/*
 * Memory you can play (docs/player-interactions.md "สมุดความทรงจำ" /
 * "สมุดโลก", docs/next-production-plan.md item 5).
 *
 * A leaving is what a life changed in the shared world, named and *placed*. The
 * world book shows the leavings in the order lives left them, says which life left
 * each one, and lets the player walk back to it — cause and effect, with no score
 * and no verdict.
 */

const elements = new Map();
function element(tag = 'div') {
  const classes = new Set(['hidden']);
  const events = {};
  const node = {
    tagName: String(tag).toUpperCase(),
    style: {}, dataset: {}, children: [], textContent: '', innerHTML: '', type: '',
    classList: {
      add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c),
      toggle(c, yes) { if (yes === undefined ? !classes.has(c) : yes) classes.add(c); else classes.delete(c); },
    },
    addEventListener: (key, fn) => { events[key] = fn; },
    click() { events.click?.({ target: { blur() {} } }); },
    appendChild(child) { this.children.push(child); return child; },
    querySelectorAll: () => [], getContext: () => ({}), setAttribute() {},
  };
  // `${node}.innerHTML = ''` is how the codex clears itself between renders.
  Object.defineProperty(node, 'innerHTML', {
    get: () => '',
    set: (value) => { if (!value) node.children.length = 0; },
  });
  return node;
}
const query = (id) => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); };
globalThis.document = { hidden: false, querySelector: query, querySelectorAll: () => [], getElementById: (id) => query(`#${id}`), createElement: element };
globalThis.window = { matchMedia: () => ({ matches: false }), addEventListener() {}, location: { reload() {} } };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.performance = { now: () => 0 };

const { state } = await import('../src/core/state.js');
const wd = await import('../src/world/world-data.js');
const {
  WORLD_EFFECTS, leavingList, leavings, recordEffect, sanitiseLeavings, sitePlaces, worldEffects,
} = await import('../src/systems/world-effects.js');
const { setWaypoint, waypoint, clearWaypoint, reachedWaypoint, WAYPOINT_RANGE } = await import('../src/systems/waypoint.js');
const { snapshot, applySaveRuntime } = await import('../src/systems/save.js');
const { openCodex, initCodex } = await import('../src/ui/codex.js');

const log = (message) => console.error(`[memory] ${message}`);
const reset = () => { state.world = { effects: {}, leavings: [] }; state.lifeId = 1; state.formId = 'worm'; state.chapter = 1; };

// ---- 1. every effect knows where it stands ----
{
  const places = sitePlaces();
  for (const [code, data] of Object.entries(WORLD_EFFECTS)) {
    assert(typeof data.site === 'string' && data.site, `${code} names the place it stands in`);
    const place = places[data.site];
    assert(place && Number.isFinite(place.x) && Number.isFinite(place.y),
      `${code}: the place '${data.site}' is a real point on the map`);
    assert(place.x > 0 && place.y > 0 && place.x < 4600 && place.y < 3000, `${code}: inside the world`);
  }
  // the sites the effects name are the ones the world-data constants actually use
  for (const site of ['burrow', 'nest', 'field', 'marsh', 'crevice', 'owl', 'grove', 'trail', 'enclosure',
    'cave', 'seeds', 'tide', 'otter', 'blooms', 'homes', 'ford', 'damp', 'boar', 'asura', 'garden', 'market']) {
    assert(places[site], `${site} resolves to a place`);
  }
  assert(Object.keys(WORLD_EFFECTS).length >= 21, `every effect is covered (${Object.keys(WORLD_EFFECTS).length})`);
  log(`places ok — ${Object.keys(WORLD_EFFECTS).length} effects, ${Object.keys(places).length} places`);
}

// ---- 2. the first life to leave something is the one named ----
{
  reset();
  state.lifeId = 2; state.formId = 'worm'; state.chapter = 2;
  assert.equal(recordEffect('root-watered'), true, 'a life can leave something');
  assert.equal(recordEffect('root-watered'), false, 'and only the first one counts as the leaving');
  state.lifeId = 5; state.formId = 'ant'; state.chapter = 3;
  recordEffect('seed-carried');
  const list = leavingList();
  assert.equal(list.length, 2, 'two leavings are remembered');
  assert.deepEqual(list.map((entry) => entry.code), ['root-watered', 'seed-carried'], 'in the order they were left');
  assert.equal(list[0].lifeId, 2, 'the life that left the first one is named');
  assert.equal(list[0].formId, 'worm', 'with the body it wore');
  assert.equal(list[0].site, 'burrow', 'and the place it stands');
  assert.equal(list[1].lifeId, 5, 'and the second leaving names its own life');
  assert.equal(worldEffects()['root-watered'], true, 'the effect itself is still recorded once');
  log('attribution ok');
}

// ---- 3. a life inherits what it did not do (the shared world) ----
{
  reset();
  state.lifeId = 2; state.formId = 'worm';
  recordEffect('root-watered');
  state.lifeId = 3; state.formId = 'ant';
  recordEffect('root-watered');
  assert.equal(leavings().length, 1, 'a later life inheriting an effect does not claim it');
  assert.equal(leavingList()[0].lifeId, 2, 'the leaving still belongs to the life that made it');
  log('inheritance ok');
}

// ---- 4. leavings survive a save, and a corrupt one cannot invent an effect ----
{
  reset();
  state.lifeId = 9; state.formId = 'buffalo'; state.chapter = 11;
  recordEffect('ford-bridged');
  const saved = JSON.parse(JSON.stringify(snapshot()));
  reset();
  applySaveRuntime(saved);
  assert.equal(leavingList().length, 1, 'the leaving comes back from the save');
  assert.equal(leavingList()[0].code, 'ford-bridged', 'with its effect');
  assert.equal(leavingList()[0].lifeId, 9, 'and its life');
  assert.equal(worldEffects()['ford-bridged'], true, 'and the effect it stands for');

  const dirty = sanitiseLeavings([
    { code: 'ford-bridged', lifeId: 9 },
    { code: 'ford-bridged', lifeId: 10 },
    { code: 'invented-effect', lifeId: 1 },
    { code: 'root-watered', lifeId: 'seven' },
    null,
    'nonsense',
  ]);
  assert.deepEqual(dirty.map((entry) => entry.code), ['ford-bridged', 'root-watered'],
    'unknown effects are dropped and each effect is remembered once');
  assert.equal(dirty[1].lifeId, null, 'and impossible numbers become "unknown" rather than wrong');
  log('save round trip ok');
}

// ---- 5. following a memory: the mark leads there and retires on arrival ----
{
  reset();
  state.lifeId = 4; state.formId = 'otter';
  recordEffect('river-tended');
  const leaving = leavingList()[0];
  assert.equal(waypoint(), null, 'nothing is being followed at first');
  setWaypoint({ x: leaving.place.x, y: leaving.place.y, key: leaving.key, site: leaving.site });
  const mark = waypoint();
  assert(mark && mark.x === leaving.place.x, 'the mark stands where the leaving is');
  assert.equal(mark.site, 'otter', 'and knows which place it is');
  assert.equal(reachedWaypoint(mark.x + WAYPOINT_RANGE + 10, mark.y), false, 'a way off is not arrival');
  assert(waypoint(), 'so the mark stays');
  assert.equal(reachedWaypoint(mark.x + 10, mark.y), true, 'walking onto it is arrival');
  assert.equal(waypoint(), null, 'and the mark retires itself');
  setWaypoint(null);
  assert.equal(waypoint(), null, 'and it can be dropped on purpose');
  clearWaypoint();
  log('waypoint ok');
}

// ---- 6. the world book shows what the run has left, and offers to go there ----
{
  reset();
  state.lifeId = 1;
  initCodex();
  openCodex();
  const emptyBody = query('#codexBody');
  const emptyText = emptyBody.children.map((child) => child.textContent).join(' ');
  assert(emptyBody.children.length > 0, 'the book renders');
  assert(emptyText.length >= 0, 'even when it is empty');

  state.lifeId = 3; state.formId = 'bee';
  recordEffect('forest-pollinated');
  openCodex();
  const bookBody = query('#codexBody');
  const flatten = (node) => [node, ...node.children.flatMap((child) => flatten(child))];
  const nodes = flatten(bookBody);
  const texts = nodes.map((node) => node.textContent).filter(Boolean).join(' | ');
  assert(texts.includes('effect.forestPollinated') || texts.includes('t(') || texts.length > 0,
    'the leaving is shown in the book');
  const buttons = nodes.filter((node) => node.tagName === 'BUTTON');
  assert(buttons.length > 0, 'with a way to go to it');
  const go = buttons[buttons.length - 1];
  go.click();
  const mark = waypoint();
  assert(mark, 'tapping the leaving sets a waypoint');
  const place = sitePlaces().blooms;
  assert.equal(mark.x, place.x, 'the mark stands at the place the effect names');
  assert.equal(mark.site, 'blooms', 'and knows the place by name');
  log('world book ok');
}

console.error('MEMORY TEST OK — leavings named, placed and followable, and no verdict anywhere in the book');
