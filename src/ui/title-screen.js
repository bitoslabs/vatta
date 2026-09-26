'use strict';

import { EVENTS, on } from '../core/events.js';
import { state } from '../core/state.js';
import { initAudio, playBell } from '../systems/audio.js';
import { t } from '../systems/i18n.js';
import { applySaveMeta, applySaveRuntime, readSave } from '../systems/save.js';
import { CHAPTERS, chapterById, loadChapter } from '../game/chapters.js';
import { askConfirm } from './confirm.js';
import { $ } from './dom.js';
import { resumeLifeIfPending, showLifeSummary } from './life-summary.js';
import { showEndScreen } from './end-screen.js';
import { startLifeMode, upgradeLegacyLifeMode } from '../systems/life.js';

function startChapter(id) {
  initAudio();
  playBell();
  startLifeMode(id);
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
  applySaveRuntime(data);
  loadChapter(data.chapter, { autosave: false, realmId: data.realmId });
  applySaveRuntime(data);
  if (!data.lifeMode) upgradeLegacyLifeMode();
  if (state.liberated || state.journeyComplete) {
    showEndScreen();
    return;
  }
  // An interrupted ending resumes from its reservation; a save from before the
  // reservation existed falls back to the old rule (its life is in the log).
  if (data.lifeMode && !data.liberated) {
    if (resumeLifeIfPending()) return;
    if (data.lifeLog?.some((entry) => entry.lifeId === data.lifeId)) showLifeSummary();
  }
}

/**
 * The title screen is one panel with four small views instead of one long wall of
 * buttons: เล่น (the actual actions), บท (the chapter grid), บันทึก (slots and run
 * name) and เครื่องมือ (classroom and reference tools). Everything that was on the
 * screen is still here — it is just grouped, and the panel scrolls instead of
 * spilling past the window.
 */
function initTabs() {
  const nav = $('#titleTabs');
  if (!nav || typeof nav.querySelectorAll !== 'function') return;
  const tabs = Array.from(nav.querySelectorAll('.tab') || []);
  if (!tabs.length) return;
  const body = document.querySelector('.tab-body');
  if (!body || typeof body.querySelectorAll !== 'function') return;
  const panes = Array.from(body.querySelectorAll('.tab-pane') || []);

  const select = (name) => {
    for (const tab of tabs) {
      const on = tab.dataset.tab === name;
      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
    }
    for (const pane of panes) {
      const on = pane.dataset.pane === name;
      pane.classList.toggle('is-active', on);
      pane.hidden = !on;
    }
  };

  for (const tab of tabs) {
    tab.addEventListener('click', (e) => {
      e.target.blur();
      select(tab.dataset.tab);
    });
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const index = tabs.indexOf(tab);
      const step = e.key === 'ArrowRight' ? 1 : tabs.length - 1;
      const next = tabs[(index + step) % tabs.length];
      select(next.dataset.tab);
      next.focus();
    });
  }
  select('play');
}

export function initTitleScreen() {
  initTabs();
  const startButton = $('#startBtn');
  startButton.addEventListener('click', async (e) => {
    e.target.blur();
    // Starting fresh on a filled slot would write over that run, so it asks.
    if (readSave()) {
      const confirmed = await askConfirm({
        titleKey: 'confirm.newRun.title',
        bodyKey: 'confirm.newRun.body',
        confirmKey: 'confirm.newRun.yes',
        cancelKey: 'confirm.cancel',
      });
      if (!confirmed) return;
    }
    startChapter(CHAPTERS[0].id);
  });

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
    // The chapter number matters: the journey is walked in order.
    button.textContent = `${def.id} · ${t(def.nameKey)}`;
    button.title = t(def.subtitleKey);
    button.addEventListener('click', () => startChapter(def.id));
    select.appendChild(button);
  }

  // Mark the chapter the saved run is standing in.
  const markCurrentChapter = () => {
    const data = readSave();
    const current = data ? data.chapter : null;
    select.querySelectorAll('.chapter-btn').forEach((button) => {
      button.classList.toggle('is-current', Number(button.dataset.chapter) === current);
    });
  };
  markCurrentChapter();

  on(EVENTS.LOCALE_CHANGED, () => {
    renderContinue();
    markCurrentChapter();
    select.querySelectorAll('.chapter-btn').forEach((button) => {
      const def = chapterById(Number(button.dataset.chapter));
      if (!def) return;
      button.textContent = `${def.id} · ${t(def.nameKey)}`;
      button.title = t(def.subtitleKey);
    });
  });
}
