'use strict';

import { t } from '../systems/i18n.js';
import { $ } from './dom.js';

/**
 * One small confirm dialog for the board, used wherever a click would throw
 * something away: starting a new run over a filled save slot, and deleting one.
 *
 * Everything else in the game is safe to press — this is the only place a click
 * costs you something, so it is the only place that asks twice.
 */
const overlay = $('#confirmOverlay');
const titleEl = $('#confirmTitle');
const bodyEl = $('#confirmBody');
const yesButton = $('#confirmYes');
const noButton = $('#confirmNo');

let resolve = null;

function finish(answer) {
  if (!overlay || overlay.classList.contains('hidden')) return;
  overlay.classList.add('hidden');
  const done = resolve;
  resolve = null;
  if (done) done(answer);
}

/** Ask, and resolve true when the player confirms. */
export function askConfirm({ titleKey, bodyKey, confirmKey, cancelKey }) {
  if (!overlay) return Promise.resolve(true);
  titleEl.textContent = t(titleKey);
  bodyEl.textContent = t(bodyKey);
  yesButton.textContent = t(confirmKey);
  noButton.textContent = t(cancelKey);
  overlay.classList.remove('hidden');
  if (yesButton.focus) yesButton.focus();
  return new Promise((done) => { resolve = done; });
}

export function initConfirm() {
  if (!overlay) return;
  yesButton.addEventListener('click', (e) => { e.target.blur(); finish(true); });
  noButton.addEventListener('click', (e) => { e.target.blur(); finish(false); });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) finish(false); });
  window.addEventListener('keydown', (e) => {
    if (overlay.classList.contains('hidden')) return;
    if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
  });
}

/** Is a question waiting for an answer? (The world should not react meanwhile.) */
export function confirmOpen() {
  return Boolean(overlay) && !overlay.classList.contains('hidden');
}
