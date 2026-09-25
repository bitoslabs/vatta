import assert from 'node:assert/strict';

/*
 * The spider's web (docs/animal-lives-story.md reserve table, "แมงมุม — ขึงใยเชื่อม
 * จุดยึด · สร้างสะพานให้ตัวเล็กโดยไม่ปิดทางผู้อื่น").
 *
 * The reserve table's clause is unusual: the act must *open* a way for small bodies
 * and must *not close* one for anybody else. So the proof has four parts: a small
 * body cannot cross before and can after; a plain walker is no better off either way;
 * and a leaping body crosses before and after — nothing was taken from it.
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
globalThis.document = { hidden: false, querySelector: query, querySelectorAll: () => [], getElementById: query, createElement: element };
globalThis.window = { matchMedia: () => ({ matches: false }), addEventListener() {}, location: { reload() {} } };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.performance = { now: () => 0 };

const { state } = await import('../src/core/state.js');
const { MODE } = await import('../src/core/constants.js');
const { FORMS, mapsFor, isRebirthForm } = await import('../src/content/forms.js');
const { WEB, TREES } = await import('../src/world/world-data.js');
const { dist } = await import('../src/core/math.js');
const {
  assembleRooms, assembleWebSite, validateSpiderRoute, blockedAt, validateRoute,
} = await import('../src/world/rooms.js');
const { BIOMES } = await import('../src/content/biomes.js');
const { goalFor, updateLifeGoal } = await import('../src/systems/goals.js');
const { initDynamicWorld, dynamicFeatures } = await import('../src/systems/worldgen.js');
const { getKarma, resetKarma } = await import('../src/systems/karma.js');
const { hasEffect, leavingList } = await import('../src/systems/world-effects.js');
const { candidatesFor, planNextLife } = await import('../src/systems/life-route.js');
const { loadChapter } = await import('../src/game/chapters.js');
const { player } = await import('../src/entities/player.js');
const { initChoices } = await import('../src/ui/choices.js');
const spider = await import('../src/game/spider.js');

const log = (message) => console.error(`[spider] ${message}`);

/** Where the thread crosses the ring: the point of the span at the ring's radius. */
function crossingPoint() {
  const { anchorOut: a, anchorIn: b, hollow: c, ring } = WEB;
  for (let i = 0; i <= 400; i++) {
    const t = i / 400;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    if (Math.abs(Math.hypot(x - c.x, y - c.y) - ring) < 3) return { x, y };
  }
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// ---- 1. the fissure, the posts and the thread ----
{
  const bare = assembleWebSite({});
  const fissure = bare.filter((f) => f.type === 'fissure');
  const anchors = bare.filter((f) => f.type === 'anchor');
  assert(fissure.length >= 12, `the fissure rings the hollow (${fissure.length} stones)`);
  assert.equal(anchors.length, 2, 'two posts stand either side of it');
  assert(bare.every((f) => f.fixed === true), 'and it is all fixed ground');
  // A post holds a thread; it must never wall off the thread *or* the way past it.
  assert.equal(blockedAt(bare, WEB.anchorOut.x, WEB.anchorOut.y, { small: true }), false,
    'a post can be walked past');
  assert.equal(blockedAt(bare, fissure[0].x, fissure[0].y, {}), true, 'the fissure stops a walker');
  assert.equal(blockedAt(bare, fissure[0].x, fissure[0].y, { small: true }), true, 'and a small body');
  assert.equal(blockedAt(bare, fissure[0].x, fissure[0].y, { leap: true }), false, 'while a leaper crosses');
  assert.equal(blockedAt(bare, fissure[0].x, fissure[0].y, { flying: true }), false, 'and so does a flyer');
  const threaded = assembleWebSite({ webs: [{ from: 'out' }] });
  const thread = threaded.filter((f) => f.type === 'webline');
  assert(thread.length >= 5, `a spun thread is a line of beads (${thread.length})`);
  assert(thread.every((f) => f.fixed === true), 'and it is part of the ground');
  assert.equal(BIOMES['memory-forest'].sites.includes('web'), true, 'the web belongs to the forest plane');
  log('fissure and posts ok');
}

// ---- 2. the four-part proof, in every seed ----
for (let seed = 1; seed <= 40; seed++) {
  const features = assembleRooms(seed * 7919, 'memory-forest');
  const proof = validateSpiderRoute(features);
  assert.equal(proof.smallBefore, false, `seed ${seed}: a small body cannot cross the fissure`);
  assert.equal(proof.smallAfter, true, `seed ${seed}: and crosses once a thread is spun`);
  assert.equal(proof.spiderAfter, true, `seed ${seed}: as does the spider itself, which climbs`);
  assert.equal(proof.walkerBefore, false, `seed ${seed}: a plain walker is no better off before`);
  assert.equal(proof.walkerAfter, false, `seed ${seed}: and no better off after — the web closed nothing`);
  assert.equal(proof.leapBefore, true, `seed ${seed}: a leaper crossed before`);
  assert.equal(proof.leapAfter, true, `seed ${seed}: and still does — nothing was taken from it`);
  assert.equal(proof.ok, true, `seed ${seed}: the web's clause holds`);
  assert.equal(validateRoute(features, 'human').ok, true, `seed ${seed}: the road still walks`);
}
log('four-part proof ok (40 seeds)');

// ---- 3. the life: tie the thread, then cross on it ----
{
  resetKarma();
  state.world = { effects: {}, leavings: [], webs: [] };
  state.formId = 'spider';
  state.realmId = 'manussa';
  state.lifeId = 12;
  state.lifeMode = true;
  state.mode = MODE.WORLD;
  spider.resetSpider();
  initChoices();
  initDynamicWorld(2);

  assert.equal(isRebirthForm(FORMS.find((form) => form.id === 'spider')), true, 'the spider may be reborn');
  assert.equal(mapsFor('spider').includes('land'), true, 'and names a map that carries it');
  assert.equal(spider.crossesByThread(), true, 'it is a small climbing body, so it walks its own thread');
  assert.equal(goalFor().kind, 'web-post', 'the life is pointed at the posts');
  assert.equal(dynamicFeatures().some((feature) => feature.type === 'webline'), false, 'with no thread spun yet');

  player.x = WEB.anchorOut.x;
  player.y = WEB.anchorOut.y;
  state.interact = null;
  spider.updateSpider();
  assert(state.interact && state.interact.labelKey === 'prompt.spinWeb', 'the posts offer the one act');
  state.interact.fn();
  assert.equal(spider.hasSpun(), true, 'the thread is spun');
  assert.equal(spider.threads().length, 1, 'and recorded where the world keeps what it inherits');
  assert.equal(hasEffect('web-spun'), true, 'and the world records it');
  assert(getKarma().merit > 0, 'helping small bodies is remembered as giving');
  assert.equal(goalFor().kind, 'web-hollow', 'now the hollow beyond is the goal');
  const crossing = crossingPoint();
  assert.equal(blockedAt(dynamicFeatures(), crossing.x, crossing.y, { small: true }), false,
    'and the crossing it made is walkable for a small body');

  let completions = 0;
  const { on, EVENTS } = await import('../src/core/events.js');
  on(EVENTS.LIFE_COMPLETE, () => { completions += 1; });
  player.x = WEB.hollow.x;
  player.y = WEB.hollow.y;
  updateLifeGoal();
  assert.equal(completions, 1, 'and walking into the hollow ends the life');
  assert.equal(spider.settleHollow(), true, 'and the hollow remembers the thread');
  log('the life ok');
}

// ---- 4. a later life finds the thread, and any small body may cross ----
{
  state.world.effects = { 'web-spun': true };
  state.world.webs = [{ from: 'out' }];
  // A small land body: the ant would be in the soil plane, where this site is not.
  state.formId = 'gecko';
  state.lifeId = 13;
  initDynamicWorld(2);
  assert.equal(dynamicFeatures().some((feature) => feature.type === 'webline'), true,
    'a world with the effect assembles the thread');
  const crossing = crossingPoint();
  assert.equal(blockedAt(dynamicFeatures(), crossing.x, crossing.y, { small: true }), false,
    'so a small body that is not a spider crosses by it');
  assert.equal(blockedAt(dynamicFeatures(), crossing.x, crossing.y, {}), true,
    'while a body the fissure always stopped is still stopped — nothing changed for it');
  const leaving = leavingList().find((entry) => entry.code === 'web-spun');
  assert(leaving, 'and the thread is a leaving in the world book');
  assert.equal(leaving.site, 'web', 'placed at the posts');
  assert(leaving.place && Number.isFinite(leaving.place.x), 'with somewhere to walk back to');
  log('cross-life ok');
}

// ---- 5. a new life arrives with the posts bare ----
{
  loadChapter(1, { autosave: false });
  assert.equal(spider.hasSpun(), false, 'a new life has not spun anything yet');
  assert.equal(spider.threads().length >= 1, true, 'while the threads earlier lives spun are still there');
  log('new life ok');
}

// ---- 6. it is offered, it draws, and no trunk stands on its ground ----
{
  assert.equal(candidatesFor(3, ['land']).includes('spider'), true, 'the spider is offered where a small climbing body is carried');
  let sawSpider = false;
  const chapterIds = Array.from({ length: 14 }, (_, i) => i + 1);
  let route = { chapter: 1, lifeId: 1, history: [], chapterIds };
  for (let i = 0; i < 900; i++) {
    const next = planNextLife(route);
    if (next.formId === 'spider') sawSpider = true;
    route = { ...next, history: [...route.history, next.formId], chapterIds };
  }
  assert.equal(sawSpider, true, 'and it is born during a long journey');
  const { FORM_PALETTES, drawFormBody } = await import('../src/render/forms-sprites.js');
  assert(FORM_PALETTES.spider, 'the spider has its own art');
  const calls = [];
  const ctx = new Proxy({}, {
    get: (target, key) => (key in target ? target[key] : (...args) => { calls.push([key, args]); }),
    set: (target, key, value) => { target[key] = value; return true; },
  });
  drawFormBody(ctx, 'spider', 40, 40, { face: 1, phase: 0.4, moving: true, bob: 0.5, act: 0.3 });
  assert(calls.length > 8, `and actually draws (${calls.length} ops)`);
  for (const tree of TREES) {
    for (const spot of [WEB.anchorOut, WEB.anchorIn, WEB.hollow, WEB.near, WEB.road]) {
      assert(dist(tree.x, tree.y, spot.x, spot.y) > 110, 'no trunk stands on the posts, the hollows or the road it faces');
    }
  }
  log('rebirth and art ok');
}

console.error('SPIDER TEST OK — a bridge for small bodies that closes nothing for anyone else');
