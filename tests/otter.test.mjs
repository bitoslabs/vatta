import assert from 'node:assert/strict';

/*
 * The otter's current (docs/animal-lives-story.md reserve table, "นาก — ว่ายน้ำและ
 * ช่วยจับของลอย · การเล่นร่วมกับการดูแลกัน").
 *
 * The first objects in the game that move on their own: driftwood riding the
 * river. The current always runs one way and the pieces loop, so nothing is lost
 * and no one can be too late — the tide only changes the pace. What the otter
 * decides at the holt then becomes a *place* in later lives: a tended river runs
 * clear, and a pile beside a river ends up in the river, jamming the channel the
 * crab has to cross.
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
const { RIVER, OTTER, routeLength } = await import('../src/world/world-data.js');
const {
  assembleRooms, assembleTide, assembleSnags, validateCrabRoute, blockedAt,
} = await import('../src/world/rooms.js');
const { goalFor, updateLifeGoal } = await import('../src/systems/goals.js');
const { initDynamicWorld, worldSnags } = await import('../src/systems/worldgen.js');
const { getKarma, resetKarma } = await import('../src/systems/karma.js');
const { readSave, applySaveRuntime } = await import('../src/systems/save.js');
const { hasEffect, worldEffects } = await import('../src/systems/world-effects.js');
const tide = await import('../src/systems/tide.js');
const drift = await import('../src/systems/drift.js');
const { planNextLife, candidatesFor } = await import('../src/systems/life-route.js');
const { loadChapter } = await import('../src/game/chapters.js');
const { player } = await import('../src/entities/player.js');
const { dist, distToPoly } = await import('../src/core/math.js');
const otter = await import('../src/game/otter.js');

const log = (message) => console.error(`[otter] ${message}`);

// ---- 1. the current carries things, and never loses them ----
tide.resetTide();
drift.resetDrift();
assert.equal(drift.drifterCount(), 3, 'three pieces ride the river');
assert.equal(drift.caughtDrifters(), 0, 'none of them brought in yet');
const riverLength = routeLength(RIVER);
for (const piece of drift.drifterPositions()) {
  assert(distToPoly(RIVER, piece.x, piece.y) < 1, 'every piece is on the river');
  assert.equal(piece.t >= 0 && piece.t < 1, true, 'and at a place along it');
}
const start = drift.drifterPositions()[0];
drift.updateDrift(1);
const moved = drift.drifterPositions()[0];
assert(dist(start.x, start.y, moved.x, moved.y) > 40, 'the river moves them');
assert(riverLength > 2000, 'the river is long enough to swim');
// the current runs one way and loops, so nothing is ever lost
drift.updateDrift(600);
for (const piece of drift.drifterPositions()) {
  assert.equal(piece.t >= 0 && piece.t < 1, true, 'after a long while they are still on the river');
}
drift.resetDrift();
assert.equal(drift.drifterPositions().length, 3, 'and a new life finds three again');
log('current ok');

// ---- 2. the tide sets the pace, not the direction ----
tide.setTidePhase(0.75); // low water
const lowStart = drift.drifterPositions()[0];
drift.updateDrift(1);
const lowMoved = dist(lowStart.x, lowStart.y, drift.drifterPositions()[0].x, drift.drifterPositions()[0].y);
drift.resetDrift();
tide.setTidePhase(0.25); // high water
const highStart = drift.drifterPositions()[0];
drift.updateDrift(1);
const highMoved = dist(highStart.x, highStart.y, drift.drifterPositions()[0].x, drift.drifterPositions()[0].y);
assert(lowMoved > highMoved * 1.5, `a falling tide hurries them along (${Math.round(lowMoved)} vs ${Math.round(highMoved)} px)`);
drift.resetDrift();
tide.resetTide();
log('tide pace ok');

// ---- 3. catching them, and the holt's question ----
state.lifeMode = true;
state.formId = 'otter';
state.realmId = 'manussa';
resetKarma();
worldEffects();
state.world.effects = {};
state.world.snags = [];
otter.resetOtter();
drift.resetDrift();
state.mode = 'world';
state.interact = null;
initDynamicWorld(2);

assert.equal(isRebirthForm(FORMS.find((f) => f.id === 'otter')), true, 'the otter may be reborn now');
assert.equal(mapsFor('otter').includes('water'), true, 'and it names a map that carries it');
assert.equal(goalFor().kind, 'drift', 'the life begins pointed at the driftwood');
assert.equal(otter.caughtCount(), 0, 'with nothing brought in');

let completions = 0;
on(EVENTS.LIFE_COMPLETE, () => { completions += 1; });
const { initChoices } = await import('../src/ui/choices.js');
initChoices();

// a body that is nowhere near offers nothing
player.x = OTTER.holt.x;
player.y = OTTER.holt.y;
otter.updateOtter();
assert.equal(state.interact, null, 'standing at the holt before the work is done offers nothing');

for (let i = 1; i <= 3; i++) {
  const piece = drift.drifterPositions()[0];
  player.x = piece.x;
  player.y = piece.y;
  state.interact = null;
  otter.updateOtter();
  assert(state.interact && state.interact.labelKey === 'prompt.catchDrift', `piece ${i} can be caught`);
  state.interact.fn();
  assert.equal(otter.caughtCount(), i, `piece ${i} is brought in`);
  assert.equal(readSave().drift.items.filter((item) => item.caught).length, i, `piece ${i} is saved`);
  if (i === 1) {
    const remaining = drift.drifterPositions();
    drift.resetDrift();
    applySaveRuntime(readSave());
    assert.equal(otter.caughtCount(), 1, 'the first caught piece survives a reload');
    assert.deepEqual(drift.drifterPositions(), remaining, 'the remaining wood resumes at its saved positions');
  }
}
assert.equal(drift.allDriftersCaught(), true, 'all three are out of the current');
assert.equal(goalFor().kind, 'holt-guide', 'now the holt is where the question is');

player.x = OTTER.holt.x;
player.y = OTTER.holt.y;
state.interact = null;
otter.updateOtter();
assert(state.interact && state.interact.labelKey === 'prompt.tendRiver', 'the holt asks its question');
assert.equal(completions, 0, 'reaching the holt does not end the life before the answer');
state.interact.fn();
emit(EVENTS.CHOICE_PICK, 0); // tend the river
assert.equal(otter.didTend(), true, 'the otter tended the river');
assert.equal(hasEffect('river-tended'), true, 'and the world records it');
assert.deepEqual(state.world.snags, [], 'with nothing left to float back in');
assert(getKarma().merit > 0, 'tending the water is remembered as giving');
const tendedMerit = getKarma().merit;
assert.deepEqual(readSave().otter, { decided: true, tended: true }, 'tending is saved before the life ends');
otter.resetOtter();
drift.resetDrift();
applySaveRuntime(readSave());
assert.equal(otter.didTend(), true, 'tending survives a reload');
assert.equal(otter.caughtCount(), 3, 'all caught pieces survive a reload');
state.interact = null;
otter.updateOtter();
assert.equal(state.interact, null, 'the holt does not ask again');
assert.equal(getKarma().merit, tendedMerit, 'resuming gives no extra merit');
assert.equal(goalFor().kind, 'holt', 'and only now does the holt end the life');
updateLifeGoal();
assert.equal(completions, 1, 'standing at the holt after deciding completes the life');
log('tending ok');

// ---- 4. a tended river runs clear; a pile beside it does not ----
assert.equal(worldSnags(), 0, 'a tended river carries no driftwood into the next life');
const jammed = assembleRooms(777, 'memory-forest', { snags: 3 });
assert.equal(jammed.filter((f) => f.type === 'snag').length, 3, 'untended driftwood jams the channel');
const cleanProof = validateCrabRoute(assembleRooms(777, 'memory-forest'), {});
const jamProof = validateCrabRoute(jammed, {});
assert.equal(cleanProof.ok, true, 'with a clear channel the crab’s three-way proof holds');
assert.equal(jamProof.ok, false, 'and a jam closes it — even for a swimmer');
assert.equal(jamProof.walkerLowWater, false, 'nobody wades through a jam');
const snag = assembleSnags(1)[0];
assert.equal(blockedAt([snag], snag.x, snag.y, { crossCauseway: true }), true, 'a snag is solid to every body');
assert.equal(blockedAt([snag], snag.x, snag.y, { swimDeep: true }), true, 'swimming does not help');
log('jam ok');

// ---- 5. keeping the wood is also a life, and it changes the next world ----
resetKarma();
state.world.effects = {};
state.world.snags = [];
state.formId = 'otter';
otter.resetOtter();
drift.resetDrift();
state.interact = null;
initDynamicWorld(2);
for (let i = 0; i < 3; i++) {
  const piece = drift.drifterPositions()[0];
  player.x = piece.x;
  player.y = piece.y;
  state.interact = null;
  otter.updateOtter();
  state.interact.fn();
}
player.x = OTTER.holt.x;
player.y = OTTER.holt.y;
state.interact = null;
otter.updateOtter();
state.interact.fn();
emit(EVENTS.CHOICE_PICK, 1); // keep it
assert.equal(otter.didTend(), false, 'this otter piled it up');
assert.equal(hasEffect('river-tended'), false, 'so the river was not tended');
assert.equal(state.world.snags.length, 3, 'and the wood will float back in');
assert.equal(worldSnags(), 3, 'the next life finds the river carrying it');
assert(getKarma().tendencies.clinging > 0, 'the piling is what it leaves in itself');
const piledClinging = getKarma().tendencies.clinging;
assert.deepEqual(readSave().otter, { decided: true, tended: false }, 'piling up wood is saved too');
otter.resetOtter();
drift.resetDrift();
applySaveRuntime(readSave());
assert.equal(otter.hasDecided(), true, 'piling survives a reload');
assert.equal(otter.didTend(), false, 'the restored choice still leaves a pile');
assert.equal(state.world.snags.length, 3, 'the snags survive a reload');
state.interact = null;
otter.updateOtter();
assert.equal(state.interact, null, 'the piling choice is not asked again');
assert.equal(getKarma().tendencies.clinging, piledClinging, 'resuming adds no clinging');
assert.equal(goalFor().kind, 'holt', 'the holt still ends the life — the choice is not a punishment');
log('piling ok');

// ---- 6. a new life arrives with a clear river and three pieces riding it ----
loadChapter(1, { autosave: false });
assert.equal(otter.hasDecided(), false, 'a new chapter (and a new life) starts undecided');
assert.equal(drift.caughtDrifters(), 0, 'with all three pieces back in the current');

// ---- 7. the otter can really swim its errand ----
state.formId = 'otter';
state.lifeMode = true;
state.lifeId = 1;
state.world.effects = {};
state.world.snags = [];
initDynamicWorld(1);
const features = state.dynamic.features;
const step = 18;
const cols = Math.ceil((await import('../src/core/constants.js')).WORLD.w / step);
const rows = Math.ceil((await import('../src/core/constants.js')).WORLD.h / step);
const index = (c, r) => r * cols + c;
const blocked = new Uint8Array(cols * rows);
const abilities = { swimDeep: true };
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    blocked[index(c, r)] = blockedAt(features, c * step + step / 2, r * step + step / 2, abilities) ? 1 : 0;
  }
}
const reaches = (from, to) => {
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
for (const piece of drift.drifterPositions()) {
  assert.equal(reaches(OTTER.holt, { x: piece.x, y: piece.y }), true, 'the otter can swim to every piece');
}
assert.equal(reaches(OTTER.holt, OTTER.holt), true, 'and get home again');
log('errand swimmable ok');

// ---- 8. the otter is offered in the chapter pools ----
assert.equal(candidatesFor(4, ['water', 'land']).includes('otter'), true, 'the otter is offered where a waterside body is carried');
let sawOtter = false;
const chapterIds = Array.from({ length: 14 }, (_, i) => i + 1);
let route = { chapter: 1, lifeId: 1, history: [], chapterIds };
for (let i = 0; i < 600; i++) {
  const next = planNextLife(route);
  if (next.formId === 'otter') sawOtter = true;
  route = { ...next, history: [...route.history, next.formId], chapterIds };
}
assert.equal(sawOtter, true, 'the otter is born during a long journey');
log('rebirth ok');

console.error('OTTER TEST OK — a current that carries things, a tide that sets its pace, and driftwood that jams the next life only if nobody tended the water');
