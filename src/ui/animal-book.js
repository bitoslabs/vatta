'use strict';

import { on, emit, EVENTS } from '../core/events.js';
import { t } from '../systems/i18n.js';
import { formAbilityKey, formNameKey, mapsFor } from '../content/forms.js';
import { bodyWidth, locomotionKind, poseForBody } from '../systems/forms.js';
import { explorableForms, isExploring, startExplore, stopExplore } from '../systems/explore.js';
import { chooseNextBody, plannedNextLife } from '../systems/life.js';
import { choicePending, pendingTransition } from '../systems/transition.js';
import { drawFormBody } from '../render/forms-sprites.js';
import { $ } from './dom.js';

/**
 * The animal book (docs/rebirth-modes.md, "สำรวจร่าง").
 *
 * A page of bodies, each drawn from the same code art the game uses, with one line
 * of what it can do, one of how it gets about, and one of where it can go. Choosing
 * one either *tries it on* (explore, from the title, which touches no save) or
 * answers a waiting rebirth (explore mode, from the life summary) — the same picker
 * for both, because it is the same question.
 */
const overlay = $('#bookOverlay');
const body = $('#bookBody');
const leaveButton = $('#exploreLeave');

function el(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function render() {
  if (!body) return;
  body.innerHTML = '';
  const rebirth = choicePending() && pendingTransition()?.next.explore === true;
  body.appendChild(el('div', 'codex-group', t(rebirth ? 'book.title.rebirth' : 'book.title.explore')));
  body.appendChild(el('div', 'codex-note', t(rebirth ? 'book.hint.rebirth' : 'book.hint.explore')));

  const grid = el('div', 'book-grid');
  for (const form of explorableForms()) {
    const card = el('button', 'book-card');
    card.type = 'button';
    card.dataset.form = form.id;

    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 72;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      try {
        // Drawn in the pose it is in when it arrives, at its own size.
        drawFormBody(ctx, form.id, 48, 56, { pose: poseForBody({ arriving: false }), face: 1, phase: 0.4, t: 1 });
      } catch { /* art is optional on a card */ }
    }
    card.appendChild(canvas);
    card.appendChild(el('div', 'book-name', t(formNameKey(form.id))));
    card.appendChild(el('div', 'book-line', t(formAbilityKey(form.id))));
    card.appendChild(el('div', 'book-line', `${t('book.gait')} ${t(`gait.${locomotionKind(form)}`)}`));
    card.appendChild(el('div', 'book-line', `${t('book.where')} ${mapsFor(form.id).map((map) => t(`map.${map}`)).join(' · ')}`));
    card.appendChild(el('div', 'book-line', `${t('book.size')} ${bodyWidth(form)}`));

    card.addEventListener('click', (e) => {
      e.target.blur?.();
      if (rebirth) {
        // Answering a waiting rebirth: the body is chosen, and the life goes on.
        if (chooseNextBody(form.id)) {
          closeBook();
          emit(EVENTS.BOOK_PICKED, form.id);
        }
        return;
      }
      if (startExplore({ formId: form.id })) closeBook();
    });
    grid.appendChild(card);
  }
  body.appendChild(grid);
}

export function openBook() {
  if (!overlay) return false;
  // Leaving explore mode is an offer only while exploring: a journey has nothing to
  // leave (the mode never wrote to it).
  if (leaveButton) leaveButton.classList.toggle('hidden', !isExploring());
  render();
  overlay.classList.remove('hidden');
  return true;
}

export function closeBook() {
  if (overlay) overlay.classList.add('hidden');
}

export function isBookOpen() {
  return Boolean(overlay) && !overlay.classList.contains('hidden');
}

export function initAnimalBook() {
  const button = $('#bookBtn');
  if (button) button.addEventListener('click', (e) => { e.target.blur(); openBook(); });
  const close = $('#bookClose');
  if (close) close.addEventListener('click', () => closeBook());
  // Leaving explore mode is a title-screen act: the run's save was never written.
  const leave = $('#exploreLeave');
  if (leave) {
    leave.addEventListener('click', (e) => {
      e.target.blur();
      stopExplore();
      closeBook();
      emit(EVENTS.LOCALE_CHANGED, undefined);
    });
  }
  on(EVENTS.LOCALE_CHANGED, () => { if (isBookOpen()) render(); });
}
