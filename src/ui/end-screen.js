'use strict';

import { MODE } from '../core/constants.js';
import { state } from '../core/state.js';
import { on, EVENTS } from '../core/events.js';
import { playBell } from '../systems/audio.js';
import { t } from '../systems/i18n.js';
import { getKarma, activeRoots } from '../systems/karma.js';
import { keptPreceptCount } from '../systems/precepts.js';
import { resolveRebirth } from '../systems/rebirth.js';
import { realmById } from '../content/realms.js';
import { chapterById, loadChapter, nextChapterId } from '../game/chapters.js';
import { $ } from './dom.js';

const endScreen = $('#endScreen');
const endTitle = $('#endTitle');
const endName = $('#endName');
const endLesson = $('#endLesson');
const endStats = $('#endStats');
const nextBtn = $('#nextBtn');
const realmName = $('#realmName');
const realmPali = $('#realmPali');
const realmDesc = $('#realmDesc');
const realmReason = $('#realmReason');
const karmaSummary = $('#karmaSummary');
const preceptSummary = $('#preceptSummary');

const FALLBACK_END = {
  titleKey: 'end.title',
  nameKey: 'end.name',
  lessonKey: 'end.lesson',
  statsKey: 'end.stats',
};

function currentEndConfig() {
  const def = chapterById(state.chapter);
  return (def && def.end) || FALLBACK_END;
}

function renderEndText() {
  const end = currentEndConfig();
  endTitle.textContent = t(end.titleKey);
  endName.textContent = t(end.nameKey);
  endLesson.innerHTML = t(end.lessonKey);

  const minutes = Math.floor(state.stats.time / 60);
  const seconds = Math.floor(state.stats.time % 60);
  const karma = getKarma();
  // Spread every stat + kamma tally so any chapter's stats line can use them.
  endStats.innerHTML = t(end.statsKey, {
    ...state.stats,
    merit: karma.merit,
    demerit: karma.demerit,
    kusala: karma.kusala,
    akusala: karma.akusala,
    time: `${minutes}:${String(seconds).padStart(2, '0')}`,
  });

  renderRebirth();
}

/** Show where this run's accumulated karma would lead — or that it is freed. */
function renderRebirth() {
  const karma = getKarma();
  karmaSummary.textContent = t('hud.karma', {
    merit: karma.merit,
    demerit: karma.demerit,
    kusala: karma.kusala,
    akusala: karma.akusala,
  });
  preceptSummary.textContent = t('end.precept.summary', {
    kept: keptPreceptCount(),
    total: 5,
  });

  if (state.liberated) {
    realmName.textContent = t('ch7.nibbana.name');
    realmPali.textContent = 'Nibbāna';
    realmDesc.textContent = t('ch7.nibbana.desc');
    realmReason.textContent = t('ch7.nibbana.reason');
    return;
  }

  const { realmId, reasonKey } = resolveRebirth(karma);
  const realm = realmById(realmId);
  realmName.textContent = realm ? t(realm.nameKey) : '';
  realmPali.textContent = realm ? realm.pali : '';
  realmDesc.textContent = realm ? t(realm.descKey) : '';
  realmReason.textContent = t(reasonKey);

  const roots = activeRoots();
  if (roots.length) {
    karmaSummary.textContent += ` — ${roots.map((root) => t(root.labelKey)).join(' · ')}`;
  }
}

export function showEndScreen() {
  state.mode = MODE.END;
  renderEndText();

  const next = nextChapterId(state.chapter);
  nextBtn.classList.toggle('hidden', next === null);
  nextBtn.dataset.next = next === null ? '' : String(next);

  endScreen.classList.remove('hidden');
  playBell();
}

export function initEndScreen() {
  $('#restartBtn').addEventListener('click', () => window.location.reload());

  nextBtn.addEventListener('click', () => {
    const next = Number(nextBtn.dataset.next);
    if (next) loadChapter(next);
  });

  on(EVENTS.LOCALE_CHANGED, () => {
    if (state.mode === MODE.END) renderEndText();
  });
}
