'use strict';

import { emit, EVENTS } from '../core/events.js';
import { state } from '../core/state.js';
import { MODE } from '../core/constants.js';

/** Live input snapshot — mutated by keyboard, pointer and touch drivers. */
export const input = {
  keys: {},
  joy: { id: null, ox: 0, oy: 0, dx: 0, dy: 0 },
  run: false,
  sati: false,
  coarse: window.matchMedia('(pointer: coarse)').matches,
};

/** True while the player is deliberately holding mindfulness (world scene only). */
export function isMindful() {
  return Boolean(input.keys[' '] || input.sati)
    && state.mode === MODE.WORLD
    && !state.dialogueOpen
    && !state.story.released;
}

const PREVENT_DEFAULT = new Set([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

function onKeyDown(e) {
  if (PREVENT_DEFAULT.has(e.key)) e.preventDefault();
  if (e.repeat) return;

  input.keys[e.key.toLowerCase()] = true;

  if (e.key === ' ') emit(EVENTS.SPACE_DOWN);
  if (e.key === 'e' || e.key === 'E') emit(EVENTS.ACTION);
  if (e.key === 'x' || e.key === 'X') emit(EVENTS.DISMISS);
  if (e.key === 'm' || e.key === 'M') emit(EVENTS.MUTE_TOGGLE);
  if (e.key === 't' || e.key === 'T') emit(EVENTS.TEACHER_KEY);
  if (e.key === ' ' || e.key === 'Enter') emit(EVENTS.DIALOGUE_ADVANCE);

  const n = Number.parseInt(e.key, 10);
  if (n >= 1 && n <= 9) emit(EVENTS.CHOICE_PICK, n - 1);
}

function onKeyUp(e) {
  input.keys[e.key.toLowerCase()] = false;
  if (e.key === ' ') emit(EVENTS.SPACE_UP);
}

export function initInput() {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
}
