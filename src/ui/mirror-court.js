'use strict';

import { state } from '../core/state.js';
import { on, EVENTS } from '../core/events.js';
import { t } from '../systems/i18n.js';
import { formNameKey } from '../content/forms.js';
import { favouriteForm, getLifeLog } from '../systems/life.js';
import { showEndScreen } from './end-screen.js';
import { $ } from './dom.js';

const overlay = $('#mirrorCourt');
const body = $('#mirrorCourtBody');

function row(label, value) {
  const line = document.createElement('div');
  line.className = 'recap-row';
  const left = document.createElement('span');
  left.className = 'recap-label';
  left.textContent = label;
  const right = document.createElement('span');
  right.className = 'recap-value';
  right.textContent = value;
  line.appendChild(left);
  line.appendChild(right);
  return line;
}

function group(title) {
  const heading = document.createElement('div');
  heading.className = 'recap-group';
  heading.textContent = title;
  return heading;
}

/** The small mirror courtyard: every life you lived, reflected back (design §8). */
export function renderMirrorCourt() {
  if (!body) return;
  body.innerHTML = '';

  const lives = getLifeLog();
  body.appendChild(group(t('court.group.lives')));

  if (!lives.length) {
    body.appendChild(row(t('court.empty'), ''));
    return;
  }

  for (const life of lives) {
    const marks = [
      life.helped ? t('court.mark.helped') : '',
      life.held ? t('court.mark.held') : '',
      life.changed ? t('court.mark.changed') : '',
    ].filter(Boolean).join(' · ') || t('court.mark.none');
    body.appendChild(row(
      t('life.number') + ' ' + life.lifeId,
      `${t(formNameKey(life.formId))} — ${marks}`,
    ));
  }

  // มารกระจก offers to keep the form you loved most, forever.
  const favourite = favouriteForm();
  body.appendChild(group(t('court.group.mara')));
  body.appendChild(row(t('court.mara.offer', { form: t(formNameKey(favourite)) }), ''));
}

export function openMirrorCourt() {
  renderMirrorCourt();
  overlay.classList.remove('hidden');
}

function finish(liberated) {
  state.lifeMode = false;
  state.liberated = liberated;
  overlay.classList.add('hidden');
  showEndScreen();
}

/** The māra's bargain: keep the form and power you loved, and stay in the round. */
function keepFavouriteForm() {
  finish(false);
}

export function initMirrorCourt() {
  const release = $('#courtRelease');
  if (release) release.addEventListener('click', (e) => { e.target.blur(); finish(true); });
  const keep = $('#courtKeep');
  if (keep) keep.addEventListener('click', (e) => { e.target.blur(); keepFavouriteForm(); });
  // "Not ready" simply leaves the courtyard open — the choice is not forced.
  const stay = $('#courtStay');
  if (stay) stay.addEventListener('click', () => overlay.classList.add('hidden'));
  const close = $('#courtClose');
  if (close) close.addEventListener('click', () => overlay.classList.add('hidden'));

  on(EVENTS.LOCALE_CHANGED, () => {
    if (!overlay.classList.contains('hidden')) renderMirrorCourt();
  });
}
