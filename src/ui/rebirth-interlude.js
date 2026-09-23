'use strict';

import { t } from '../systems/i18n.js';
import { $ } from './dom.js';

const overlay = $('#rebirthOverlay');
const realmEl = $('#rebirthRealm');
const paliEl = $('#rebirthPali');
const descEl = $('#rebirthDesc');
const reasonEl = $('#rebirthReason');

/** Show the จุติ–ปฏิสนธิ card when a life ends mid-chapter. */
export function showRebirthInterlude(realm, reasonKey) {
  if (!realm) return;
  realmEl.textContent = t(realm.nameKey);
  paliEl.textContent = realm.pali;
  descEl.textContent = t(realm.descKey);
  reasonEl.textContent = reasonKey ? t(reasonKey) : '';
  overlay.classList.remove('hidden');
}

export function hideRebirthInterlude() {
  overlay.classList.add('hidden');
}
