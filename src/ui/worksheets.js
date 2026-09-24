'use strict';

import { on, EVENTS } from '../core/events.js';
import { t } from '../systems/i18n.js';
import { WORKSHEETS } from '../content/worksheets.js';
import { $ } from './dom.js';

const overlay = $('#worksheetOverlay');
const body = $('#worksheetBody');

function el(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Every worksheet, grouped and numbered, for projection or discussion. */
export function renderWorksheets() {
  if (!body) return;
  body.innerHTML = '';
  for (const sheet of WORKSHEETS) {
    body.appendChild(el('div', 'recap-group', t(sheet.titleKey)));
    sheet.questions.forEach((key, index) => {
      body.appendChild(el('div', 'ws-q', `${index + 1}. ${t(key)}`));
    });
  }
}

function open() {
  renderWorksheets();
  overlay.classList.remove('hidden');
}

export function initWorksheets() {
  const button = $('#worksheetBtn');
  if (button) {
    button.addEventListener('click', (e) => {
      e.target.blur();
      open();
    });
  }
  const print = $('#worksheetPrint');
  if (print) {
    print.addEventListener('click', (e) => {
      e.target.blur();
      if (typeof window.print === 'function') window.print();
    });
  }
  const close = $('#worksheetClose');
  if (close) close.addEventListener('click', () => overlay.classList.add('hidden'));
  on(EVENTS.LOCALE_CHANGED, () => {
    if (!overlay.classList.contains('hidden')) renderWorksheets();
  });
}
