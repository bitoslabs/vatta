'use strict';

import { KARMA_ACTIONS, KARMA_ROOTS } from '../content/karma-actions.js';
import { FACTORS, factorDescKey, factorNameKey } from '../content/factors.js';
import { preceptDescKey, preceptNameKey } from '../content/precepts.js';
import { REALM_GROUPS, realmsByGroup } from '../content/realms.js';
import { on, EVENTS } from '../core/events.js';
import { t } from '../systems/i18n.js';
import { isUnlocked } from '../systems/path.js';
import { getPreceptStatus } from '../systems/precepts.js';
import { leavingList } from '../systems/world-effects.js';
import { setWaypoint } from '../systems/waypoint.js';
import { formNameKey } from '../content/forms.js';
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

/**
 * The world book (docs/player-interactions.md "สมุดความทรงจำ"): what past lives
 * left, in the order they left it, and a way to walk back to it. No scores and no
 * verdicts — a leaving is named, placed, and shown as the change it is.
 */
function renderLeavings() {
  const leavings = leavingList();
  body.appendChild(el('div', 'codex-group', t('book.leavings.title')));
  if (!leavings.length) {
    body.appendChild(el('div', 'codex-note', t('book.leavings.empty')));
    return;
  }
  for (const leaving of leavings) {
    const item = el('div', 'codex-leaving');
    const who = leaving.lifeId !== null && leaving.formId
      ? t('book.leavings.who', { life: leaving.lifeId, form: t(formNameKey(leaving.formId)) })
      : t('book.leavings.whoUnknown');
    const where = leaving.site ? t(`site.${leaving.site}`) : '';
    item.appendChild(el('div', 'codex-name', t(leaving.key)));
    item.appendChild(el('div', 'codex-desc', [who, where].filter(Boolean).join(' · ')));
    if (leaving.consequenceKey) item.appendChild(el('div', 'codex-desc', t(leaving.consequenceKey)));
    if (leaving.place) {
      const go = el('button', 'link-btn', t('book.leavings.go'));
      go.type = 'button';
      go.addEventListener('click', (e) => {
        e.target.blur();
        setWaypoint({ x: leaving.place.x, y: leaving.place.y, key: leaving.key, site: leaving.site });
      });
      item.appendChild(go);
    }
    body.appendChild(item);
  }
}

function render() {
  body.innerHTML = '';

  // ---- What past lives left behind --------------------------------------
  renderLeavings();

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

  // ---- The Noble Eightfold Path, as unlocked by this run -----------------
  body.appendChild(el('div', 'codex-group', t('path.title')));
  for (const factor of FACTORS) {
    const open = isUnlocked(factor.id);
    const item = el('div', `codex-realm${open ? ' is-unlocked' : ''}`);
    item.appendChild(el('div', 'codex-pali', open ? t('path.unlocked') : t('path.locked')));
    item.appendChild(el('div', 'codex-name', t(factorNameKey(factor.id))));
    item.appendChild(el('div', 'codex-desc', t(factorDescKey(factor.id))));
    body.appendChild(item);
  }

  // ---- The Five Precepts, as broken or kept by this run ------------------
  body.appendChild(el('div', 'codex-group', t('precept.title')));
  for (const status of getPreceptStatus()) {
    const item = el('div', `codex-realm${status.kept ? '' : ' is-broken'}`);
    const label = status.kept
      ? t('precept.kept')
      : t('precept.broken', { count: status.count });
    item.appendChild(el('div', 'codex-pali', label));
    item.appendChild(el('div', 'codex-name', t(preceptNameKey(status.id))));
    item.appendChild(el('div', 'codex-desc', t(preceptDescKey(status.id))));
    body.appendChild(item);
  }

  // ---- The 31 planes of existence ---------------------------------------
  for (const group of REALM_GROUPS) {
    body.appendChild(el('div', 'codex-group', t(group.labelKey)));
    for (const realm of realmsByGroup(group.id)) {
      body.appendChild(row(realm.pali, t(realm.nameKey), t(realm.descKey)));
    }
  }
}

/** Open the codex (the world book, kamma and the 31 planes). */
export function openCodex() {
  if (!overlay) return false;
  render();
  overlay.classList.remove('hidden');
  return true;
}

export function closeCodex() {
  if (overlay) overlay.classList.add('hidden');
}

export function isCodexOpen() {
  return Boolean(overlay) && !overlay.classList.contains('hidden');
}

export function initCodex() {
  $('#codexBtn').addEventListener('click', () => openCodex());
  $('#codexClose').addEventListener('click', () => closeCodex());

  on(EVENTS.LOCALE_CHANGED, () => {
    if (isCodexOpen()) render();
  });
}
