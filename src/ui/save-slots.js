'use strict';

import { on, EVENTS } from '../core/events.js';
import { t } from '../systems/i18n.js';
import {
  applySaveMeta, applySaveRuntime, getActiveSlot, getRunName, listSaves, readSave,
  setActiveSlot, setRunName,
} from '../systems/save.js';
import { chapterById, CHAPTERS, loadChapter } from '../game/chapters.js';
import { initAudio, playBell } from '../systems/audio.js';
import { $ } from './dom.js';
import { showLifeSummary } from './life-summary.js';

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
  applySaveRuntime(data);
  loadChapter(data.chapter, { autosave: false });
  applySaveRuntime(data);
  if (data.lifeMode && !data.liberated && data.lifeLog?.some(entry => entry.lifeId === data.lifeId)) showLifeSummary();
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
      if (entry.name) {
        button.textContent = t('save.slot.named', {
          slot: entry.slot,
          name: entry.name,
          chapter: def ? t(def.nameKey) : entry.chapter,
        });
      } else {
        button.textContent = t('save.slot.filled', {
          slot: entry.slot,
          chapter: def ? t(def.nameKey) : entry.chapter,
          merit: entry.merit,
        });
      }
    } else {
      button.textContent = t('save.slot.empty', { slot: entry.slot });
    }

    button.addEventListener('click', (e) => {
      e.target.blur();
      openSlot(entry.slot);
      syncNameInput();
    });
    container.appendChild(button);
  }
}

const nameInput = $('#runNameInput');

function syncNameInput() {
  if (nameInput) nameInput.value = getRunName();
}

export function initSaveSlots() {
  if (!container) return;
  renderSaveSlots();
  syncNameInput();
  if (nameInput) {
    nameInput.addEventListener('input', () => setRunName(nameInput.value));
    nameInput.addEventListener('change', renderSaveSlots);
  }
  on(EVENTS.LOCALE_CHANGED, () => {
    renderSaveSlots();
    syncNameInput();
  });
}
