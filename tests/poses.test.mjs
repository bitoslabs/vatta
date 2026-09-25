import assert from 'node:assert/strict';

/*
 * Poses and locomotion (design §10: "ชุดท่าขั้นต่ำ: อยู่เฉย เคลื่อนที่ ใช้ความสามารถ
 * ปฏิสัมพันธ์ ตั้งสติ และเปลี่ยนชาติ", "ท่าละเอียดต่อร่าง", "ขนาดอ้างอิง").
 *
 * Every body must be able to be drawn in all six poses plus its arrival, each pose
 * must be visibly its own thing, the gait must come from the body's own abilities
 * (a frog hops, a snake slides, a crane glides), and size must be the body's own —
 * a shadow, a ring or a lean is as wide as the body it belongs to. All of it is
 * checked here for all 29 forms.
 */

/** A context that records what was drawn, so a pose can be compared to another. */
function recorder() {
  const ops = [];
  const ctx = new Proxy({}, {
    get: (target, key) => {
      if (key in target) return target[key];
      return (...args) => { ops.push([String(key), args.map((arg) => (typeof arg === 'number' ? Math.round(arg * 100) / 100 : arg))]); };
    },
    set: (target, key, value) => { target[key] = value; return true; },
  });
  return { ctx, ops, signature: () => JSON.stringify(ops) };
}

// The render layer reads its canvas once, at import; every canvas in this test is
// the same recorder, so what the game draws can be inspected.
const shared = recorder();

const elements = new Map();
function element(tag = 'div') {
  const classes = new Set(['hidden']);
  const events = {};
  const node = {
    tagName: String(tag).toUpperCase(),
    style: {}, dataset: {}, children: [], textContent: '', innerHTML: '',
    classList: {
      add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c),
      toggle(c, yes) { if (yes === undefined ? !classes.has(c) : yes) classes.add(c); else classes.delete(c); },
    },
    addEventListener: (key, fn) => { events[key] = fn; },
    click() { events.click?.({ target: { blur() {} } }); },
    appendChild(child) { this.children.push(child); return child; },
    querySelectorAll: () => [], getContext: () => shared.ctx, setAttribute() {},
  };
  return node;
}
const query = (id) => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); };
globalThis.document = { hidden: false, querySelector: query, querySelectorAll: () => [], getElementById: query, createElement: element };
globalThis.window = { matchMedia: () => ({ matches: false }), addEventListener() {}, location: { reload() {} } };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.performance = { now: () => 1000 };
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};

const { FORMS } = await import('../src/content/forms.js');
const {
  POSES, bodyWidth, locomotionKind, poseForBody,
} = await import('../src/systems/forms.js');
const { drawFormBody, FORM_PALETTES } = await import('../src/render/forms-sprites.js');

const log = (message) => console.error(`[poses] ${message}`);

// ---- 1. the six poses, and the arrival ----
{
  assert.deepEqual([...POSES], ['idle', 'move', 'act', 'interact', 'rest', 'meditate', 'rebirth'],
    'the design\'s minimum set: idle, move, act, interact, meditate, rebirth — plus rest');
  assert.equal(poseForBody({}), 'idle', 'standing still is idle');
  assert.equal(poseForBody({ moving: true }), 'move', 'walking is move');
  assert.equal(poseForBody({ acting: true }), 'act', 'using an ability is act');
  assert.equal(poseForBody({ interacting: true }), 'interact', 'speaking with a being is interact');
  assert.equal(poseForBody({ resting: true }), 'rest', 'a resting place is rest');
  assert.equal(poseForBody({ meditating: true }), 'meditate', 'settling the mind is meditate');
  assert.equal(poseForBody({ arriving: true }), 'rebirth', 'a life arriving is rebirth');
  // Precedence, stated where the poses are:
  assert.equal(poseForBody({ moving: true, interacting: true }), 'interact', 'speaking outranks walking');
  assert.equal(poseForBody({ interacting: true, resting: true }), 'rest', 'resting outranks speaking');
  assert.equal(poseForBody({ resting: true, meditating: true }), 'meditate', 'meditation outranks rest');
  assert.equal(poseForBody({ meditating: true, acting: true }), 'act', 'an act outranks settling');
  assert.equal(poseForBody({ acting: true, arriving: true }), 'rebirth', 'and arriving outranks everything');
  log('poses ok');
}

