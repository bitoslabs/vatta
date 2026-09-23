'use strict';

import { state } from '../core/state.js';
import { on, EVENTS } from '../core/events.js';
import { $ } from './dom.js';

const box = $('#choiceBox');

let current = [];
let callback = null;

/** Present a set of choices. `options` is an array of already-localized `{ t }`. */
export function choose(options, cb) {
  current = options;
  callback = cb;
  state.choiceOpen = true;
  box.innerHTML = '';
  box.classList.remove('hidden');

  options.forEach((option, i) => {
    const el = document.createElement('div');
    el.className = 'choice';
    el.innerHTML = `<div class="n">— ${i + 1} —</div><div class="t">${option.t}</div>`;
    el.addEventListener('click', () => pick(i));
    box.appendChild(el);
  });
}

function pick(index) {
  if (!state.choiceOpen) return;
  if (index < 0 || index >= current.length) return;
  state.choiceOpen = false;
  box.classList.add('hidden');
  const cb = callback;
  callback = null;
  if (cb) cb(index);
}

export function initChoices() {
  on(EVENTS.CHOICE_PICK, pick);
}
