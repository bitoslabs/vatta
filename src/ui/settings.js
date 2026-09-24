'use strict';

import { on, emit, EVENTS } from '../core/events.js';
import { isMuted, setMuted, toggleMute } from '../systems/audio.js';
import { t } from '../systems/i18n.js';
import { getActiveSlot, getRunName, clearSave, listSaves, readSave } from '../systems/save.js';
import { isLargeType, setLargeType, toggleLargeType } from '../systems/settings.js';
import { chapterById } from '../game/chapters.js';
import { askConfirm, initConfirm } from './confirm.js';
import { renderSaveSlots } from './save-slots.js';
import { $ } from './dom.js';

/**
 * Help & settings: everything a player needs to know that is not the game.
 *
 * The title screen groups actions; this screen answers "which key is that?" and
 * "where are my saves?" in one place, and it is the only screen that can throw a
 * run away — behind a confirm (ui/confirm.js). It opens with H from anywhere, so
 * it is reachable mid-walk without leaving the world.
 */
const overlay = $('#settingsOverlay');
const muteButton = $('#settingsMute');
const typeButton = $('#settingsLarge');
const resetButton = $('#settingsReset');
const runInfo = $('#settingsRun');
const closeButton = $('#settingsClose');

const KEYS = [
  ['hud.controls', 'hud.controls'],
  ['help.keys.mind', 'help.keys.mind'],
  ['help.keys.act', 'help.keys.act'],
  ['help.keys.mute', 'help.keys.mute'],
  ['help.keys.dismiss', 'help.keys.dismiss'],
  ['help.keys.teacher', 'help.keys.teacher'],
  ['help.keys.projector', 'help.keys.projector'],
  ['help.keys.help', 'help.keys.help'],
];

function renderRunInfo() {
  if (!runInfo) return;
  const slot = getActiveSlot();
  const data = readSave();
  const name = getRunName();
  if (!data) {
    runInfo.textContent = t('help.run.empty', { slot });
    return;
  }
  const def = chapterById(data.chapter);
  runInfo.textContent = t('help.run.line', {
    slot,
    chapter: def ? t(def.nameKey) : data.chapter,
    name: name || t('help.run.unnamed'),
    merit: data.karma?.merit ?? 0,
    demerit: data.karma?.demerit ?? 0,
  });
}

function renderButtons() {
  if (muteButton) {
    muteButton.textContent = t(isMuted() ? 'help.sound.muted' : 'help.sound.on');
    muteButton.classList.toggle('is-off', isMuted());
  }
  if (typeButton) {
    typeButton.textContent = t(isLargeType() ? 'help.type.large' : 'help.type.normal');
    typeButton.classList.toggle('is-on', isLargeType());
  }
}

function renderKeys() {
  const list = $('#settingsKeys');
  if (!list) return;
  list.innerHTML = '';
  for (const [key] of KEYS) {
    if (key === 'hud.controls') continue; // the world's control line is its own key
    const row = document.createElement('div');
    row.className = 'key-row';
    row.textContent = t(key);
    list.appendChild(row);
  }
}

export function renderSettings() {
  renderButtons();
  renderRunInfo();
  renderKeys();
}

export function openSettings() {
  if (!overlay) return;
  renderSettings();
  overlay.classList.remove('hidden');
}

export function closeSettings() {
  if (overlay) overlay.classList.add('hidden');
}

export function isSettingsOpen() {
  return Boolean(overlay) && !overlay.classList.contains('hidden');
}

export function toggleSettings() {
  if (isSettingsOpen()) closeSettings(); else openSettings();
}

export function initSettingsScreen() {
  initConfirm();
  if (!overlay) return;

  if (muteButton) muteButton.addEventListener('click', (e) => { e.target.blur(); toggleMute(); renderButtons(); });
  if (typeButton) typeButton.addEventListener('click', (e) => { e.target.blur(); toggleLargeType(); renderButtons(); });
  if (closeButton) closeButton.addEventListener('click', (e) => { e.target.blur(); closeSettings(); });

  if (resetButton) {
    resetButton.addEventListener('click', async (e) => {
      e.target.blur();
      const slot = getActiveSlot();
      const confirmed = await askConfirm({
        titleKey: 'confirm.reset.title',
        bodyKey: 'confirm.reset.body',
        confirmKey: 'confirm.reset.yes',
        cancelKey: 'confirm.cancel',
      });
      if (!confirmed) return;
      clearSave(slot);
      renderSaveSlots();
      renderSettings();
      emit(EVENTS.LOCALE_CHANGED, undefined); // let the title screen re-read the save
    });
  }

  on(EVENTS.HELP_KEY, () => toggleSettings());
  on(EVENTS.MUTE_TOGGLE, renderButtons);
  on(EVENTS.LOCALE_CHANGED, () => { if (isSettingsOpen()) renderSettings(); });
  renderSettings();
}