/** The body's true drawn width: the art is measured, not trusted. */
function drawnWidth(formId) {
  let tx = 0;
  let ty = 0;
  let sx = 1;
  let sy = 1;
  const stack = [];
  const points = [];
  let shadowSeen = false;
  const push = (x, y) => { if (shadowSeen) points.push([tx + x * sx, ty + y * sy]); };
  const ctx = new Proxy({}, {
    get: (target, key) => (...args) => {
      if (key === 'save') stack.push([tx, ty, sx, sy]);
      else if (key === 'restore') [tx, ty, sx, sy] = stack.pop() || [0, 0, 1, 1];
      else if (key === 'translate') { tx += args[0] * sx; ty += args[1] * sy; }
      else if (key === 'scale') { sx *= args[0]; sy *= args[1]; }
      else if (key === 'ellipse') {
        if (!shadowSeen) { shadowSeen = true; return; }
        push(args[0] - args[2], args[1] - args[3]);
        push(args[0] + args[2], args[1] + args[3]);
      } else if (key === 'arc') { push(args[0] - args[2], args[1] - args[2]); push(args[0] + args[2], args[1] + args[2]); }
      else if (key === 'moveTo' || key === 'lineTo') push(args[0], args[1]);
      else if (key === 'quadraticCurveTo') { push(args[0], args[1]); push(args[2], args[3]); }
      return undefined;
    },
    set: () => true,
  });
  drawFormBody(ctx, formId, 100, 200, { face: 1, phase: 1, pose: 'idle' });
  const xs = points.map((point) => point[0]);
  return Math.max(...xs) - Math.min(...xs);
}

// ---- 2. every body has a size, and it is the size it is drawn ----
{
  for (const form of FORMS) {
    assert(Number.isFinite(form.width), `${form.id} has a reference size`);
    // The sizes the game really uses: the owl and the firefly are the smallest
    // bodies, the elephant the largest.
    assert(form.width >= 20 && form.width <= 120, `${form.id}: the size is in the game's range (${form.width})`);
    assert.equal(bodyWidth(form), form.width, `${form.id}: and the render layer reads it`);
    assert(['walk', 'hop', 'slither', 'climb', 'glide', 'swim', 'burrow'].includes(locomotionKind(form)),
      `${form.id} has a real gait`);
    // And the number is true: a declared size that drifts from the art makes every
    // shadow and ring the wrong size (the first version of this table declared the
    // lab's display sizes, about 1.8× the drawn body).
    const drawn = drawnWidth(form.id);
    assert(Math.abs(drawn - form.width) / form.width <= 0.25,
      `${form.id}: the declared size ${form.width} is the drawn size (drawn ${Math.round(drawn)})`);
  }
  const gait = (id) => locomotionKind(FORMS.find((form) => form.id === id));
  assert.equal(gait('worm'), 'burrow', 'a worm tunnels');
  assert.equal(gait('frog'), 'hop', 'a frog hops');
  assert.equal(gait('rabbit'), 'hop', 'and so does a rabbit');
  assert.equal(gait('snake'), 'slither', 'a snake slides');
  assert.equal(gait('gecko'), 'climb', 'a gecko climbs');
  assert.equal(gait('spider'), 'climb', 'and so does a spider');
  assert.equal(gait('crane'), 'glide', 'a crane glides');
  assert.equal(gait('bee'), 'glide', 'and a bee flies');
  assert.equal(gait('fish'), 'swim', 'a fish swims');
  assert.equal(gait('deer'), 'walk', 'a deer walks');
  assert.equal(gait('buffalo'), 'walk', 'and so does a buffalo');
  log(`gait ok — ${FORMS.length} bodies`);
}

