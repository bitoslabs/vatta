import assert from 'node:assert/strict';

/*
 * The asura city's plaza (design §7, "นครอสุร — หอคอยและสะพานเปลี่ยนเมื่อมีการแย่ง
 * หรือแบ่งทรัพยากร · หยุดสร้างหอแข่งกันแล้วสร้างสะพานร่วม").
 *
 * The city's rooms are its own now: a cut-stone ring whose gate is *broken* — the
 * two rival towers have each eaten the span that lay over it, and what is left is
 * a drop no walker crosses. The question is asked at those stones, and laying them
 * back down as a shared span opens the plaza for every life after this one.
 *
 * The plaza sits off the plane's street, because the city's road must go on being
 * walkable for every body; what the drop seals is the room, not the way.
 */

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
const { dist } = await import('../src/core/math.js');
const { FORMS } = await import('../src/content/forms.js');
const { ASURA, TREES, asuraGate } = await import('../src/world/world-data.js');
const {
  assembleRooms, assembleAsuraRooms, assembleSpans, validateAsuraRoute, blockedAt, validateRoute,
} = await import('../src/world/rooms.js');
const { BIOMES } = await import('../src/content/biomes.js');
const { currentBiomeId } = await import('../src/systems/biome.js');
const { initDynamicWorld, dynamicFeatures } = await import('../src/systems/worldgen.js');
const { getKarma, resetKarma } = await import('../src/systems/karma.js');
const { hasEffect, sanitiseEffects, WORLD_EFFECTS } = await import('../src/systems/world-effects.js');
const { restingPlaceAt, isRestful } = await import('../src/systems/rest.js');
const { loadChapter } = await import('../src/game/chapters.js');
const { encountersHere } = await import('../src/game/npc-encounters.js');
const { player } = await import('../src/entities/player.js');
const city = await import('../src/game/asura-city.js');

const log = (message) => console.error(`[asura] ${message}`);

// ---- 1. cut stone, the broken gate, and the stones laid back ----
const wall = { i: 0, site: 'asura', type: 'citywall', fixed: true, x: 100, y: 100, r: ASURA.wallRadius };
const drop = { i: 0, site: 'asura', type: 'drop', fixed: true, x: 200, y: 200, r: ASURA.dropRadius };
const span = { i: 0, site: 'asura', type: 'span', fixed: true, x: 200, y: 200, r: ASURA.spanRadius };
const shrineSpot = { i: 0, site: 'asura', type: 'shrine', fixed: true, x: 300, y: 300, r: ASURA.shrineRadius };
assert.equal(blockedAt([wall], 100, 100, { small: true, climbing: true, strong: true }), true, 'cut stone stops every walker');
assert.equal(blockedAt([wall], 100, 100, { flying: true }), false, 'and only a flying body is above it');
assert.equal(blockedAt([drop], 200, 200, {}), true, 'the broken gate is a drop no walker crosses');
assert.equal(blockedAt([drop], 200, 200, { leap: true }), false, 'a leaping body clears it');
assert.equal(blockedAt([drop, span], 200, 200, {}), false, 'and stones laid back over it are ground again');
assert.equal(blockedAt([span], 200, 200, {}), false, 'a span alone is not a wall');
assert.equal(blockedAt([shrineSpot], 300, 300, {}), false, 'the shrine is a place, not an obstacle');
assert.equal(BIOMES['asura-city'].sites.includes('asura'), true, 'the plaza belongs to the city plane');
log('the broken gate ok');

