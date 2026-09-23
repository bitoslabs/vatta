'use strict';

import { $ } from './dom.js';

export const fadeEl = $('#fade');
const toastEl = $('#toast');
const toastTitleEl = $('#toastTitle');
const toastSubEl = $('#toastSub');

let toastTimer = null;

/** Fade the screen to black (dir=true) or back in, invoking cb after the transition. */
export function fade(dir, cb) {
  fadeEl.style.opacity = dir ? 1 : 0;
  if (cb) setTimeout(cb, 950);
}

/** Instant fade used by the "looped back" teleport; restores the slow transition. */
export function flashFade() {
  fadeEl.style.transition = 'opacity .22s';
  fadeEl.style.opacity = 1;
}

export function endFlashFade() {
  fadeEl.style.opacity = 0;
  setTimeout(() => { fadeEl.style.transition = 'opacity .9s'; }, 300);
}

export function toast(title, subtitle, ms = 3000) {
  toastTitleEl.textContent = title;
  toastSubEl.textContent = subtitle || '';
  toastEl.style.opacity = 1;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.style.opacity = 0; }, ms);
}
