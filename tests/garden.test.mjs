import assert from 'node:assert/strict';

/*
 * The light garden (design §7, "สวนแสงไม่เที่ยง — สวนบานแล้วโรย ทางแสงมีอายุ ·
 * ปล่อยดอกไม้เก่าเพื่อให้เมล็ดเดินทางต่อ").
 *
 * The garden's gate is a shadow, and the light that lies over it comes and goes on
 * the fastest of the world's three rhythms — so the way in exists and then does
 * not: the light path has an age. Inside, the beds are in flower or already ripe,
 * and the plane's question is whether to let an old bed go: released seeds travel
 * on, into every later world, as flowers along this plane's own road.
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
const { GARDEN, TREES, gardenGate } = await import('../src/world/world-data.js');
const {
  assembleRooms, assembleGardenRooms, assembleReleasedBlooms, validateGardenRoute, blockedAt, validateRoute,
} = await import('../src/world/rooms.js');
const { BIOMES } = await import('../src/content/biomes.js');
const { currentBiomeId } = await import('../src/systems/biome.js');
const { initDynamicWorld, dynamicFeatures, worldAbilities } = await import('../src/systems/worldgen.js');
const { getKarma, resetKarma } = await import('../src/systems/karma.js');
const { hasEffect, WORLD_EFFECTS } = await import('../src/systems/world-effects.js');
const light = await import('../src/systems/light.js');
const { loadChapter } = await import('../src/game/chapters.js');
const { encountersHere, updateEncounters } = await import('../src/game/npc-encounters.js');
const { initChoices } = await import('../src/ui/choices.js');
const { player } = await import('../src/entities/player.js');
const garden = await import('../src/game/garden.js');

const log = (message) => console.error(`[garden] ${message}`);

// ---- 1. the hedge, the shadow, and the light over it ----
const hedge = { i: 0, site: 'garden', type: 'hedge', fixed: true, x: 100, y: 100, r: GARDEN.hedgeRadius };
const shadow = { i: 0, site: 'garden', type: 'shadow', fixed: true, x: 200, y: 200, r: GARDEN.shadowRadius };
const beam = { i: 0, site: 'garden', type: 'beam', fixed: true, x: 200, y: 200, r: GARDEN.beamRadius };
const bed = { i: 0, site: 'garden', type: 'bloombed', fixed: true, ripe: true, x: 300, y: 300, r: GARDEN.bedRadius };
assert.equal(blockedAt([hedge], 100, 100, { small: true, climbing: true, leap: true, lightLit: true }), true,
  'the hedge stops every walker, lit or not');
assert.equal(blockedAt([hedge], 100, 100, { flying: true }), false, 'and only a flying body is above it');
assert.equal(blockedAt([shadow], 200, 200, {}), true, 'the shadow at the gate stops a walker while the light is dim');
assert.equal(blockedAt([shadow], 200, 200, { lightLit: true }), false, 'and lets it through while the light is on it');
assert.equal(blockedAt([beam], 200, 200, {}), false, 'the beam itself is a path, not an obstacle');
assert.equal(blockedAt([bed], 300, 300, {}), false, 'and a bed of flowers is a place, not a wall');
assert.equal(BIOMES['light-garden'].sites.includes('garden'), true, 'the garden belongs to the light plane');
log('the shadow gate ok');

// ---- 2. the garden's light is the fastest of the world's rhythms ----
light.resetLight();
assert.equal(light.lightPhase(), 0.5, 'a life starts at the bright hour');
assert.equal(light.isLit(), true, 'which is lit');
assert.equal(light.lightLevel().toFixed(2), '1.00', 'and at its brightest');
light.setLightPhase(0);
assert.equal(light.isDim(), true, 'the start of the round is as dim as it gets');
assert.equal(light.lightLevel().toFixed(2), '0.00', 'with no light at all');
const turns = [];
on(EVENTS.LIGHT_TURNED, (which) => turns.push(which));
light.resetLight();
for (let i = 0; i < 11; i++) light.updateLight(light.LIGHT_CONSTANTS.period / 11);
assert.deepEqual(turns, ['dim', 'lit'], 'one round announces the dim and the light once each');
assert.equal(light.LIGHT_CONSTANTS.period < 22, true, 'and it is quicker than the ground’s dampness');
log('the light rhythm ok');

// ---- 3. the gate is the light's door, in every seed ----
for (let seed = 1; seed <= 60; seed++) {
  const features = assembleRooms(seed * 7919, 'light-garden');
  const proof = validateGardenRoute(features);
  assert.equal(proof.dimWalker, false, `seed ${seed}: while the light is dim nothing walks into the garden`);
  assert.equal(proof.litWalker, true, `seed ${seed}: and while it is lit a walking body does`);
  assert.equal(proof.ripeBlooms >= 1, true, `seed ${seed}: the garden always has a bed ripe enough to let go`);
  assert.equal(proof.ok, true, `seed ${seed}: the garden is proven`);
  assert.equal(validateRoute(features, 'deer', {}, 'light-garden').ok, true, `seed ${seed}: the plane's road still walks`);
  assert.equal(validateRoute(features, 'dog', { small: true }, 'light-garden').ok, true, `seed ${seed}: for every body`);
}
log('garden proof ok (60 seeds)');

// ---- 4. the room is in the world, and the light is the way in ----
state.formId = 'deva';
assert.equal(currentBiomeId(), 'light-garden', 'a deva body walks the garden');
// An ordinary body born into a rūpa realm walks the garden too: that is the way
// this plane is met in play (systems/biome.js).
state.formId = 'deer';
state.realmId = 'parittabha';
assert.equal(currentBiomeId(), 'light-garden', 'and so does a life born in a rūpa realm');
state.lifeId = 5;
state.lifeMode = true;
state.mode = 'world';
state.world.effects = {};
state.world.released = [];
resetKarma();
garden.resetGarden();
light.resetLight();
initDynamicWorld(2);

const beds = () => dynamicFeatures().filter((f) => f.type === 'bloombed');
const gate = gardenGate();
assert(dynamicFeatures().some((f) => f.type === 'hedge'), 'the hedge ring is built');
assert(dynamicFeatures().some((f) => f.type === 'shadow'), 'with a shadow at the gate');
assert(dynamicFeatures().some((f) => f.type === 'beam'), 'and the beam of light over it');
assert.equal(beds().length, GARDEN.beds.length, 'and every bed is there to start with');
assert.equal(beds().some((b) => b.ripe === true), true, 'with at least one of them ripe');

// The way in follows the light, through the world's own ability merge.
light.setLightPhase(0);
assert.equal(worldAbilities().lightLit, undefined, 'while dim, a body has no way through the shadow');
assert.equal(blockedAt(dynamicFeatures(), gate.x, gate.y, worldAbilities()), true, 'so the gate is shut');
light.setLightPhase(0.5);
assert.equal(worldAbilities().lightLit, true, 'while lit, the light is on the shadow');
assert.equal(blockedAt(dynamicFeatures(), gate.x, gate.y, worldAbilities()), false, 'and the gate is open');
log('the room and the light ok');

// The garden's being stands inside, past the shadow.
const being = encountersHere().find((encounter) => encounter.id === 'garden-bloom');
assert(being, 'the garden being is in this plane');
assert.equal(dist(being.x, being.y, GARDEN.center.x, GARDEN.center.y), 0, 'standing in the garden, past the gate');

// Guiding a visitor is a separate act: it extends the gate's light only later.
initChoices();
player.x = being.x;
player.y = being.y;
state.interact = null;
updateEncounters();
assert.equal(state.interact?.labelKey, 'prompt.talkGardenBloom');
state.interact.fn();
emit(EVENTS.CHOICE_PICK, 1);
assert.equal(hasEffect('visitor-guided'), true);
light.setLightPhase(0.2);
assert.equal(worldAbilities().lightLit, undefined, 'the guiding life still has the ordinary light window');
state.lifeId++;
assert.equal(worldAbilities().lightLit, true, 'a later life inherits a longer light window');
assert.equal(blockedAt(dynamicFeatures(), gate.x, gate.y, worldAbilities()), false,
  'the inherited light opens the actual garden gate');
light.setLightPhase(0);
assert.equal(worldAbilities().lightLit, undefined, 'the gate still goes dark each round');
light.resetLight();

// ---- 5. let an old bed go ----
const ripe = beds().find((b) => b.ripe === true);
player.x = ripe.x;
player.y = ripe.y;
state.interact = null;
garden.updateGarden();
assert(state.interact && state.interact.labelKey === 'prompt.releaseBloom', 'a ripe bed offers to be let go');
state.interact.fn();
assert.equal(garden.hasReleased(), true, 'this life let a bed go');
assert.equal(garden.releasedBeds().length, 1, 'and the world remembers where');
assert.equal(hasEffect('seeds-released'), true, 'and that seeds were released to travel');
assert(getKarma().merit > 0, 'letting go is remembered as letting go');
assert.equal(beds().length, GARDEN.beds.length - 1, 'the released bed is gone from this world');
assert.equal(dynamicFeatures().some((f) => f.type === 'seedfall'), true, 'with a seedfall left where it was');
assert.equal(garden.releaseBloom(ripe), false, 'and a life lets one bed go, not all of them');
log('the release ok');

// ---- 6. the seeds travel on, and the garden keeps them ----
state.world.effects = {};
garden.resetGarden();
const later = assembleGardenRooms(2, { releasedBeds: garden.releasedBeds(), releasedSeeds: true });
assert.equal(later.filter((f) => f.type === 'seedfall').length, 1,
  'a later world shows the seedfall where the bed was released');
assert.equal(later.filter((f) => f.type === 'bloombed').length, GARDEN.beds.length - 1,
  'and does not grow that bed back');
const travelled = assembleReleasedBlooms(2, 'light-garden');
assert(travelled.length > 0, 'and the seeds the bed released are flowers along the plane’s road');
assert.equal(travelled.every((f) => f.site === 'garden' && f.travelled === true), true, 'marked as having travelled');
for (const bloom of travelled) {
  assert(dist(bloom.x, bloom.y, GARDEN.center.x, GARDEN.center.y) > GARDEN.ring,
    'and they grow outside the garden, out along the way');
}
const withSeeds = assembleRooms(2, 'light-garden', {
  releasedBeds: garden.releasedBeds(),
  releasedSeeds: true,
});
assert.equal(withSeeds.filter((f) => f.type === 'bloombed' && f.travelled === true).length, travelled.length,
  'and the world assembles them for a life in this plane');
assert.equal(withSeeds.filter((f) => f.type === 'seedfall').length, 1, 'with the old bed left bare');
log('seeds travel ok');

// ---- 7. a new life arrives at a garden that is still whole ----
loadChapter(1, { autosave: false });
assert.equal(garden.hasReleased(), false, 'a new life has its own garden to let go of');
assert.equal(garden.releasedBeds().length, 1, 'while the beds earlier lives released stay released');
assert.equal(light.lightPhase(), 0.5, 'and the light starts at its known hour');
assert.equal(WORLD_EFFECTS['seeds-released'] !== undefined, true, 'the effect is registered');
log('new life ok');

// ---- 8. the plane keeps its own rooms, and no trunk stands in them ----
const forest = assembleRooms(5, 'memory-forest');
assert.equal(forest.some((f) => f.site === 'garden'), false, 'the forest plane has no garden in it');
assert.equal(assembleRooms(5, 'light-garden').some((f) => f.site === 'asura'), false, 'and the garden has no city stone');
for (const tree of TREES) {
  for (const spot of [GARDEN.center, gate, GARDEN.road, ...GARDEN.beds]) {
    assert(dist(tree.x, tree.y, spot.x, spot.y) > 110, 'no trunk stands on the garden, its gate, its beds or the road it faces');
  }
}
log('ground clear ok');

console.error('GARDEN TEST OK — a shadow only the light opens, beds in flower and ripe, and seeds let go to travel on');

// All six sense-desire heavens use the garden and its route, even in an animal body.
for (const realmId of ['catumaharajika', 'tavatimsa', 'yama', 'tusita', 'nimmanarati', 'paranimmita']) {
  state.formId = 'deer';
  state.realmId = realmId;
  assert.equal(currentBiomeId(), 'light-garden', realmId);
  const features = assembleRooms(7919, currentBiomeId());
  assert.equal(validateRoute(features, 'deer', {}, currentBiomeId()).ok, true, realmId);
}
