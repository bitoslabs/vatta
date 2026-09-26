import assert from 'node:assert/strict';

/*
 * The market alley (design §7, "ตลาดความอยาก — ร้านแตกแขนงเมื่อรับข้อเสนอบ่อย ·
 * ผ่านช่องทางออกด้วยมือที่ว่าง").
 *
 * The last of the planes' room sets, and the one whose whole rule is what the body
 * is carrying: the gate lets through only empty hands, and the curtains across the
 * alley open as the hands get heavier — so the shops branch as the offers
 * accumulate, and the way on is passed with empty hands. A life can always put
 * down what it picked up, so the way is always there; a life that empties its
 * hands *after* filling them is the one the market remembers.
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
const storage = new Map();
globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
globalThis.performance = { now: () => 0 };

const { state } = await import('../src/core/state.js');
const { on, emit, EVENTS } = await import('../src/core/events.js');
const { dist } = await import('../src/core/math.js');
const { MARKET, TREES, marketAxis, marketGate } = await import('../src/world/world-data.js');
const {
  assembleRooms, assembleMarketRooms, validateMarketRoute, blockedAt, validateRoute,
} = await import('../src/world/rooms.js');
const { BIOMES } = await import('../src/content/biomes.js');
const { currentBiomeId } = await import('../src/systems/biome.js');
const { initDynamicWorld, dynamicFeatures, worldAbilities } = await import('../src/systems/worldgen.js');
const { getKarma, resetKarma, recordKarma } = await import('../src/systems/karma.js');
const { hasEffect, WORLD_EFFECTS } = await import('../src/systems/world-effects.js');
const { loadChapter } = await import('../src/game/chapters.js');
const { encountersHere } = await import('../src/game/npc-encounters.js');
const { player } = await import('../src/entities/player.js');
const { initChoices } = await import('../src/ui/choices.js');
const market = await import('../src/game/market.js');
const { snapshot, readSave, applySaveRuntime } = await import('../src/systems/save.js');

const log = (message) => console.error(`[market] ${message}`);

// ---- 1. the gate and the curtains know only what the hands hold ----
const wall = { i: 0, site: 'market', type: 'marketwall', fixed: true, x: 100, y: 100, r: MARKET.wallRadius };
const gate = { i: 0, site: 'market', type: 'narrowgate', fixed: true, x: 200, y: 200, r: MARKET.gateRadius };
const curtain = { i: 0, site: 'market', type: 'curtain', fixed: true, needs: 2, x: 300, y: 300, r: MARKET.curtainRadius };
const gift = { i: 0, site: 'market', type: 'gift', fixed: true, x: 400, y: 400, r: MARKET.giftRadius };
assert.equal(blockedAt([wall], 100, 100, { flying: false }), true, 'the alley wall stops a walker');
assert.equal(blockedAt([wall], 100, 100, { flying: true }), false, 'and only a flying body is above it');
assert.equal(blockedAt([gate], 200, 200, { carryCount: 0 }), false, 'empty hands pass the narrow gate');
assert.equal(blockedAt([gate], 200, 200, { carryCount: 1 }), true, 'and one thing carried does not');
assert.equal(blockedAt([gate], 200, 200, {}), false, 'a body with no hands accounted for passes it');
assert.equal(blockedAt([curtain], 300, 300, { carryCount: 1 }), true, 'a curtain needing two stays shut with one');
assert.equal(blockedAt([curtain], 300, 300, { carryCount: 2 }), false, 'and opens when the hands hold two');
assert.equal(blockedAt([curtain], 300, 300, { carryCount: 3 }), false, 'and stays open beyond that');
assert.equal(blockedAt([gift], 400, 400, {}), false, 'what a stall offers is not an obstacle');
assert.equal(BIOMES['craving-market'].sites.includes('market'), true, 'the alley belongs to the craving plane');
log('the gate and the curtains ok');

// ---- 2. the whole design line, proven in every seed ----
for (let seed = 1; seed <= 60; seed++) {
  const features = assembleRooms(seed * 7919, 'craving-market');
  const proof = validateMarketRoute(features);
  assert.equal(proof.emptyIn, true, `seed ${seed}: empty hands enter the alley`);
  assert.equal(proof.carryIn, false, `seed ${seed}: carrying, they cannot`);
  assert.equal(proof.emptyOut, true, `seed ${seed}: empty hands leave again`);
  assert.equal(proof.carryOut, false, `seed ${seed}: carrying, they cannot`);
  assert.equal(proof.emptyDeep, false, `seed ${seed}: empty-handed, the chambers behind the curtains stay shut`);
  assert.equal(proof.ladenDeep, true, `seed ${seed}: holding three, a walker reaches the deepest chamber`);
  assert.equal(proof.ok, true, `seed ${seed}: the alley is proven`);
  assert.equal(validateRoute(features, 'deer', {}, 'craving-market').ok, true, `seed ${seed}: the plane's road still walks`);
  assert.equal(validateRoute(features, 'dog', { small: true }, 'craving-market').ok, true, `seed ${seed}: for every body`);
}
log('alley proof ok (60 seeds)');

// ---- 3. a life that let go loosens the market for the next one ----
const fresh = assembleMarketRooms({});
const loosed = assembleMarketRooms({ loosed: true });
assert.equal(fresh.filter((f) => f.type === 'curtain').length, MARKET.curtainAt.length, 'a fresh world curtains every branch');
assert.equal(loosed.filter((f) => f.type === 'curtain').length, MARKET.curtainAt.length - 1,
  'and a world where hands were emptied has one curtain fewer');
assert.equal(validateMarketRoute(assembleRooms(2 * 7919, 'craving-market', { loosed: true })).ok, true,
  'the alley is still the alley: the same proof holds with the way loosened');
log('the loosened market ok');

// ---- 4. the room in a life, and its two acts ----
state.formId = 'deer';
state.realmId = 'manussa';
state.lifeId = 9;
state.lifeMode = true;
state.mode = 'world';
state.world.effects = {};
resetKarma();
market.resetMarket();
recordKarma('steal', 4); // a greedy enough life walks the craving plane
assert.equal(currentBiomeId(), 'craving-market', 'a greedy life walks the market');
initDynamicWorld(2);

const gifts = () => dynamicFeatures().filter((f) => f.type === 'gift');
const curtains = () => dynamicFeatures().filter((f) => f.type === 'curtain');
const gatePoint = marketGate();
assert(dynamicFeatures().some((f) => f.type === 'marketwall'), 'the alley walls are built');
assert.equal(curtains().length, MARKET.curtainAt.length, 'with every curtain across it');
assert.equal(gifts().length, MARKET.gifts.length, 'and an offer in every chamber');
assert.equal(market.carriedCount(), 0, 'and a life that starts with empty hands');
assert.equal(worldAbilities().carryCount, 0, 'which the world agrees about');
assert.equal(blockedAt(dynamicFeatures(), gatePoint.x, gatePoint.y, worldAbilities()), false, 'so the gate is open');

// The market's being stands behind the first curtain, where only a laden body goes.
const being = encountersHere().find((encounter) => encounter.id === 'market-stall');
assert(being, 'the market being is in this plane');
{
  const axis = marketAxis();
  const along = (being.x - MARKET.anchor.x) * axis.x + (being.y - MARKET.anchor.y) * axis.y;
  assert(along > 0, 'standing inside the alley, further along it than the street');
}
log('the room ok');

// Take one offer.
const first = gifts()[0];
player.x = first.x;
player.y = first.y;
state.interact = null;
market.updateMarket();
assert(state.interact && state.interact.labelKey === 'prompt.takeOffer', 'a stall offers what it is holding');
state.interact.fn();
assert.equal(market.carriedCount(), 1, 'taking it fills the hands');
assert.equal(market.hasTouched(), true, 'and the life has touched the market');
assert.equal(market.giftTaken(first), true, 'and that stall is taken once, not twice');
assert.equal(readSave().market.carried.length, 1, 'the taken offer is saved immediately');
market.resetMarket();
applySaveRuntime(readSave());
assert.equal(market.carriedCount(), 1, 'the offer remains carried after a reload');
assert.equal(market.giftTaken(first), true, 'the same gift cannot be taken again');
assert(getKarma().demerit > 0, 'which is recorded as holding on');
assert.equal(worldAbilities().carryCount, 1, 'the world knows what the hands hold');
assert.equal(blockedAt(dynamicFeatures(), gatePoint.x, gatePoint.y, worldAbilities()), true, 'so the gate will not let it out');
assert.equal(blockedAt(dynamicFeatures(), curtains()[0].x, curtains()[0].y, worldAbilities()), false,
  'while the first curtain opens to it');
log('taking an offer ok');

// Look at the deeper curtains: two things carried is not enough for the second.
const second = gifts()[1];
player.x = second.x;
player.y = second.y;
state.interact = null;
market.updateMarket();
assert(state.interact && state.interact.labelKey === 'prompt.takeOffer', 'the second stall offers too');
state.interact.fn();
assert.equal(market.carriedCount(), 2, 'and now the hands hold two');
assert.equal(blockedAt(dynamicFeatures(), curtains()[0].x, curtains()[0].y, worldAbilities()), false, 'the first curtain is open');
assert.equal(blockedAt(dynamicFeatures(), curtains()[1].x, curtains()[1].y, worldAbilities()), false, 'and so is the second');
assert.equal(blockedAt(dynamicFeatures(), curtains()[2].x, curtains()[2].y, worldAbilities()), true, 'while the third still needs a heavier hand');

// A carried offer can be shared with the hungry being behind the first curtain.
initChoices();
player.x = being.x;
player.y = being.y;
state.interact = null;
market.updateMarket();
assert.equal(state.interact?.labelKey, 'prompt.shareOffer');
state.interact.fn();
emit(EVENTS.CHOICE_PICK, 1);
assert.equal(market.carriedCount(), 2, 'keeping the offer leaves the choice open for later');
state.interact = null;
market.updateMarket();
state.interact.fn();
emit(EVENTS.CHOICE_PICK, 0);
assert.equal(market.carriedCount(), 1, 'sharing gives away exactly one held offer');
assert.equal(hasEffect('offer-shared'), true, 'the world remembers the sharing');
assert.equal(snapshot().world.effects['offer-shared'], true, 'a mid-life save keeps the shared offer');
assert.equal(blockedAt(dynamicFeatures(), curtains()[1].x, curtains()[1].y, worldAbilities()), true,
  'sharing changes the weight carried in this life');

// Put everything down, away from the stalls.
player.x = gatePoint.x;
player.y = gatePoint.y;
state.interact = null;
market.updateMarket();
assert(state.interact && state.interact.labelKey === 'prompt.putDown', 'anywhere in the market, the hands can be emptied');
state.interact.fn();
assert.equal(market.carriedCount(), 0, 'putting it all down empties them');
assert.equal(readSave().market.carried.length, 0, 'empty hands are saved immediately');
// The passage is noticed on the next frame, standing at the gate with empty hands.
state.interact = null;
market.updateMarket();
assert.equal(worldAbilities().carryCount, 0, 'the world agrees again');
assert.equal(blockedAt(dynamicFeatures(), gatePoint.x, gatePoint.y, worldAbilities()), false, 'so the gate lets it through');
assert.equal(blockedAt(dynamicFeatures(), curtains()[0].x, curtains()[0].y, worldAbilities()), true, 'and the curtains close behind it');
log('putting down ok');

// ---- 5. passing the gate empty-handed is what the market remembers ----
assert.equal(market.hasPassedEmpty(), true, 'a life that took, and then put down, has passed the gate empty-handed');
assert.equal(readSave().market.passed, true, 'the gate passage is saved immediately');
assert.equal(hasEffect('hands-emptied'), true, 'and the world records it');
assert(getKarma().merit > 0, 'empty hands are remembered as keeping the precept, not as loss');
assert.equal(WORLD_EFFECTS['hands-emptied'] !== undefined, true, 'the effect is registered');
log('empty hands ok');

// A life that never touched anything leaves no such trace.
state.world.effects = {};
resetKarma();
market.resetMarket();
initDynamicWorld(2);
player.x = gatePoint.x;
player.y = gatePoint.y;
state.interact = null;
market.updateMarket();
assert.equal(market.hasPassedEmpty(), false, 'walking in and out with empty hands is not the act');
assert.equal(hasEffect('hands-emptied'), false, 'so nothing was left behind');
log('untouched hands ok');

// ---- 6. a new life arrives with its own hands ----
state.world.effects = { 'hands-emptied': true, 'offer-shared': true };
state.lifeId++;
loadChapter(1, { autosave: false });
assert.equal(market.carriedCount(), 0, 'a new life starts empty-handed');
assert.equal(market.hasTouched(), false, 'unpractised at the market');
assert.equal(market.hasPassedEmpty(), false, 'and with its own way to find');
assert.equal(hasEffect('hands-emptied'), true, 'while what earlier lives let go still stands');
state.formId = 'deer';
state.realmId = 'manussa';
recordKarma('steal', 4);
initDynamicWorld(2);
assert.equal(curtains().length, MARKET.curtainAt.length - 2,
  'the later market leaves the first and second curtains open');
log('new life ok');

// ---- 7. the planes stay apart, and no trunk stands in the alley ----
const forest = assembleRooms(5, 'memory-forest');
assert.equal(forest.some((f) => f.site === 'market'), false, 'the forest plane has no alley in it');
assert.equal(assembleRooms(5, 'craving-market').some((f) => f.site === 'garden'), false, 'and the market has no garden');
for (const tree of TREES) {
  for (const spot of [MARKET.anchor, gatePoint]) {
    assert(dist(tree.x, tree.y, spot.x, spot.y) > 110, 'no trunk stands on the street the alley opens off, or in its gate');
  }
}
log('planes stay apart ok');

console.error('MARKET TEST OK — a gate only empty hands pass, shops that branch as the hands fill, and a let-go the market remembers');