// ---- 2. the gate is the city's question, in every seed ----
for (let seed = 1; seed <= 60; seed++) {
  const features = assembleRooms(seed * 7919, 'asura-city');
  const proof = validateAsuraRoute(features);
  assert.equal(proof.walkerBefore, false, `seed ${seed}: nothing walks into the plaza while the gate is broken`);
  assert.equal(proof.walkerAfter, true, `seed ${seed}: and a walking body enters once a span is laid`);
  assert.equal(proof.leaper, true, `seed ${seed}: while a leaping body never needed it`);
  assert.equal(proof.ok, true, `seed ${seed}: the plaza is proven`);
  // The room must not seal the plane's street: an ordinary animal is born into
  // this plane too (a life in the asura realm), and its road has to walk.
  assert.equal(validateRoute(features, 'deer', {}, 'asura-city').ok, true, `seed ${seed}: the city street still walks`);
  assert.equal(validateRoute(features, 'dog', { small: true }, 'asura-city').ok, true, `seed ${seed}: for every body`);
}
log('plaza proof ok (60 seeds)');

// ---- 3. the plane is reachable in play, and only from the asura realm ----
state.formId = 'deer';
state.realmId = 'asurakaya';
assert.equal(currentBiomeId(), 'asura-city', 'a life born among the asuras walks the city');
state.realmId = 'niraya';
assert.equal(currentBiomeId(), 'woeful', 'and the woeful planes still show the woeful map');
state.realmId = 'manussa';
state.formId = 'deva';
assert.equal(currentBiomeId(), 'light-garden', 'a deva body still walks the garden');
state.formId = 'asura';
assert.equal(currentBiomeId(), 'asura-city', 'and an asura body walks the city, who it is born there or not');
state.formId = 'deer';
state.realmId = 'manussa';
assert.equal(currentBiomeId(), 'memory-forest', 'while an ordinary life in the human plane is in the forest');
log('the plane is reachable ok');

// ---- 4. the room is in the world, with the city's being standing inside it ----
state.formId = 'deer';
state.realmId = 'asurakaya';
state.lifeId = 3;
state.lifeMode = true;
state.mode = 'world';
state.world.effects = {};
state.world.spans = [];
resetKarma();
city.resetAsuraCity();
initDynamicWorld(2);

const walls = () => dynamicFeatures().filter((f) => f.type === 'citywall');
const drops = () => dynamicFeatures().filter((f) => f.type === 'drop');
const spansHere = () => dynamicFeatures().filter((f) => f.type === 'span');
const shrineHere = () => dynamicFeatures().find((f) => f.type === 'shrine');
assert(walls().length > 18, 'the plaza ring is built');
assert(drops().length >= 3, 'with a drop at the gate');
assert.equal(spansHere().length, 0, 'and no span at the start of a life');
assert(shrineHere(), 'with the shrine inside');
log('the room is built ok');

// The city's being stands in the plaza, which is behind the broken gate.
const being = encountersHere().find((encounter) => encounter.id === 'asura-bridge');
assert(being, 'the asura of the bridge is in this plane');
assert.equal(dist(being.x, being.y, ASURA.shrine.x, ASURA.shrine.y), 0,
  'standing at the shrine inside the plaza');
assert.equal(dist(ASURA.road.x, ASURA.road.y, ASURA.shrine.x, ASURA.shrine.y) < ASURA.ring + 200, true,
  'and the street is close enough to walk to the gate');
log('the being stands inside ok');

// ---- 5. the question at the stones, and what laying them back down does ----
let completions = 0;
on(EVENTS.LIFE_COMPLETE, () => { completions += 1; });
const { initChoices } = await import('../src/ui/choices.js');
initChoices();

const gate = asuraGate();
player.x = gate.x - 40;
player.y = gate.y - 40;
state.interact = null;
city.updateAsuraCity();
assert(state.interact && state.interact.labelKey === 'prompt.shareStones', 'the stones of the broken gate ask the question');
assert.equal(restingPlaceAt(ASURA.shrine.x, ASURA.shrine.y), null, 'and the shrine is not yet a resting place');

