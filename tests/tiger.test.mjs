import assert from 'node:assert/strict';

/*
 * The tiger's trail (docs/animal-lives-story.md ch.12, "เงาในพุ่ม").
 *
 * Real tracks, read one after another where the last one ended; a hollow where a
 * rival rests; and the choice to slip away or take it. There is no wall in this
 * life — the door is attention (and, once a tiger has chosen the quiet way, the
 * trust that lets anyone read the trail).
 */

// A minimal DOM so the modules that touch the page can be imported in Node.
const elements = new Map();
function element() {
  const classes = new Set(['hidden']);
  return {
    style: {}, dataset: {}, children: [], textContent: '', innerHTML: '',
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
      toggle(c, on) { if (on === false) classes.delete(c); else classes.add(c); },
    },
    addEventListener() {}, appendChild(child) { this.children.push(child); },
    querySelectorAll: () => [], getContext: () => ({}), setAttribute() {},
  };
}
const query = (id) => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); };
globalThis.document = { hidden: false, querySelector: query, querySelectorAll: () => [], getElementById: (id) => query(`#${id}`), createElement: element };
globalThis.window = { matchMedia: () => ({ matches: false }), addEventListener() {}, location: { reload() {} } };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.performance = { now: () => 0 };

const { state } = await import('../src/core/state.js');
const { on, emit, EVENTS } = await import('../src/core/events.js');
const { PLAYER, WORLD } = await import('../src/core/constants.js');
const { FORMS, mapsFor, isRebirthForm } = await import('../src/content/forms.js');
const { blockedAt } = await import('../src/world/rooms.js');
const { TRAIL, TRAIL_APPROACH, TREES } = await import('../src/world/world-data.js');
const { goalFor, updateLifeGoal } = await import('../src/systems/goals.js');
const { initDynamicWorld } = await import('../src/systems/worldgen.js');
const { isRestful, restingPlaceAt } = await import('../src/systems/rest.js');
const { getKarma, resetKarma } = await import('../src/systems/karma.js');
const { hasEffect, worldEffects } = await import('../src/systems/world-effects.js');
const { planNextLife } = await import('../src/systems/life-route.js');
const { loadChapter } = await import('../src/game/chapters.js');
const { player } = await import('../src/entities/player.js');
const tiger = await import('../src/game/tiger.js');

const log = (message) => console.error(`[tiger] ${message}`);
const tracks = TRAIL.tracks;

// ---- 1. only a body that reads trails can read them ----
state.lifeMode = true;
state.formId = 'tiger';
state.realmId = 'manussa';
state.world.effects = {};
resetKarma();
worldEffects();
state.world.hunted = false;
tiger.resetTiger();
state.mode = 'world';

assert.equal(isRebirthForm(FORMS.find((f) => f.id === 'tiger')), true, 'the tiger may be reborn now');
assert.equal(mapsFor('tiger').includes('land'), true, 'and it names a map that carries it');
assert.equal(tiger.canTrack(), true, 'a tiger reads trails');
state.formId = 'deer';
assert.equal(tiger.canTrack(), false, 'a deer does not — even standing on a track');
state.formId = 'tiger';
assert.equal(tiger.tracksRead(), 0, 'a new life has read nothing');
log('tracking gate ok');

let completions = 0;
on(EVENTS.LIFE_COMPLETE, () => { completions += 1; });

// ---- 2. the trail is read in order, one step at a time ----
assert.equal(goalFor().kind, 'track', 'the life begins pointed at the first track');
assert.equal(goalFor().x, tracks[0].x, 'the first track, in x');
state.formId = 'deer';
player.x = tracks[0].x;
player.y = tracks[0].y;
state.interact = null;
tiger.updateTiger();
assert.equal(state.interact, null, 'a body that does not read trails is offered nothing');
state.formId = 'tiger';

const { initChoices } = await import('../src/ui/choices.js');
initChoices();

// skipping ahead does nothing: the second track is not readable first
player.x = tracks[1].x;
player.y = tracks[1].y;
state.interact = null;
tiger.updateTiger();
assert.equal(state.interact, null, 'a later track cannot be read before the one before it');

for (const [index, track] of tracks.entries()) {
  player.x = track.x;
  player.y = track.y;
  state.interact = null;
  tiger.updateTiger();
  assert(state.interact && state.interact.labelKey === 'prompt.readTrack', `track ${index + 1} is read in its turn`);
  state.interact.fn();
  assert.equal(tiger.tracksRead(), index + 1, `track ${index + 1} of ${tracks.length} is behind us`);
}
assert.equal(goalFor().kind, 'hollow', 'with the trail read, the hollow becomes the guide');
updateLifeGoal();
assert.equal(completions, 0, 'following the trail does not end the life');
log('trail chain ok');

// ---- 3. the hollow: slip away, and trust is built ----
player.x = TRAIL.hollow.x;
player.y = TRAIL.hollow.y;
state.interact = null;
tiger.updateTiger();
assert(state.interact && state.interact.labelKey === 'prompt.faceRival', 'the hollow asks its question');
state.interact.fn();
assert(state.choiceOpen === true, 'the shadow in the thicket asks a question');
emit(EVENTS.CHOICE_PICK, 0); // slip away
assert.equal(tiger.didAvoid(), true, 'the tiger slipped away');
assert.equal(hasEffect('trust-built'), true, 'the world records the trust');
assert.equal(tiger.isHunted(), false, 'and nobody was hunted');
assert(getKarma().merit > 0, 'the quiet way is remembered as giving');
assert(getKarma().akusala === 0, 'and no harm was recorded');
assert.equal(goalFor().kind, 'range', 'now the tiger\'s own range is the ending');
log('avoidance ok');

