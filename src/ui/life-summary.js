'use strict';

import { state } from '../core/state.js';
import { on, EVENTS } from '../core/events.js';
import { initAudio, playBell } from '../systems/audio.js';
import { t } from '../systems/i18n.js';
import { formAbilityKey, formNameKey } from '../content/forms.js';
import { PROTOTYPE_LIVES, advanceLife, isPrototypeComplete, recordLife, startLifeMode, summariseLife } from '../systems/life.js';
import { openMirrorCourt } from './mirror-court.js';
import { $ } from './dom.js';

const overlay = $('#lifeSummary');
const body = $('#lifeSummaryBody');
const rebornButton = $('#lifeReborn');

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

/** The short end-of-life card: what this life was, did, and left behind. */
export function renderLifeSummary() {
  if (!body) return;
  body.innerHTML = '';

  const summary = summariseLife();
  const yesNo = (value) => t(value ? 'life.yes' : 'life.no');

  body.appendChild(group(t('life.group.life')));
  body.appendChild(row(t('life.number'), `${summary.lifeId}/${PROTOTYPE_LIVES}`));
  body.appendChild(row(t('life.form'), t(formNameKey(summary.formId))));
  body.appendChild(row(t('life.ability'), t(formAbilityKey(summary.formId))));

  body.appendChild(group(t('life.group.record')));
  body.appendChild(row(t('life.helped'), yesNo(summary.helped)));
  body.appendChild(row(t('life.held'), yesNo(summary.held)));
  body.appendChild(row(t('life.changed'), yesNo(summary.changed)));
  body.appendChild(row(t('karma.merit'), String(summary.merit)));
  body.appendChild(row(t('karma.demerit'), String(summary.demerit)));

  if (rebornButton) {
    rebornButton.textContent = isPrototypeComplete() ? t('life.finish') : t('life.reborn');
  }
}

export function showLifeSummary() {
  recordLife();
  renderLifeSummary();
  overlay.classList.remove('hidden');
  if (typeof playBell === 'function') playBell();
}

function finishJourney() {
  overlay.classList.add('hidden');
  openMirrorCourt();
}

export function initLifeSummary() {
  const button = $('#lifeBtn');
  if (button) {
    button.addEventListener('click', (e) => {
      e.target.blur();
      initAudio();
      playBell();
      startLifeMode();
    });
  }

  if (rebornButton) {
    rebornButton.addEventListener('click', (e) => {
      e.target.blur();
      if (isPrototypeComplete()) {
        finishJourney();
        return;
      }
      overlay.classList.add('hidden');
      advanceLife();
    });
  }

  const close = $('#lifeClose');
  if (close) close.addEventListener('click', () => overlay.classList.add('hidden'));

  // A water-bound life cannot reach the temple; its river goal ends the life.
  on(EVENTS.LIFE_COMPLETE, () => {
    if (!overlay.classList.contains('hidden')) return;
    showLifeSummary();
  });

  on(EVENTS.LOCALE_CHANGED, () => {
    if (!overlay.classList.contains('hidden')) renderLifeSummary();
  });
}
