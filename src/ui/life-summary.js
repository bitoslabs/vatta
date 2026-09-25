'use strict';

import { state } from '../core/state.js';
import { MODE } from '../core/constants.js';
import { saveRun } from '../systems/save.js';
import { on, EVENTS } from '../core/events.js';
import { initAudio, playBell } from '../systems/audio.js';
import { t } from '../systems/i18n.js';
import { formAbilityKey, formNameKey } from '../content/forms.js';
import { realmById } from '../content/realms.js';
import {
  advanceLife, beginLifeEnding, chooseNextBody, isJourneyComplete, isPrototypeComplete, plannedNextLife,
  recordLife, startLifeMode, summariseLife,
} from '../systems/life.js';
import { isReducedMotion } from '../systems/settings.js';
import { addLifeLight } from '../systems/effects.js';
import { choicePending, pendingTransition } from '../systems/transition.js';
import { mapsFor } from '../content/forms.js';
import { drawFormBody } from '../render/forms-sprites.js';
import { player } from '../entities/player.js';
import { loadChapter, CHAPTERS } from '../game/chapters.js';
import { setTeacher } from '../systems/teacher.js';
import { openMirrorCourt } from './mirror-court.js';
import { $ } from './dom.js';

const overlay = $('#lifeSummary');
const body = $('#lifeSummaryBody');
const rebornButton = $('#lifeReborn');
const choiceBox = $('#lifeChoice');
const choiceCards = $('#lifeChoiceCards');
const randomButton = $('#lifeRandom');
let timer = null;
let shownLife = null;
let seconds = 5;
let paused = false;

function stopTimer() { clearInterval(timer); timer = null; }
function openBookForRebirth() {
  // Imported lazily: the book imports the summary's neighbours, and a cycle here
  // would be worse than a small import at the moment of use.
  import('./animal-book.js').then((book) => book.openBook());
}

function continueLife() {
  // The reservation is the contract: a pending transition may be resumed even from
  // a reload, when there is no summary card on screen any more.
  const pending = pendingTransition();
  if (!pending && (shownLife !== state.lifeId || overlay.classList.contains('hidden'))) return;
  if (choicePending()) return;
  stopTimer(); shownLife = null;
  if (isPrototypeComplete()) { finishJourney(); return; }
  overlay.classList.add('hidden');
  advanceLife();
}
function beginTimer() {
  stopTimer();
  timer = setInterval(() => {
    if (!state.lifeMode || shownLife !== state.lifeId || state.mode !== MODE.END) { stopTimer(); return; }
    if (document.hidden || paused || choicePending()) return;
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

/**
 * Choice mode: the bodies the draw offered, as cards (name, art drawn from code,
 * one line of ability and one line of where it can go). Reloading shows the same
 * cards with the same pick, because they live in the reservation
 * (systems/transition.js), not in the screen.
 */
function renderChoice(pending) {
  if (!choiceBox || !choiceCards) return;
  const cards = pending && pending.next ? pending.next.candidateIds : null;
  const showing = Array.isArray(cards) && cards.length > 0;
  choiceBox.classList.toggle('hidden', !showing);
  if (randomButton) randomButton.classList.toggle('hidden', !showing);
  if (!showing) return;
  choiceCards.innerHTML = '';
  const probabilities = pending.next.probabilities || {};
  for (const formId of cards) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'life-choice-card';
    card.dataset.form = formId;
    if (pending.next.chosen && pending.next.formId === formId) card.classList.add('is-picked');

    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 96, 64);
      try { drawFormBody(ctx, formId, 48, 46, { face: 1, phase: 0.4, moving: false, bob: 0.5, act: 0 }); } catch { /* art is optional here */ }
    }
    card.appendChild(canvas);

    const name = document.createElement('div');
    name.className = 'life-choice-name';
    name.textContent = t(formNameKey(formId));
    card.appendChild(name);

    const ability = document.createElement('div');
    ability.className = 'life-choice-line';
    ability.textContent = t(formAbilityKey(formId));
    card.appendChild(ability);

    const where = document.createElement('div');
    where.className = 'life-choice-line';
    where.textContent = `${t('life.choice.where')} ${mapsFor(formId).map((map) => t(`map.${map}`)).join(' · ')}`;
    card.appendChild(where);

    if (Number.isFinite(probabilities[formId])) {
      const chance = document.createElement('div');
      chance.className = 'life-choice-line';
      chance.textContent = `${t('life.choice.chance')} ${Math.round(probabilities[formId] * 1000) / 10}%`;
      card.appendChild(chance);
    }
    card.addEventListener('click', (e) => {
      e.target.blur?.();
      if (chooseNextBody(formId)) {
        saveRun();
        card.classList.add('is-picked');
        renderLifeSummary();
      }
    });
    choiceCards.appendChild(card);
  }
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
    const realm = realmById(next.realmId);
    if (realm) {
      body.appendChild(row(t('life.realm'), t(realm.nameKey)));
      if (next.reasonKey) body.appendChild(row(t('life.realm.reason'), t(next.reasonKey)));
    }
    // If the draw is what chose the body, the player sees the real chance it had —
    // never a percentage that is not one (systems/rebirth.js).
    if (Number.isFinite(next.probability)) {
      body.appendChild(row(t('life.odds'), t('life.odds.value', { percent: Math.round(next.probability * 1000) / 10 })));
      // Said out loud, because it is the design's promise: the draw reads the
      // chapter and the bodies this run has worn — never the ledger, and never as a
      // verdict on how the life went (docs/rebirth-modes.md).
      body.appendChild(row(t('life.draw.note'), t('life.draw.note.value')));
    }
  }
  if (choicePending()) {
    body.appendChild(row(t('life.auto'), t('life.choice.picked')));
  } else {
    body.appendChild(row(t('life.auto'), paused ? t('life.paused') : t('life.countdown', { seconds })));
  }
  $('#lifeClose').textContent = t(paused ? 'life.resume' : 'life.pause');

  body.appendChild(group(t('life.group.record')));
  body.appendChild(row(t('life.helped'), yesNo(summary.helped)));
  body.appendChild(row(t('life.held'), yesNo(summary.held)));
  body.appendChild(row(t('life.changed'), yesNo(summary.changed)));
  body.appendChild(row(t('karma.merit'), String(summary.merit)));
  body.appendChild(row(t('karma.demerit'), String(summary.demerit)));

  if (rebornButton) {
    rebornButton.textContent = isPrototypeComplete() ? t('life.finish') : t('life.reborn');
    // In choice mode nothing is born until a body is picked.
    const waiting = choicePending();
    rebornButton.disabled = waiting;
    rebornButton.classList.toggle('is-disabled', waiting);
  }
  renderChoice(pendingTransition());
  // Explore mode asks the animal book instead of showing cards.
  const pending = pendingTransition();
  if (rebornButton && pending && pending.next.explore === true && !pending.next.chosen) {
    rebornButton.disabled = false;
    rebornButton.classList.remove('is-disabled');
    rebornButton.textContent = t('life.explore.open');
  }
}