// ---- 4. trust is felt, and the trail stays readable for everyone ----
assert.equal(isRestful(TRAIL.hollow.x, TRAIL.hollow.y), true, 'the hollow is a resting place now');
assert.equal(restingPlaceAt(TRAIL.hollow.x, TRAIL.hollow.y), 'hollow', 'and it knows it is the hollow');
assert.equal(isRestful(2600, 2000), false, 'open forest is not');
state.formId = 'deer';
assert.equal(tiger.canTrack(), true, 'with trust built, even a deer can read the trail');
state.formId = 'tiger';
state.world.effects = {};
assert.equal(tiger.canTrack(), true, 'a tiger reads trails with or without the trust');
assert.equal(isRestful(TRAIL.hollow.x, TRAIL.hollow.y), false, 'without the trust the hollow is not rest');
state.world.effects = { 'trust-built': true };
log('trust felt ok');

// ---- 5. reaching the range ends the life ----
player.x = TRAIL.range.x;
player.y = TRAIL.range.y;
updateLifeGoal();
assert.equal(completions, 1, 'settling in the range completes the life');
assert.equal(tiger.settleRange(), true, 'and the world remembers the trust');

// ---- 6. taking the shadow is also a life, and a quieter forest ----
resetKarma();
state.world.effects = {};
state.world.hunted = false;
state.mode = 'world';
state.formId = 'tiger';
tiger.resetTiger();
for (const track of tracks) {
  player.x = track.x;
  player.y = track.y;
  state.interact = null;
  tiger.updateTiger();
  state.interact.fn();
}
player.x = TRAIL.hollow.x;
player.y = TRAIL.hollow.y;
state.interact = null;
tiger.updateTiger();
state.interact.fn();
emit(EVENTS.CHOICE_PICK, 1); // go in
assert.equal(tiger.didAvoid(), false, 'this tiger went in');
assert.equal(hasEffect('trust-built'), false, 'so no trust was recorded');
assert(getKarma().akusala > 0, 'and the harm is remembered');
assert.equal(tiger.isHunted(), true, 'the hollow is hunted');
assert.equal(isRestful(TRAIL.hollow.x, TRAIL.hollow.y), false, 'and gives no rest');
assert.equal(tiger.canTrack(), true, 'the tiger still reads its own trail');
assert.equal(goalFor().kind, 'range', 'the range still ends the life — the choice is not a punishment');
log('choice recorded ok');

// ---- 7. a new life arrives with the trail unread ----
loadChapter(1, { autosave: false });
assert.equal(tiger.tracksRead(), 0, 'a new chapter (and a new life) starts with nothing read');
assert.equal(tiger.hasDecided(), false, 'and with the rival unmet');

// ---- 8. the tiger can really walk its trail ----
for (const tree of TREES) {
  for (let i = 0; i < TRAIL_APPROACH.length - 1; i++) {
    const [ax, ay] = TRAIL_APPROACH[i];
    const [bx, by] = TRAIL_APPROACH[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    const tt = Math.max(0, Math.min(1, ((tree.x - ax) * dx + (tree.y - ay) * dy) / (len * len)));
    const distance = Math.hypot(tree.x - (ax + dx * tt), tree.y - (ay + dy * tt));
    assert(distance > tree.r + PLAYER.radius + 12, 'the trail is kept clear of trunks');
  }
}

state.formId = 'tiger';
state.lifeMode = true;
state.lifeId = 1;
state.world.effects = {};
state.world.hunted = false;
initDynamicWorld(1);
const features = state.dynamic.features;
const step = 18;
const cols = Math.ceil(WORLD.w / step);
const rows = Math.ceil(WORLD.h / step);
const index = (c, r) => r * cols + c;
const blocked = new Uint8Array(cols * rows);
const abilities = { stealth: true, tracker: true };
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const x = c * step + step / 2;
    const y = r * step + step / 2;
    let solid = x < 40 || y < 40 || x > WORLD.w - 40 || y > WORLD.h - 40;
    if (!solid) solid = TREES.some((tree) => Math.hypot(x - tree.x, y - tree.y) < tree.r + PLAYER.radius);
    if (!solid) solid = blockedAt(features, x, y, abilities);
    blocked[index(c, r)] = solid ? 1 : 0;
  }
}
function canReach(from, to) {
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
}
for (const target of [...tracks, TRAIL.hollow, TRAIL.range, { x: 1120, y: 1560 }]) {
  assert.equal(canReach(TRAIL.range, target), true, 'the tiger can walk from its range to every part of its nightwork');
}
log('trail walkable ok');

// ---- 9. the whole roster is born ----
const born = new Set();
const chapterIds = Array.from({ length: 14 }, (_, i) => i + 1);
let route = { chapter: 1, lifeId: 1, history: ['human'], chapterIds };
for (let i = 0; i < 600; i++) {
  const next = planNextLife(route);
  born.add(next.formId);
  route = { ...next, history: [...route.history, next.formId], chapterIds };
}
assert.equal(born.has('tiger'), true, 'the tiger is born during a long journey');
assert.equal(FORMS.filter((form) => isRebirthForm(form)).length, 18, 'every body in the roster can now be reborn');
log('rebirth ok');

console.error('TIGER TEST OK — tracks read in order, the fight left unpicked, and the trust that lets anyone follow');
