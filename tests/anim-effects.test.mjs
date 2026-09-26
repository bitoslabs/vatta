import assert from 'node:assert/strict';

/*
 * Per-form signature effects (design §10: "เอฟเฟกต์เฉพาะร่างเพิ่ม (ฝุ่นอสุร,
 * พายุครุฑ)"). Each body's own mark is drawn behind it and stays feet-anchored, the
 * moving motes drop out under "ลดการเคลื่อนไหว" while the still part stays, the
 * garuda's storm belongs to the encounter, and everything is deterministic from the
 * body's phase (nothing reads the wall clock inside the effect itself).
 */

/** A context that records what was drawn, so two calls can be compared. */
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

// The render layer reads its canvas once, at import, so every canvas in this test
// is the same recorder — that is how the encounter drawing can be inspected.
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
const { drawFormAura } = await import('../src/render/forms-sprites.js');
const { drawEncounter } = await import('../src/render/sprites.js');

const log = (message) => console.error(`[anim-effects] ${message}`);
const calls = (name) => (ops) => ops.filter(([key]) => key === name).length;

// ---- 1. every body draws its aura without throwing, and it is deterministic ----
{
  for (const form of FORMS) {
    const first = recorder();
    drawFormAura(first.ctx, form.id, 100, 200, 1.2, { moving: true, acting: true, reduced: false });
    const second = recorder();
    drawFormAura(second.ctx, form.id, 100, 200, 1.2, { moving: true, acting: true, reduced: false });
    assert.equal(first.signature(), second.signature(), `${form.id}: the same phase draws the same mark`);
  }
  log(`aura ok — ${FORMS.length} bodies`);
}

// ---- 2. the named marks are really there, and reduced motion keeps the still part ----
{
  const asuraFull = recorder();
  drawFormAura(asuraFull.ctx, 'asura', 100, 200, 1.2, { moving: true, acting: true, reduced: false });
  const asuraReduced = recorder();
  drawFormAura(asuraReduced.ctx, 'asura', 100, 200, 1.2, { moving: true, acting: true, reduced: true });
  assert(asuraFull.ops.length > asuraReduced.ops.length,
    `asura: the dust motes are extra (${asuraFull.ops.length} > ${asuraReduced.ops.length})`);
  assert(calls('stroke')(asuraReduced.ops) >= 1, 'asura: the gold ring stays in reduced motion');
  assert.equal(calls('arc')(asuraReduced.ops), 1, 'asura reduced: only the ring is drawn');
  assert(calls('arc')(asuraFull.ops) > 1, 'asura full: the dust motes join the ring');

  const devaFull = recorder();
  drawFormAura(devaFull.ctx, 'deva', 100, 200, 1.2, { reduced: false });
  const devaReduced = recorder();
  drawFormAura(devaReduced.ctx, 'deva', 100, 200, 1.2, { reduced: true });
  assert(calls('arc')(devaFull.ops) > calls('arc')(devaReduced.ops),
    'deva: the light motes are extra, the halo stays');

  const firefly = recorder();
  drawFormAura(firefly.ctx, 'firefly', 100, 200, 0.4, { reduced: false });
  assert(calls('arc')(firefly.ops) >= 2, 'firefly: a warm pulse with its own core');

  const human = recorder();
  drawFormAura(human.ctx, 'human', 100, 200, 1.2, { moving: true, acting: true, reduced: false });
  assert.equal(human.ops.length, 0, 'human: no signature mark, so nothing is drawn');
  log('signature marks ok — asura dust, deva motes, firefly pulse');
}

// ---- 3. the garuda's storm belongs to the encounter, not the playable bodies ----
{
  shared.ops.length = 0;
  drawEncounter(100, 200, 'garuda');
  const garuda = { ops: [...shared.ops] };
  shared.ops.length = 0;
  drawEncounter(100, 200, 'keeper');
  const keeper = { ops: [...shared.ops] };
  assert(calls('stroke')(garuda.ops) >= 3, `garuda: gusts circle the wings (${calls('stroke')(garuda.ops)} strokes)`);
  assert(calls('arc')(garuda.ops) > calls('arc')(keeper.ops),
    `garuda: more arcs than a plain keeper (${calls('arc')(garuda.ops)} > ${calls('arc')(keeper.ops)})`);
  // And it is grounded: every gust arc sits at the bird's own body, not the origin.
  const arcs = garuda.ops.filter(([key]) => key === 'arc');
  for (const [, args] of arcs) {
    assert(args[0] > 60 && args[1] > 100, 'garuda: every arc is at the encounter, not the origin');
  }
  log('garuda storm ok');
}

console.error('ANIM EFFECTS TEST OK — per-form signature marks, reduced-motion keeps the still part, garuda gusts');
