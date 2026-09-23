'use strict';

import { state } from '../core/state.js';
import { on, EVENTS } from '../core/events.js';
import { tDialogue } from '../systems/i18n.js';
import { $ } from './dom.js';

const box = $('#dlgBox');
const whoEl = $('#dlgWho');
const textEl = $('#dlgText');

const dlg = {
  open: false,
  lines: [],
  index: 0,
  shown: '',
  full: '',
  cb: null,
};

function showLine() {
  const line = dlg.lines[dlg.index];
  whoEl.textContent = line.who || '';
  dlg.full = line.text;
  dlg.shown = '';
  textEl.textContent = '';
}

/** Open a dialogue script by its locale key. */
export function say(key, cb) {
  dlg.open = true;
  dlg.lines = tDialogue(key);
  dlg.index = 0;
  dlg.cb = cb || null;
  state.dialogueOpen = true;
  box.classList.remove('hidden');
  showLine();
}

export function advanceDialogue() {
  if (!dlg.open) return;
  if (dlg.shown.length < dlg.full.length) {
    dlg.shown = dlg.full;
    textEl.textContent = dlg.full;
    return;
  }
  dlg.index++;
  if (dlg.index >= dlg.lines.length) {
    dlg.open = false;
    state.dialogueOpen = false;
    box.classList.add('hidden');
    const cb = dlg.cb;
    dlg.cb = null;
    if (cb) cb();
  } else {
    showLine();
  }
}

export function initDialogue() {
  box.addEventListener('click', advanceDialogue);
  on(EVENTS.DIALOGUE_ADVANCE, advanceDialogue);
}

/** Discard any open dialogue (used when switching chapters). */
export function resetDialogue() {
  dlg.open = false;
  dlg.lines = [];
  dlg.index = 0;
  dlg.shown = '';
  dlg.full = '';
  dlg.cb = null;
  state.dialogueOpen = false;
  box.classList.add('hidden');
}
