import assert from 'node:assert/strict';

/*
 * The crab's tide (docs/animal-lives-story.md reserve table, "ปู — รักษาที่อยู่
 * ท่ามกลางน้ำขึ้นลง").
 *
 * The game's first world *rhythm*: the river rises and falls on its own, and the
 * channel into the spawning pool opens and closes with it. This suite holds the
 * three things that makes true — the cycle is readable and repeatable, the same
 * place is a door for a swimmer at any hour and for a walker only at low water, and
 * a past life can leave the channel shallow for good.
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
const storage = new Map();
globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
globalThis.performance = { now: () => 0 };

const { state } = await import('../src/core/state.js');
const { on, emit, EVENTS } = await import('../src/core/events.js');
const { FORMS, mapsFor, isRebirthForm } = await import('../src/content/forms.js');
const { TIDE, TREES, routeForPlane } = await import('../src/world/world-data.js');
const {
  assembleRooms, assembleTide, validateCrabRoute, blockedAt, validateRoute,
} = await import('../src/world/rooms.js');
const { BIOMES } = await import('../src/content/biomes.js');
const { goalFor, updateLifeGoal } = await import('../src/systems/goals.js');
const { initDynamicWorld, worldAbilities } = await import('../src/systems/worldgen.js');
const { getKarma, resetKarma } = await import('../src/systems/karma.js');
const { readSave, applySaveRuntime } = await import('../src/systems/save.js');
const { hasEffect, worldEffects } = await import('../src/systems/world-effects.js');
const tide = await import('../src/systems/tide.js');
const { planNextLife, candidatesFor } = await import('../src/systems/life-route.js');
const { loadChapter } = await import('../src/game/chapters.js');
const { player } = await import('../src/entities/player.js');
const { dist, distToPoly } = await import('../src/core/math.js');
const crab = await import('../src/game/crab.js');

const log = (message) => console.error(`[crab] ${message}`);

// ---- 1. the tide is a readable, repeatable cycle ----
tide.resetTide();
assert.equal(tide.tidePhase(), 0.3, 'a life starts at a known hour');
tide.setTidePhase(0.25);
assert.equal(tide.isHighTide(), true, 'a quarter through the cycle is high water');
tide.setTidePhase(0.75);
assert.equal(tide.isLowTide(), true, 'three quarters through is low water');
tide.setTidePhase(0.0);
assert.equal(tide.isHighTide() || tide.isLowTide(), false, 'and the middle is neither');

const turns = [];
on(EVENTS.TIDE_TURNED, (which) => turns.push(which));
tide.resetTide();
for (let i = 0; i < 12; i++) tide.updateTide(tide.TIDE_CONSTANTS.period / 12);
assert.deepEqual(turns, ['low', 'high'], 'one cycle announces low water and high water once each');
assert(Math.abs(tide.tideWaterScale() - 1) < 0.2, 'and the water band stays within a fifth of its width');
log('cycle ok');

// ---- 2. the channel is the tide's door: three bodies, two hours ----
const tideOnly = assembleTide();
assert(tideOnly.some((feature) => feature.type === 'flood'), 'the channel is on the map');
assert(tideOnly.some((feature) => feature.type === 'stone'), 'and it is walled by stone');
const channel = tideOnly.find((feature) => feature.type === 'flood');
assert.equal(blockedAt([channel], channel.x, channel.y, { swimDeep: true }), false, 'a deep swimmer goes through at any hour');
assert.equal(blockedAt([channel], channel.x, channel.y, {}), true, 'a walker is stopped while the water is in');
assert.equal(blockedAt([channel], channel.x, channel.y, { crossCauseway: true }), false, 'and gets through when the water is out');
assert.equal(blockedAt([channel], channel.x, channel.y, { crossCauseway: true, swimDeep: true }), false, 'swimmers are never stopped');

const proof = validateCrabRoute(tideOnly, {});
assert.deepEqual(proof, { ok: true, walkerLowWater: true, walkerHighWater: false, swimmerHighWater: true },
  'the same start and the same place: open to a walker at low water, to a swimmer always');

for (let s = 1; s <= 60; s++) {
  const features = assembleRooms(s * 7919, 'memory-forest');
  const crabProof = validateCrabRoute(features, {});
  assert.equal(crabProof.ok, true, `seed ${s}: the channel is proven among the rest of the map`);
  assert.equal(validateRoute(features, 'human').ok, true, `seed ${s}: the road still walks`);
  assert.equal(validateRoute(features, 'crab').ok, true, `seed ${s}: and the crab's own road`);
}
log('channel proof ok (60 seeds)');

// ---- 3. the world grants the crossing by the hour, and by an old life's work ----
state.formId = 'crab';
state.realmId = 'manussa';
state.world.effects = {};
tide.setTidePhase(0.75);
assert.equal(worldAbilities().crossCauseway, true, 'at low water any body may cross');
tide.setTidePhase(0.25);
assert.equal(worldAbilities().crossCauseway, undefined, 'at high water only a swimmer does');
state.world.effects = { 'channel-kept': true };
assert.equal(worldAbilities().crossCauseway, true, 'and a kept channel is shallow whatever the hour');
state.world.effects = {};
log('crossing granted ok');

// ---- 4. the crab's life: cross, decide, come home ----
resetKarma();
worldEffects();
state.world.effects = {};
crab.resetCrab();
tide.resetTide();
state.lifeMode = true;
state.mode = 'world';
state.interact = null;
initDynamicWorld(2);

assert.equal(isRebirthForm(FORMS.find((f) => f.id === 'crab')), true, 'the crab may be reborn now');
assert.equal(mapsFor('crab').includes('water'), true, 'and it names a map that carries it');
assert.equal(crab.channelKept(), false, 'a new life arrives at a channel the river owns');
assert.equal(goalFor().kind, 'far-pool', 'the life is pointed at the far pool');

let completions = 0;
on(EVENTS.LIFE_COMPLETE, () => { completions += 1; });

player.x = TIDE.farPool.x;
player.y = TIDE.farPool.y;
crab.updateCrab();
assert(state.interact && state.interact.labelKey === 'prompt.keepChannel', 'the far pool asks its question');
assert(completions === 0, 'arriving does not end the life before the answer');
const { initChoices } = await import('../src/ui/choices.js');
initChoices();
state.interact.fn();
emit(EVENTS.CHOICE_PICK, 0); // keep it shallow
assert.equal(crab.didKeep(), true, 'the crab kept the channel shallow');
assert.equal(hasEffect('channel-kept'), true, 'and the world records it');
assert(getKarma().merit > 0, 'keeping a way open is remembered as giving');
assert.equal(goalFor().kind, 'home', 'now home is where the life ends');
const keptMerit = getKarma().merit;
assert.equal(readSave().crab.kept, true, 'keeping the channel is saved before reaching home');
crab.resetCrab();
applySaveRuntime(readSave());
assert.equal(crab.didKeep(), true, 'the choice survives a reload');
assert.equal(goalFor().kind, 'home', 'the resumed crab still goes home');
state.interact = null;
crab.updateCrab();
assert.equal(state.interact, null, 'the resumed choice is not offered again');
assert.equal(getKarma().merit, keptMerit, 'resuming does not award merit twice');
player.x = TIDE.home.x;
player.y = TIDE.home.y;
updateLifeGoal();
assert.equal(completions, 1, 'reaching the home pool completes the life');
assert.equal(crab.settleHome(), true, 'and the world remembers the channel');
log('crossing, deciding and coming home ok');

// ---- 5. the readout reads the water, and only water bodies read it ----
tide.setTidePhase(0.25);
assert.equal(crab.readsTide(), true, 'a crab reads the tide');
assert.equal(crab.tideReadout().key, 'hud.tide.high', 'and says the water is in');
state.formId = 'fish';
assert.equal(crab.readsTide(), true, 'so does a fish');
state.formId = 'human';
assert.equal(crab.readsTide(), false, 'a walker in the forest has no business with it');
state.formId = 'crab';
tide.setTidePhase(0.75);
assert.equal(crab.tideReadout().depth, 'hud.tide.shallow', 'and at low water the channel is shallow');
log('readout ok');

// ---- 6. leaving the water alone is also a life ----
resetKarma();
state.world.effects = {};
state.formId = 'crab';
crab.resetCrab();
state.interact = null;
initDynamicWorld(2);
player.x = TIDE.farPool.x;
player.y = TIDE.farPool.y;
state.interact = null;
crab.updateCrab();
state.interact.fn();
emit(EVENTS.CHOICE_PICK, 1); // leave it deep
assert.equal(crab.didKeep(), false, 'this crab left the channel to the river');
assert.equal(hasEffect('channel-kept'), false, 'so nothing was kept');
assert.equal(getKarma().merit, 0, 'and nothing is recorded as giving');
assert.equal(goalFor().kind, 'home', 'home still ends the life — the choice is not a punishment');
assert.deepEqual(readSave().crab, { reached: true, decided: true, kept: false }, 'leaving the channel is saved too');
crab.resetCrab();
applySaveRuntime(readSave());
assert.equal(crab.hasDecided(), true, 'the declined choice survives a reload');
state.interact = null;
crab.updateCrab();
assert.equal(state.interact, null, 'declining is not offered again after a reload');
log('leaving it ok');

// ---- 7. a new life arrives with the channel as the river left it ----
loadChapter(1, { autosave: false });
assert.equal(crab.hasDecided(), false, 'a new chapter (and a new life) starts undecided');
assert.equal(tide.tidePhase(), 0.3, 'and the water starts at its known hour');

// ---- 8. the errand is walkable for the crab ----
for (const tree of TREES) {
  for (const spot of [TIDE.home, TIDE.farPool]) {
    assert(dist(tree.x, tree.y, spot.x, spot.y) > 110, 'no trunk stands on either pool');
  }
}
state.formId = 'crab';
state.lifeMode = true;
state.lifeId = 1;
state.world.effects = {};
state.world.removed = [];
initDynamicWorld(1);
const features = state.dynamic.features;
const step = 18;
const cols = Math.ceil((await import('../src/core/constants.js')).WORLD.w / step);
const rows = Math.ceil((await import('../src/core/constants.js')).WORLD.h / step);
const index = (c, r) => r * cols + c;
const build = (abilities) => {
  const blocked = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * step + step / 2;
      const y = r * step + step / 2;
      let solid = TREES.some((tree) => dist(x, y, tree.x, tree.y) < tree.r + 13);
      if (!solid) solid = blockedAt(features, x, y, abilities);
      blocked[index(c, r)] = solid ? 1 : 0;
    }
  }
  return blocked;
};
const reaches = (blocked, from, to) => {
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
};
const swimmer = build({ swimDeep: true, small: true });
assert.equal(reaches(swimmer, TIDE.home, TIDE.farPool), true, 'the crab swims to the far pool');
const walkerLow = build({ crossCauseway: true });
assert.equal(reaches(walkerLow, TIDE.home, TIDE.farPool), true, 'and at low water anybody walks it');
const walkerHigh = build({ crossCauseway: false });
assert.equal(reaches(walkerHigh, TIDE.home, TIDE.farPool), false, 'while at high water they cannot');
log('errand walkable ok');

// ---- 9. the crab is offered in the chapter pools ----
assert.equal(candidatesFor(4, ['water', 'land']).includes('crab'), true, 'the crab is offered where a waterside body is carried');
let sawCrab = false;
const chapterIds = Array.from({ length: 14 }, (_, i) => i + 1);
let route = { chapter: 1, lifeId: 1, history: [], chapterIds };
for (let i = 0; i < 500; i++) {
  const next = planNextLife(route);
  if (next.formId === 'crab') sawCrab = true;
  route = { ...next, history: [...route.history, next.formId], chapterIds };
}
assert.equal(sawCrab, true, 'the crab is born during a long journey');
log('rebirth ok');

console.error('CRAB TEST OK — a tide that rises and falls, a channel open to swimmers always and to walkers at low water, and a home kept through it');
