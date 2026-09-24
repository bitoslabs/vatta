'use strict';

import { state } from '../core/state.js';
import { on, EVENTS } from '../core/events.js';
import { t } from '../systems/i18n.js';
import { formNameKey } from '../content/forms.js';
import {
  GUIDED_LIVES, favouriteForm, getLifeLog, journeyReadiness, recordJourneyComplete,
} from '../systems/life.js';
import { showEndScreen } from './end-screen.js';
import { $ } from './dom.js';

const overlay = $('#mirrorCourt');
const body = $('#mirrorCourtBody');
const epilogue = $('#journeyEnd');
const epilogueBody = $('#journeyEndBody');
const releaseButton = $('#courtRelease');

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
  } else {
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
  }

  // มารกระจก offers to keep the form you loved most, forever.
  body.appendChild(group(t('court.group.mara')));
  body.appendChild(row(t('court.mara.offer', { form: t(formNameKey(favouriteForm())) }), ''));

  // What the final chapter still asks of this journey (§8).
  const readiness = journeyReadiness();
  body.appendChild(group(t('court.group.ready')));
  for (const condition of readiness.conditions) {
    body.appendChild(row(t(`court.ready.${condition.id}`), t(condition.ok ? 'court.yes' : 'court.no')));
  }

  if (!readiness.ready && state.lifeId >= GUIDED_LIVES) {
    body.appendChild(row(
      t('court.guidance'),
      readiness.missing.map((id) => t(`court.ready.${id}`)).join(' · '),
    ));
  }
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

/** The mirror slowly stops reflecting: three closing lines, then the end card. */
function closeTheJourney() {
  recordJourneyComplete();
  overlay.classList.add('hidden');
  if (!epilogue) {
    finish(true);
    return;
  }
  if (epilogueBody) {
    epilogueBody.innerHTML = '';
    for (let i = 1; i <= 3; i++) {
      const line = document.createElement('div');
      line.className = 'ws-q';
      line.textContent = t(`court.end.${i}`);
      epilogueBody.appendChild(line);
    }
  }
  epilogue.classList.remove('hidden');
}

export function initMirrorCourt() {
  const keep = $('#courtKeep');
  if (keep) keep.addEventListener('click', (e) => { e.target.blur(); keepFavouriteForm(); });

  // Releasing the forms is only offered when the journey is genuinely ready.
  if (releaseButton) {
    releaseButton.addEventListener('click', (e) => {
      e.target.blur();
      if (!journeyReadiness().ready) return;
      closeTheJourney();
    });
  }

  const stay = $('#courtStay');
  if (stay) stay.addEventListener('click', () => overlay.classList.add('hidden'));

  const close = $('#courtClose');
  if (close) close.addEventListener('click', () => overlay.classList.add('hidden'));

  const epilogueDone = $('#journeyEndDone');
  if (epilogueDone) {
    epilogueDone.addEventListener('click', (e) => {
      e.target.blur();
      epilogue.classList.add('hidden');
      finish(true);
    });
  }

  on(EVENTS.LOCALE_CHANGED, () => {
    if (!overlay.classList.contains('hidden')) renderMirrorCourt();
  });
}
