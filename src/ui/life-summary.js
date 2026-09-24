'use strict';

import { state } from '../core/state.js';
import { MODE } from '../core/constants.js';
import { saveRun } from '../systems/save.js';
import { on, EVENTS } from '../core/events.js';
import { initAudio, playBell } from '../systems/audio.js';
import { t } from '../systems/i18n.js';
import { formAbilityKey, formNameKey } from '../content/forms.js';
import {
  advanceLife, beginLifeEnding, isJourneyComplete, isPrototypeComplete, plannedNextLife, recordLife,
  startLifeMode, summariseLife,
} from '../systems/life.js';
import { isReducedMotion } from '../systems/settings.js';
import { addLifeLight } from '../systems/effects.js';
import { pendingTransition } from '../systems/transition.js';
import { player } from '../entities/player.js';
import { loadChapter, CHAPTERS } from '../game/chapters.js';
import { setTeacher } from '../systems/teacher.js';
import { openMirrorCourt } from './mirror-court.js';
import { $ } from './dom.js';

const overlay = $('#lifeSummary');
const body = $('#lifeSummaryBody');
const rebornButton = $('#lifeReborn');
let timer = null;
let shownLife = null;
let seconds = 5;
let paused = false;

function stopTimer() { clearInterval(timer); timer = null; }
function continueLife() {
  // The reservation is the contract: a pending transition may be resumed even from
  // a reload, when there is no summary card on screen any more.
  const pending = pendingTransition();
  if (!pending && (shownLife !== state.lifeId || overlay.classList.contains('hidden'))) return;
  stopTimer(); shownLife = null;
  if (isPrototypeComplete()) { finishJourney(); return; }
  overlay.classList.add('hidden');
  advanceLife();
}
function beginTimer() {
  stopTimer();
  timer = setInterval(() => {
    if (!state.lifeMode || shownLife !== state.lifeId || state.mode !== MODE.END) { stopTimer(); return; }
    if (document.hidden || paused) return;
    seconds -= 1;
    if (seconds <= 0) continueLife();
    else renderLifeSummary();
  }, 1000);
}

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
  body.appendChild(row(t('life.number'), String(summary.lifeId)));
  body.appendChild(row(t('life.form'), t(formNameKey(summary.formId))));
  body.appendChild(row(t('life.ability'), t(formAbilityKey(summary.formId))));
  if (!isPrototypeComplete()) {
    // The card shows the *reserved* life, so what the player reads and what they
    // are born into cannot drift apart.
    const next = plannedNextLife();
    body.appendChild(row(t('life.next'), `${t(formNameKey(next.formId))} · ${t(`chapter${next.chapter}.name`)}`));
    // If the draw is what chose the body, the player sees the real chance it had —
    // never a percentage that is not one (systems/rebirth.js).
    if (Number.isFinite(next.probability)) {
      body.appendChild(row(t('life.odds'), t('life.odds.value', { percent: Math.round(next.probability * 1000) / 10 })));
    }
  }
  body.appendChild(row(t('life.auto'), paused ? t('life.paused') : t('life.countdown', { seconds })));
  $('#lifeClose').textContent = t(paused ? 'life.resume' : 'life.pause');

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

export function showLifeSummary(endingKind) {
  if (!state.lifeMode || state.liberated || state.journeyComplete) return;
  if (shownLife === state.lifeId && !overlay.classList.contains('hidden')) return;
  // Reserve the next life first: the scene may be skipped, hidden or reloaded, and
  // none of that may change which life comes next (systems/transition.js).
  const pending = beginLifeEnding(typeof endingKind === 'string' ? endingKind : 'goal');
  if (!pending.begun && pending.transition) {
    // Already ending: show the same card again rather than a second ending.
    renderLifeSummary();
    overlay.classList.remove('hidden');
    return;
  }
  addLifeLight(player.x, player.y, isReducedMotion());
  state.mode = MODE.END;
  state.interact = null;
  shownLife = state.lifeId;
  seconds = 5; paused = false;
  recordLife();
  saveRun();
  renderLifeSummary();
  overlay.classList.remove('hidden');
  if (typeof playBell === 'function') playBell();
  beginTimer();
}

function finishJourney() {
  overlay.classList.add('hidden');
  openMirrorCourt();
}

/**
 * Resume an ending that was interrupted by a close or a reload: the summary comes
 * back with the same reserved life, or — if the reservation had already been
 * applied — the new life simply continues. Returns true when it took over.
 */
export function resumeLifeIfPending() {
  const pending = pendingTransition();
  if (!pending) return false;
  if (pending.phase === 'resolving' || pending.phase === 'spawning') {
    continueLife();
    return true;
  }
  showLifeSummary(pending.completionId);
  return true;
}

export function initLifeSummary() {
  // Once the journey is complete, the world can be walked again without karma.
  const exploreButton = $('#exploreBtn');
  if (exploreButton) {
    const syncExplore = () => exploreButton.classList.toggle('hidden', !isJourneyComplete());
    exploreButton.addEventListener('click', (e) => {
      e.target.blur();
      setTeacher(true); // no spirits, no failures — a memory walk
      loadChapter(CHAPTERS[0].id);
    });
    on(EVENTS.LOCALE_CHANGED, syncExplore);
    syncExplore();
  }

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
      continueLife();
    });
  }

  const close = $('#lifeClose');
  if (close) close.addEventListener('click', () => {
    paused = !paused;
    renderLifeSummary();
  });

  // A water-bound life cannot reach the temple; its river goal ends the life.
  on(EVENTS.LIFE_COMPLETE, (kind) => {
    if (!overlay.classList.contains('hidden')) return;
    showLifeSummary(kind);
  });

  on(EVENTS.LOCALE_CHANGED, () => {
    if (!overlay.classList.contains('hidden')) renderLifeSummary();
  });
}
