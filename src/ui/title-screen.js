'use strict';

import { EVENTS, on } from '../core/events.js';
import { initAudio, playBell } from '../systems/audio.js';
import { t } from '../systems/i18n.js';
import { CHAPTERS, chapterById, loadChapter } from '../game/chapters.js';
import { $ } from './dom.js';

function startChapter(id) {
  initAudio();
  playBell();
  loadChapter(id);
}

export function initTitleScreen() {
  const startButton = $('#startBtn');
  startButton.addEventListener('click', () => startChapter(CHAPTERS[0].id));
  startButton.addEventListener('click', (e) => e.target.blur());

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
    select.querySelectorAll('.chapter-btn').forEach((button) => {
      const def = chapterById(Number(button.dataset.chapter));
      if (!def) return;
      button.textContent = t(def.nameKey);
      button.title = t(def.subtitleKey);
    });
  });
}
