import assert from 'node:assert/strict';

/*
 * The buffalo's ford (docs/animal-lives-story.md story table ch.11, "ควาย — ลุยโคลน
 * และลากไม้ · ความร่วมมือและความอดทน").
 *
 * Two systems arrive with it: ground that has its own say on pace (mud, which the
 * buffalo wades at full speed and everyone else wades at half), and — for the first
 * time — a change a life makes to the *shape* of the map. The pasture is ringed by
 * a chasm no walking body crosses; hauling the log over it leaves a bridge that
 * stands in every life after (`ford-bridged`, `state.world.planks`).
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
const { FORD, TREES, fordBridge } = await import('../src/world/world-data.js');
const {
  assembleRooms, assembleFord, assemblePlanks, validateBuffaloRoute, blockedAt, validateRoute,
} = await import('../src/world/rooms.js');
const { BIOMES } = await import('../src/content/biomes.js');
const { goalFor, updateLifeGoal } = await import('../src/systems/goals.js');
const { initDynamicWorld } = await import('../src/systems/worldgen.js');
const { terrainSpeed, mudAt, MUD_SPEED } = await import('../src/systems/terrain.js');
const { getKarma, resetKarma } = await import('../src/systems/karma.js');
const { hasEffect, worldEffects } = await import('../src/systems/world-effects.js');
const { planNextLife, candidatesFor } = await import('../src/systems/life-route.js');
const { loadChapter } = await import('../src/game/chapters.js');
const { player } = await import('../src/entities/player.js');
const { dist } = await import('../src/core/math.js');
const buffalo = await import('../src/game/buffalo.js');

const log = (message) => console.error(`[buffalo] ${message}`);

// ---- 1. the mud has its own say on pace ----
const ford = assembleFord();
const mud = ford.find((feature) => feature.type === 'mud');
assert(mud, 'the mud flat is on the map');
assert.equal(mudAt([mud], mud.x, mud.y), true, 'and it is mud where it lies');
assert.equal(mudAt([mud], mud.x + FORD.mudRadius + 100, mud.y), false, 'and not beyond its edge');
assert.equal(terrainSpeed([mud], mud.x, mud.y, {}), MUD_SPEED, 'a walking body sinks to half pace in it');
assert.equal(terrainSpeed([mud], mud.x, mud.y, { wade: true }), 1, 'the buffalo wades at full pace');
assert.equal(terrainSpeed([mud], mud.x + FORD.mudRadius + 100, mud.y, {}), 1, 'and firm ground costs nothing');
assert.equal(blockedAt([mud], mud.x, mud.y, {}), false, 'mud blocks no one — it only slows');
log('mud ok');

// ---- 2. the chasm is a pending bridge ----
const chasm = ford.filter((feature) => feature.type === 'gully');
assert(chasm.length > 10, 'the chasm rings the pasture');
assert.equal(blockedAt([chasm[0]], chasm[0].x, chasm[0].y, {}), true, 'a walker is stopped by it');
assert.equal(blockedAt([chasm[0]], chasm[0].x, chasm[0].y, { leap: true }), false, 'a leaping body clears it');
const plank = assemblePlanks([fordBridge()])[0];
const underPlank = chasm.reduce((best, stone) => (
  dist(stone.x, stone.y, plank.x, plank.y) < dist(best.x, best.y, plank.x, plank.y) ? stone : best
), chasm[0]);
assert.equal(blockedAt([underPlank, plank], underPlank.x, underPlank.y, {}), false, 'a log laid over it makes ground of the chasm');

for (let s = 1; s <= 60; s++) {
  const features = assembleRooms(s * 7919, 'memory-forest');
  const proof = validateBuffaloRoute(features, {});
  assert.equal(proof.walkerBefore, false, `seed ${s}: the pasture is shut to a walking body`);
  assert.equal(proof.walkerAfter, true, `seed ${s}: and open once the log is dragged across`);
  assert.equal(proof.leaper, true, `seed ${s}: a leaping body never needed the bridge`);
  assert.equal(proof.ok, true, `seed ${s}: the ford is proven`);
  assert.equal(validateRoute(features, 'human').ok, true, `seed ${s}: the road still walks`);
  assert.equal(validateRoute(features, 'buffalo').ok, true, `seed ${s}: and the buffalo's own road`);
}
log('chasm proof ok (60 seeds)');

// ---- 3. hauling the log: the map changes ----
state.lifeMode = true;
state.formId = 'buffalo';
state.realmId = 'manussa';
resetKarma();
worldEffects();
state.world.effects = {};
state.world.planks = [];
buffalo.resetBuffalo();
state.mode = 'world';
state.interact = null;
initDynamicWorld(2);

assert.equal(isRebirthForm(FORMS.find((f) => f.id === 'buffalo')), true, 'the buffalo may be reborn now');
assert.equal(mapsFor('buffalo').includes('water'), true, 'and it names a map that carries it');
assert.equal(buffalo.hasHauled(), false, 'a new life arrives at a log still lying on the near side');
assert.equal(goalFor().kind, 'log', 'the life is pointed at the log');
assert(state.dynamic.features.some((f) => f.type === 'log' && f.site === 'ford'), 'and the log is on the map');

let completions = 0;
on(EVENTS.LIFE_COMPLETE, () => { completions += 1; });

// standing away from it offers nothing
player.x = FORD.mud.x - 160;
player.y = FORD.mud.y - 60;
buffalo.updateBuffalo();
assert.equal(state.interact, null, 'the far side of the mud asks nothing of the buffalo');

player.x = FORD.log.x;
player.y = FORD.log.y;
state.interact = null;
buffalo.updateBuffalo();
assert(state.interact && state.interact.labelKey === 'prompt.haulLog', 'the log offers itself to strength');
state.interact.fn();
assert.equal(buffalo.hasHauled(), true, 'the log is hauled');
assert.equal(hasEffect('ford-bridged'), true, 'the bridge is recorded in the world');
assert.equal(getKarma().merit > 0, true, 'opening a way for others is remembered as giving');
assert.deepEqual(state.world.planks.length, 1, 'and the bridge is kept where the world keeps what it inherited');
assert(!state.dynamic.features.some((f) => f.type === 'log' && f.site === 'ford'), 'the log is no longer on the near side');
// a later build of the same life carries the bridge
initDynamicWorld(2);
assert(state.dynamic.features.some((f) => f.type === 'plank'), 'and a rebuild carries the bridge');
// and a later life finds it already open, because the bridge is part of the map
const rebuilt = validateBuffaloRoute(state.dynamic.features, {});
assert.equal(rebuilt.walkerBefore, true, 'a walker can now reach the pasture in this world');
assert.equal(rebuilt.walkerAfter, true, 'and the bridge is the way in');
log('hauling ok');

// ---- 4. the far pasture asks the doc's question ----
assert.equal(goalFor().kind, 'pasture-guide', 'with the bridge made, the pasture is where the question is');
player.x = FORD.pasture.x;
player.y = FORD.pasture.y;
state.interact = null;
buffalo.updateBuffalo();
assert(state.interact && state.interact.labelKey === 'prompt.fetchHerd', 'the pasture asks about the herd');
assert.equal(completions, 0, 'and arriving does not end the life before the answer');
const { initChoices } = await import('../src/ui/choices.js');
initChoices();
state.interact.fn();
emit(EVENTS.CHOICE_PICK, 0); // go back for the herd
assert.equal(buffalo.didFetchHerd(), true, 'the buffalo went back for the herd');
assert(getKarma().tendencies.metta > 0, 'and coming back for others is remembered as metta');
assert.equal(goalFor().kind, 'pasture', 'and only now does the pasture end the life');
updateLifeGoal();
assert.equal(completions, 1, 'the far pasture completes the life');
assert.equal(buffalo.settlePasture(), true, 'and the world remembers the bridge');
log('pasture ok');

// ---- 5. staying is also a life, and the bridge still stands ----
resetKarma();
state.world.effects = {};
state.world.planks = [];
state.formId = 'buffalo';
buffalo.resetBuffalo();
state.interact = null;
initDynamicWorld(2);
player.x = FORD.log.x;
player.y = FORD.log.y;
state.interact = null;
buffalo.updateBuffalo();
state.interact.fn();
player.x = FORD.pasture.x;
player.y = FORD.pasture.y;
state.interact = null;
buffalo.updateBuffalo();
state.interact.fn();
emit(EVENTS.CHOICE_PICK, 1); // stay and eat
assert.equal(buffalo.didFetchHerd(), false, 'this buffalo stayed with the grass');
assert(getKarma().tendencies.clinging > 0, 'the staying is what it leaves in itself');
assert.equal(hasEffect('ford-bridged'), true, 'the bridge stands either way — it was built');
assert.equal(goalFor().kind, 'pasture', 'and the pasture still ends the life');
log('staying ok');

// ---- 6. a new life arrives at a log on the near side again ----
loadChapter(1, { autosave: false });
assert.equal(buffalo.hasHauled(), false, 'a new chapter (and a new life) starts with the log unmoved');
assert.equal(buffalo.hasDecided(), false, 'and the pasture undecided');

// ---- 7. the buffalo can really walk its errand ----
for (const tree of TREES) {
  for (const spot of [FORD.mud, FORD.log, FORD.pasture, fordBridge()]) {
    assert(dist(tree.x, tree.y, spot.x, spot.y) > 120, 'no trunk stands in the ford');
  }
}
state.formId = 'buffalo';
state.lifeMode = true;
state.lifeId = 1;
state.world.effects = {};
state.world.removed = [];
state.world.planks = [{ ...fordBridge() }];
initDynamicWorld(1);
const features = state.dynamic.features;
const step = 18;
const cols = Math.ceil((await import('../src/core/constants.js')).WORLD.w / step);
const rows = Math.ceil((await import('../src/core/constants.js')).WORLD.h / step);
const index = (c, r) => r * cols + c;
const blocked = new Uint8Array(cols * rows);
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const x = c * step + step / 2;
    const y = r * step + step / 2;
    let solid = TREES.some((tree) => dist(x, y, tree.x, tree.y) < tree.r + 13);
    if (!solid) solid = blockedAt(features, x, y, { wade: true });
    blocked[index(c, r)] = solid ? 1 : 0;
  }
}
// "into that place", not "stand exactly on that point": the coarse grid can put a
// cell centre a few pixels off the target, so any free cell near it counts — the
// same tolerance world/rooms.js#reachableBetween uses for a place.
const reaches = (from, to) => {
  const seen = new Uint8Array(cols * rows);
  const start = { c: Math.floor(from.x / step), r: Math.floor(from.y / step) };
  const goal = { c: Math.floor(to.x / step), r: Math.floor(to.y / step) };
  const nearGoal = (cell) => Math.abs(cell.c - goal.c) <= 2 && Math.abs(cell.r - goal.r) <= 2;
  const queue = [start];
  seen[index(start.c, start.r)] = 1;
  while (queue.length) {
    const cell = queue.shift();
    if (nearGoal(cell)) return true;
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
// from the far side of the mud to the crossing, and on into the pasture:
// the log itself is solid scenery, so the way runs beside it (tested by the
// prompt above) and over the bridge a life left here.
const nearSide = { x: FORD.mud.x - 160, y: FORD.mud.y };
assert.equal(reaches(nearSide, fordBridge()), true, 'the buffalo walks the mud to its own crossing');
assert.equal(reaches(nearSide, FORD.pasture), true, 'and crosses the bridge into the pasture');
log('errand walkable ok');

// ---- 8. the buffalo is offered in the chapter pools ----
assert.equal(candidatesFor(2, ['land', 'water']).includes('buffalo'), true, 'the buffalo is offered where a heavy body is carried');
let sawBuffalo = false;
const chapterIds = Array.from({ length: 14 }, (_, i) => i + 1);
let route = { chapter: 1, lifeId: 1, history: [], chapterIds };
for (let i = 0; i < 800; i++) {
  const next = planNextLife(route);
  if (next.formId === 'buffalo') sawBuffalo = true;
  route = { ...next, history: [...route.history, next.formId], chapterIds };
}
assert.equal(sawBuffalo, true, 'the buffalo is born during a long journey');
log('rebirth ok');

console.error('BUFFALO TEST OK — ground with its own pace, a chasm only a life could bridge, and a bridge that stands for everyone after');
