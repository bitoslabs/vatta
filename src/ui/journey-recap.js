'use strict';

import { state } from '../core/state.js';
import { on, EVENTS } from '../core/events.js';
import { t } from '../systems/i18n.js';
import { getKarma } from '../systems/karma.js';
import { getKarmaMemory } from '../systems/karma-memory.js';
import { unlockedFactors } from '../systems/path.js';
import { getPreceptStatus } from '../systems/precepts.js';
import { realmById } from '../content/realms.js';
import { chapterById } from '../game/chapters.js';
import { $ } from './dom.js';

const overlay = $('#recapOverlay');
const body = $('#recapBody');

function row(label, value) {
  const line = document.createElement('div');
  line.className = 'recap-row';
  const left = document.createElement('span');
  left.className = 'recap-label';
  left.textContent = label;
  const right = document.createElement('span');
  right.className = 'recap-value';
  right.textContent = value;
  line.appendChild(left);
  line.appendChild(right);
  return line;
}

function group(title) {
  const heading = document.createElement('div');
  heading.className = 'recap-group';
  heading.textContent = title;
  return heading;
}

/** A summary of the journey: kamma, path, precepts, memory and destination. */
export function renderRecap() {
  if (!body) return;
  body.innerHTML = '';

  const karma = getKarma();
  const memory = getKarmaMemory();
  const def = chapterById(state.chapter);
  const realm = realmById(state.realmId);

  body.appendChild(group(t('recap.group.journey')));
  body.appendChild(row(t('recap.chapter'), def ? t(def.nameKey) : String(state.chapter)));
  body.appendChild(row(t('recap.realm'), realm ? t(realm.nameKey) : state.realmId));
  body.appendChild(row(t('recap.liberated'), t(state.liberated ? 'recap.yes' : 'recap.no')));

  body.appendChild(group(t('recap.group.karma')));
  body.appendChild(row(t('karma.merit'), String(karma.merit)));
  body.appendChild(row(t('karma.demerit'), String(karma.demerit)));
  body.appendChild(row(t('karma.kusala'), String(karma.kusala)));
  body.appendChild(row(t('karma.akusala'), String(karma.akusala)));

  body.appendChild(group(t('recap.group.path')));
  const factors = unlockedFactors();
  body.appendChild(row(t('recap.path.count'), `${factors.length}/8`));
  for (const factor of factors) body.appendChild(row('·', t(factorName(factor.id))));

  body.appendChild(group(t('recap.group.precepts')));
  const kept = getPreceptStatus().filter((status) => status.kept).length;
  body.appendChild(row(t('recap.precepts.count'), `${kept}/5`));

  body.appendChild(group(t('recap.group.memory')));
  body.appendChild(row(t('recap.memory.took'), String(memory.took)));
  body.appendChild(row(t('recap.memory.gave'), String(memory.gave)));
  body.appendChild(row(t('recap.memory.harmed'), String(memory.harmed)));
  body.appendChild(row(t('recap.memory.released'), String(memory.released)));
  body.appendChild(row(t('recap.memory.clung'), String(memory.clung)));
}

function factorName(id) {
  return t(`path.${id}.name`);
}

function openRecap() {
  renderRecap();
  overlay.classList.remove('hidden');
}

export function initRecap() {
  const titleButton = $('#recapBtn');
  const endButton = $('#recapEndBtn');
  if (titleButton) titleButton.addEventListener('click', (e) => { e.target.blur(); openRecap(); });
  if (endButton) endButton.addEventListener('click', (e) => { e.target.blur(); openRecap(); });
  const close = $('#recapClose');
  if (close) close.addEventListener('click', () => overlay.classList.add('hidden'));
  on(EVENTS.LOCALE_CHANGED, () => {
    if (!overlay.classList.contains('hidden')) renderRecap();
  });
}