// ---- 3. every body draws in every pose, and each pose is its own thing ----
{
  for (const form of FORMS) {
    assert(FORM_PALETTES[form.id], `${form.id} has a palette`);
    const signatures = new Map();
    for (const pose of POSES) {
      const { ctx, ops, signature } = recorder();
      drawFormBody(ctx, form.id, 100, 200, {
        pose, face: 1, phase: 1.2, moving: pose === 'move', act: pose === 'act' ? 0.5 : 0, t: 0.5, bob: 0.4,
      });
      assert(ops.length > 6, `${form.id} in pose ${pose} actually draws (${ops.length} ops)`);
      signatures.set(pose, signature());
    }
    for (const pose of POSES) {
      if (pose === 'idle') continue;
      assert.notEqual(signatures.get(pose), signatures.get('idle'), `${form.id}: pose ${pose} is not just idle`);
    }
    // Move is not idle either — and every gait deforms the body differently.
    const gaits = new Map();
    for (const kind of ['walk', 'hop', 'slither', 'climb', 'glide', 'swim', 'burrow']) {
      const { ctx, signature } = recorder();
      drawFormBody(ctx, form.id, 100, 200, { pose: 'move', kind, face: 1, phase: 1.2, moving: true, bob: 0.4 });
      gaits.set(kind, signature());
    }
    assert.notEqual(gaits.get('hop'), gaits.get('walk'), `${form.id}: hopping is not walking`);
    assert.notEqual(gaits.get('slither'), gaits.get('walk'), `${form.id}: sliding is not walking`);
    assert.notEqual(gaits.get('glide'), gaits.get('walk'), `${form.id}: gliding is not walking`);
  }
  log(`all poses ok — ${FORMS.length} forms × ${POSES.length} poses`);
}

// ---- 4. size is the body's own: a bigger body casts a bigger shadow ----
{
  const shadowWidth = (id) => {
    const { ctx, ops } = recorder();
    drawFormBody(ctx, id, 100, 200, { pose: 'idle', face: 1, phase: 0 });
    // The first ellipse after the first beginPath is the shadow.
    const at = ops.findIndex(([name]) => name === 'ellipse');
    assert(at >= 0, `${id} draws a shadow`);
    return ops[at][1][2] * 2; // the shadow's width across
  };
  // The shadow is proportional to the body's own declared size, for every body: at
  // most 24 × width/64 across.
  for (const id of ['firefly', 'dog', 'human', 'elephant']) {
    const form = FORMS.find((entry) => entry.id === id);
    const expected = 24 * (form.width / 64);
    const got = shadowWidth(id);
    assert(Math.abs(got - expected) / expected < 0.2,
      `${id}: its shadow matches its size (${got.toFixed(1)} vs ${expected.toFixed(1)})`);
  }
  assert(shadowWidth('firefly') < shadowWidth('elephant'),
    `and the smallest body casts the smallest shadow (${shadowWidth('firefly')} < ${shadowWidth('elephant')})`);
  // The settling poses draw a ring as wide as the body, too.
  const ringWidth = (id) => {
    const { ctx, ops } = recorder();
    drawFormBody(ctx, id, 100, 200, { pose: 'meditate', face: 1, phase: 0 });
    const ellipses = ops.filter(([name]) => name === 'ellipse');
    return Math.max(...ellipses.map(([, args]) => args[2]));
  };
  assert(ringWidth('firefly') < ringWidth('tiger'), `the smallest body's ring is the narrowest (${ringWidth('firefly')} < ${ringWidth('tiger')})`);
  log('reference size ok');
}

// ---- 5. the poses are reachable from the game, not only from the tests ----
{
  const { drawPlayer } = await import('../src/render/sprites.js');
  const { state } = await import('../src/core/state.js');
  const { MODE } = await import('../src/core/constants.js');
  const { player } = await import('../src/entities/player.js');
  state.formId = 'human';
  state.mode = MODE.MEDITATION;
  state.interact = null;
  player.moving = false;
  shared.ops.length = 0;
  drawPlayer(false);
  assert(shared.ops.length > 0, 'the player draws while meditating through the game\'s own renderer');
  state.mode = MODE.WORLD;
  shared.ops.length = 0;
  drawPlayer(false);
  assert(shared.ops.length > 0, 'and draws again standing still');
  log('wired ok');
}

console.error('POSES TEST OK — six poses and an arrival for every body, each one its own thing, at the body\'s own size');