state.interact.fn();
emit(EVENTS.CHOICE_PICK, 0); // lay the stones back down as a shared span
assert.equal(city.didSpan(), true, 'this life laid its stones back down');
assert.equal(city.spans().length, 1, 'and the span is recorded where the world keeps what it inherits');
assert.equal(city.spans()[0].x, gate.x, 'laid exactly at the broken gate');
assert.equal(hasEffect('span-built'), true, 'and the world records it');
assert(getKarma().merit > 0, 'sharing the stones is remembered as giving');
assert.equal(restingPlaceAt(ASURA.shrine.x, ASURA.shrine.y), 'shrine', 'the shrine inside is now a resting place');
assert.equal(isRestful(ASURA.shrine.x, ASURA.shrine.y), true, 'and standing there settles the mind');
log('the span ok');

// A later life walks into the plaza over stones it did not lay.
loadChapter(1, { autosave: false });
assert.equal(city.hasDecided(), false, 'a new life arrives at the gate with its own question');
assert.equal(city.spans().length, 1, 'while the span it inherited is still there');
state.formId = 'deer';
state.realmId = 'asurakaya';
initDynamicWorld(2);
assert.equal(spansHere().length, 1, 'and the world assembles it as ground');
assert.equal(blockedAt(dynamicFeatures(), gate.x, gate.y, {}), false, 'so the gate is open to a walker now');
assert.equal(restingPlaceAt(ASURA.shrine.x, ASURA.shrine.y), 'shrine', 'and the shrine still rests the mind');
log('inherited span ok');

// ---- 6. raising your own tower leaves the gate broken ----
state.world.effects = {};
state.world.spans = [];
resetKarma();
city.resetAsuraCity();
initDynamicWorld(2);
player.x = gate.x - 30;
player.y = gate.y - 30;
state.interact = null;
city.updateAsuraCity();
state.interact.fn();
emit(EVENTS.CHOICE_PICK, 1); // raise my own tower higher
assert.equal(city.didSpan(), false, 'this life raised its own tower instead');
assert.equal(city.spans().length, 0, 'so no span was laid');
assert.equal(hasEffect('span-built'), false, 'and the world keeps no bridge');
assert(getKarma().demerit > 0, 'which is recorded as holding on, not as a crime');
assert.equal(restingPlaceAt(ASURA.shrine.x, ASURA.shrine.y), null, 'and the shrine is not a resting place');
assert.equal(blockedAt(dynamicFeatures(), gate.x, gate.y, {}), true, 'the gate stays a drop');
log('no span ok');

// ---- 7. the city keeps its own features out of the forest ----
const forest = assembleRooms(5, 'memory-forest');
assert.equal(forest.some((f) => f.site === 'asura'), false, 'the forest plane has no city stone in it');
assert.equal(assembleRooms(5, 'asura-city').some((f) => f.site === 'boar'), false, 'and the city has no feeding ground');
assert.equal(FORMS.find((f) => f.id === 'asura').rebirth, true, 'the asura body is still in the game');
assert.equal(WORLD_EFFECTS['span-built'] !== undefined, true, 'the effect is registered');
assert.deepEqual(sanitiseEffects({ 'span-built': true, invented: true }), { 'span-built': true },
  'and a save cannot invent effects');
const built = assembleAsuraRooms({ spans: [{ x: gate.x, y: gate.y }] });
assert.equal(built.filter((f) => f.type === 'span').length, 1, 'a life that laid stones assembles them');
assert.equal(assembleSpans([{ x: 1, y: 2 }])[0].r, ASURA.spanRadius, 'with the span’s own reach');
log('planes stay apart ok');

// ---- 8. no trunk stands on the city's ground ----
for (const tree of TREES) {
  for (const spot of [ASURA.plaza, gate, ASURA.shrine, ASURA.road]) {
    assert(dist(tree.x, tree.y, spot.x, spot.y) > 110, 'no trunk stands on the plaza, the gate, the shrine or the street it faces');
  }
}
log('ground clear ok');

console.error('ASURA TEST OK — a broken gate, a question at the stones, and a shared span the whole city walks over afterwards');
