'use strict';

import { on, EVENTS } from '../core/events.js';
import { t } from '../systems/i18n.js';
import {
  applySaveMeta, applySaveRuntime, getActiveSlot, listSaves, readSave, setActiveSlot,
} from '../systems/save.js';
import { chapterById, CHAPTERS, loadChapter } from '../game/chapters.js';
import { initAudio, playBell } from '../systems/audio.js';
import { $ } from './dom.js';

const container = $('#saveSlots');

function startChapter(id, slot) {
  setActiveSlot(slot);
  initAudio();
  playBell();
  loadChapter(id);
}

/** Resume the active slot's run, or begin a new one. */
function openSlot(slot) {
  setActiveSlot(slot);
  const data = readSave(slot);
  initAudio();
  playBell();
  if (!data) {
    loadChapter(CHAPTERS[0].id);
    return;
  }
  applySaveMeta(data);
  loadChapter(data.chapter, { autosave: false });
  applySaveRuntime(data);
}

export function renderSaveSlots() {
  if (!container) return;
  container.innerHTML = '';
  const active = getActiveSlot();

  for (const entry of listSaves()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `chapter-btn save-slot${entry.slot === active ? ' is-active' : ''}`;
    button.dataset.slot = String(entry.slot);

    if (entry.filled) {
      const def = chapterById(entry.chapter);
      button.textContent = t('save.slot.filled', {
        slot: entry.slot,
        chapter: def ? t(def.nameKey) : entry.chapter,
        merit: entry.merit,
      });
    } else {
      button.textContent = t('save.slot.empty', { slot: entry.slot });
    }

    button.addEventListener('click', (e) => {
      e.target.blur();
      openSlot(entry.slot);
    });
    container.appendChild(button);
  }
}

export function initSaveSlots() {
  if (!container) return;
  renderSaveSlots();
  on(EVENTS.LOCALE_CHANGED, renderSaveSlots);
}
