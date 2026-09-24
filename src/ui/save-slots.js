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
import { resumeLifeIfPending, showLifeSummary } from './life-summary.js';

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
  // An interrupted ending resumes from its reservation; a save from before the
  // reservation existed falls back to the old rule (its life is in the log).
  if (data.lifeMode && !data.liberated) {
    if (resumeLifeIfPending()) return;
    if (data.lifeLog?.some((entry) => entry.lifeId === data.lifeId)) showLifeSummary();
  }
}

export function renderSaveSlots() {
  if (!container) return;
  container.innerHTML = '';
  const active = getActiveSlot();

  for (const entry of listSaves()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `save-slot${entry.slot === active ? ' is-active' : ''}${entry.filled ? '' : ' is-empty'}`;
    button.dataset.slot = String(entry.slot);
    button.setAttribute('aria-pressed', String(entry.slot === active));

    // A slot reads as a row: the number first, then what is in it.
    const number = document.createElement('span');
    number.className = 'slot-num';
    number.textContent = String(entry.slot);
    const text = document.createElement('span');
    text.className = 'slot-text';

    if (entry.filled) {
      const def = chapterById(entry.chapter);
      text.textContent = entry.name
        ? t('save.slot.named', {
          slot: entry.slot,
          name: entry.name,
          chapter: def ? t(def.nameKey) : entry.chapter,
        })
        : t('save.slot.filled', {
          slot: entry.slot,
          chapter: def ? t(def.nameKey) : entry.chapter,
          merit: entry.merit,
        });
    } else {
      text.textContent = t('save.slot.empty', { slot: entry.slot });
    }

    button.appendChild(number);
    button.appendChild(text);
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
