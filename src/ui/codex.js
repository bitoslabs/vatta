'use strict';

import { KARMA_ACTIONS, KARMA_ROOTS } from '../content/karma-actions.js';
import { REALM_GROUPS, realmsByGroup } from '../content/realms.js';
import { on, EVENTS } from '../core/events.js';
import { t } from '../systems/i18n.js';
import { $ } from './dom.js';

const overlay = $('#codexOverlay');
const body = $('#codexBody');

function el(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function row(pali, name, desc) {
  const item = el('div', 'codex-realm');
  if (pali) item.appendChild(el('div', 'codex-pali', pali));
  item.appendChild(el('div', 'codex-name', name));
  if (desc) item.appendChild(el('div', 'codex-desc', desc));
  return item;
}

function render() {
  body.innerHTML = '';

  // ---- Kamma: the actions and their roots -------------------------------
  body.appendChild(el('div', 'codex-group', t('karma.title')));
  for (const [id, def] of Object.entries(KARMA_ACTIONS)) {
    const group = def.root === 'kusala' ? t('karma.kusala') : t('karma.akusala');
    body.appendChild(row(group, t(`karma.${id}.name`), t(`karma.${id}.note`)));
  }

  body.appendChild(el('div', 'codex-group', t('karma.rootLabel')));
  for (const root of Object.values(KARMA_ROOTS)) {
    body.appendChild(row('', t(root.labelKey), ''));
  }

  // ---- The 31 planes of existence ---------------------------------------
  for (const group of REALM_GROUPS) {
    body.appendChild(el('div', 'codex-group', t(group.labelKey)));
    for (const realm of realmsByGroup(group.id)) {
      body.appendChild(row(realm.pali, t(realm.nameKey), t(realm.descKey)));
    }
  }
}

export function initCodex() {
  $('#codexBtn').addEventListener('click', () => {
    render();
    overlay.classList.remove('hidden');
  });

  $('#codexClose').addEventListener('click', () => {
    overlay.classList.add('hidden');
  });

  on(EVENTS.LOCALE_CHANGED, () => {
    if (!overlay.classList.contains('hidden')) render();
  });
}
