import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function target() {
  const listeners = new Map();
  const classes = new Set(['hidden']);
  const attributes = new Map();
  return {
    style: {},
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
      toggle: (name, force) => (force ? classes.add(name) : classes.delete(name)),
    },
    addEventListener(name, fn) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(fn);
    },
    setPointerCapture(id) { this.captured = id; },
    setAttribute(name, value) { attributes.set(name, value); },
    getAttribute(name) { return attributes.get(name); },
    dispatch(name, pointerId, x = 0, y = 0) {
      const event = { pointerId, clientX: x, clientY: y, preventDefault() {} };
      for (const fn of listeners.get(name) || []) fn(event);
    },
  };
}

const elements = new Map(['touchUI', 'joyZone', 'joyBase', 'joyKnob', 'btnRun', 'btnSati', 'btnAct', 'btnEcho', 'btnMenu', 'breathBtn', 'disturbCard']
  .map((id) => [id, target()]));
globalThis.window = target();
window.matchMedia = () => ({ matches: true });
globalThis.document = target();
document.querySelector = (selector) => elements.get(selector.slice(1));
document.hidden = false;

const { input } = await import('../src/systems/input.js');
const { on, EVENTS } = await import('../src/core/events.js');
const { setForm } = await import('../src/systems/forms.js');
const { initTouchControls } = await import('../src/ui/touch.js');
let mindDown = 0;
let mindUp = 0;
let actions = 0;
let dismisses = 0;
let helps = 0;
let echoes = 0;
on(EVENTS.SPACE_DOWN, () => mindDown++);
on(EVENTS.SPACE_UP, () => mindUp++);
on(EVENTS.ACTION, () => actions++);
on(EVENTS.DISMISS, () => dismisses++);
on(EVENTS.HELP_KEY, () => helps++);
on(EVENTS.ECHO_PULSE, () => echoes++);
initTouchControls();

const ui = elements.get('touchUI');
const zone = elements.get('joyZone');
const run = elements.get('btnRun');
const sati = elements.get('btnSati');
const act = elements.get('btnAct');
assert.equal(ui.classList.contains('hidden'), false, 'coarse pointer exposes touch controls');

zone.dispatch('pointerdown', 1, 60, 650);
assert.equal(zone.captured, 1, 'joystick captures the first finger');
window.dispatch('pointermove', 1, 80, 650);
assert(input.joy.dx > 0.99 && Math.abs(input.joy.dy) < 0.01,
  'a normal 20px thumb movement walks at full keyboard speed');
assert.equal(elements.get('joyBase').style.left, '12px', 'the floating ring uses viewport coordinates');
zone.dispatch('pointerdown', 9, 70, 650);
assert.equal(input.joy.id, 1, 'a second finger does not steal the joystick');
window.dispatch('pointercancel', 1);
assert.equal(input.joy.dx, 0, 'a cancelled gesture stops walking');
assert.equal(input.joy.id, null, 'a cancelled gesture frees the joystick');

run.dispatch('pointerdown', 2);
assert.equal(input.run, true, 'run starts on press');
assert.equal(run.getAttribute('aria-pressed'), 'true', 'run exposes pressed state');
run.dispatch('pointerleave', 2);
assert.equal(input.run, true, 'a small thumb drift does not stop running');
window.dispatch('pointerup', 9);
assert.equal(input.run, true, 'another finger cannot release run');
window.dispatch('pointerup', 2);
assert.equal(input.run, false, 'releasing the running finger stops it');
assert.equal(run.getAttribute('aria-pressed'), 'false', 'run clears pressed state');

sati.dispatch('pointerdown', 3);
assert.equal(input.sati, true, 'mindfulness starts on press');
assert.equal(mindDown, 1, 'mindfulness sends the hold event');
window.dispatch('blur');
assert.equal(input.sati, false, 'losing focus releases mindfulness');
assert.equal(mindUp, 1, 'release event is balanced');
act.dispatch('click');
assert.equal(actions, 1, 'the action button emits the same action as the keyboard');

const echo = elements.get('btnEcho');
assert.equal(echo.classList.contains('hidden'), true, 'echo is hidden without the ability');
setForm('bat');
assert.equal(echo.classList.contains('hidden'), false, 'echo appears for the bat');
echo.dispatch('click');
assert.equal(echoes, 1, 'echo button sends the bat ability event');
setForm('human');
assert.equal(echo.classList.contains('hidden'), true, 'echo hides for a body without the ability');

zone.dispatch('pointerdown', 6, 60, 650);
run.dispatch('pointerdown', 7);
elements.get('btnMenu').dispatch('click');
assert.equal(helps, 1, 'the menu opens the same settings as H');
assert.equal(input.joy.id, null, 'opening the menu releases movement');
assert.equal(input.run, false, 'opening the menu releases running');

const breath = elements.get('breathBtn');
breath.dispatch('pointerdown', 5);
assert.equal(mindDown, 2, 'the meditation button starts a held breath');
breath.dispatch('pointercancel', 5);
assert.equal(mindUp, 2, 'a cancelled breath is released');
elements.get('disturbCard').dispatch('click');
assert.equal(dismisses, 1, 'the meditation disturbance can be dismissed by tapping');

const css = readFileSync('src/styles/touch.css', 'utf8');
assert.match(css, /#joyBase\s*\{\s*position:\s*fixed/, 'the floating ring uses screen coordinates');
assert.match(css, /#joyZone\s*\{[^}]*touch-action:\s*none/s, 'dragging does not pan the browser');
console.error('TOUCH TEST OK — full-speed joystick and balanced multi-touch controls');
