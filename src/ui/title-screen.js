'use strict';

import { EVENTS, on } from '../core/events.js';
import { initAudio, playBell } from '../systems/audio.js';
import { t } from '../systems/i18n.js';
import { applySaveMeta, applySaveRuntime, readSave } from '../systems/save.js';
import { CHAPTERS, chapterById, loadChapter } from '../game/chapters.js';
import { $ } from './dom.js';

function startChapter(id) {
  initAudio();
  playBell();
  loadChapter(id);
}

/** Resume the saved run: restore conduct first, then load its chapter. */
function resumeRun() {
  const data = readSave();
  if (!data) {
    startChapter(CHAPTERS[0].id);
    return;
  }
  initAudio();
  playBell();
  applySaveMeta(data);
  loadChapter(data.chapter, { autosave: false });
  applySaveRuntime(data);
}

export function initTitleScreen() {
  const startButton = $('#startBtn');
  startButton.addEventListener('click', () => startChapter(CHAPTERS[0].id));
  startButton.addEventListener('click', (e) => e.target.blur());

  const continueButton = $('#continueBtn');
  continueButton.addEventListener('click', (e) => {
    e.target.blur();
    resumeRun();
  });

  const renderContinue = () => {
    const data = readSave();
    if (!data) {
      continueButton.classList.add('hidden');
      return;
    }
    const def = chapterById(data.chapter);
    continueButton.classList.remove('hidden');
    continueButton.textContent = `${t('title.continue')} · ${def ? t(def.nameKey) : data.chapter}`;
  };
  renderContinue();

  const select = $('#chapterSelect');
  for (const def of CHAPTERS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chapter-btn';
    button.dataset.chapter = String(def.id);
    button.textContent = t(def.nameKey);
    button.title = t(def.subtitleKey);
    button.addEventListener('click', () => startChapter(def.id));
    select.appendChild(button);
  }

  on(EVENTS.LOCALE_CHANGED, () => {
    renderContinue();
    select.querySelectorAll('.chapter-btn').forEach((button) => {
      const def = chapterById(Number(button.dataset.chapter));
      if (!def) return;
      button.textContent = t(def.nameKey);
      button.title = t(def.subtitleKey);
    });
  });
}