export function showLifeSummary(endingKind) {
  if (!state.lifeMode || state.liberated || state.journeyComplete) return;
  if (shownLife === state.lifeId && !overlay.classList.contains('hidden')) return;
  // Reserve the next life first: the scene may be skipped, hidden or reloaded, and
  // none of that may change which life comes next (systems/transition.js).
  const pending = beginLifeEnding(typeof endingKind === 'string' ? endingKind : 'goal');
  if (pending.begun) addLifeLight(player.x, player.y, isReducedMotion());
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
      const pending = pendingTransition();
      // Explore mode: the button opens the book, because that is where a body is
      // chosen (nothing is decided here).
      if (pending && pending.next.explore === true && pending.next.chosen !== true) {
        openBookForRebirth();
        return;
      }
      continueLife();
    });
  }

  if (randomButton) {
    randomButton.addEventListener('click', (e) => {
      e.target.blur();
      const pending = pendingTransition();
      const cards = pending?.next?.candidateIds;
      // Only among the cards on screen: the player can always see what they get.
      if (Array.isArray(cards) && cards.length) {
        const pick = cards[Math.floor(((typeof performance !== 'undefined' ? performance.now() : 0) / 1000) * 7) % cards.length];
        if (chooseNextBody(pick)) { saveRun(); renderLifeSummary(); }
      }
    });
  }

  const close = $('#lifeClose');
  if (close) close.addEventListener('click', () => {
    paused = !paused;
    renderLifeSummary();
  });

  // A water-bound life cannot reach the temple; its river goal ends the life.
  // A body picked from the book answers the waiting rebirth.
  on(EVENTS.BOOK_PICKED, () => { continueLife(); });

  on(EVENTS.LIFE_COMPLETE, (kind) => {
    if (!overlay.classList.contains('hidden')) return;
    showLifeSummary(kind);
  });

  on(EVENTS.LOCALE_CHANGED, () => {
    if (!overlay.classList.contains('hidden')) renderLifeSummary();
  });
}
