'use strict';

import { MODE } from '../core/constants.js';
import { state } from '../core/state.js';
import { on, EVENTS } from '../core/events.js';
import { playBell } from '../systems/audio.js';
import { t } from '../systems/i18n.js';
import { chapterById, loadChapter, nextChapterId } from '../game/chapters.js';
import { $ } from './dom.js';

const endScreen = $('#endScreen');
const endTitle = $('#endTitle');
const endName = $('#endName');
const endLesson = $('#endLesson');
const endStats = $('#endStats');
const nextBtn = $('#nextBtn');

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
  endStats.innerHTML = t(end.statsKey, {
    caught: state.stats.caught,
    lost: state.stats.lost,
    retaliations: state.stats.retaliations,
    time: `${minutes}:${String(seconds).padStart(2, '0')}`,
  });
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
