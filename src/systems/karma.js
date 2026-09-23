'use strict';

import { KARMA_ACTIONS, KARMA_ROOTS, ROOT_IDS, TENDENCIES } from '../content/karma-actions.js';
import { emit, EVENTS } from '../core/events.js';

function emptyTendencies() {
  const tendencies = {};
  for (const key of TENDENCIES) tendencies[key] = 0;
  return tendencies;
}

function emptyRoots() {
  const roots = {};
  for (const key of ROOT_IDS) roots[key] = 0;
  return roots;
}

/**
 * Kamma is cumulative for the whole run (saṃsāra), not per chapter:
 * every intention leaves a trace that ripens at rebirth.
 */
const ledger = {
  merit: 0,
  demerit: 0,
  kusala: 0,
  akusala: 0,
  roots: emptyRoots(),
  tendencies: emptyTendencies(),
  actions: [],
};

export function resetKarma() {
  ledger.merit = 0;
  ledger.demerit = 0;
  ledger.kusala = 0;
  ledger.akusala = 0;
  ledger.roots = emptyRoots();
  ledger.tendencies = emptyTendencies();
  ledger.actions = [];
}

/** Record an intention. Returns false when the action id is unknown. */
export function recordKarma(actionId, times = 1) {
  const def = KARMA_ACTIONS[actionId];
  if (!def) return false;

  ledger.merit += (def.merit || 0) * times;
  ledger.demerit += (def.demerit || 0) * times;

  if (def.root === 'kusala') ledger.kusala += times;
  else ledger.akusala += times;

  if (def.rootId && ledger.roots[def.rootId] !== undefined) {
    ledger.roots[def.rootId] += times;
  }

  for (const [tendency, weight] of Object.entries(def.tendencies || {})) {
    ledger.tendencies[tendency] = (ledger.tendencies[tendency] || 0) + weight * times;
  }

  ledger.actions.push({ actionId, times, at: Date.now() });
  emit(EVENTS.KARMA_CHANGED, actionId);
  return true;
}

export function getKarma() {
  return ledger;
}

/** Recorded roots, strongest first, with their group — for UI / codex. */
export function activeRoots() {
  return ROOT_IDS
    .map((id) => ({ id, count: ledger.roots[id] || 0, ...KARMA_ROOTS[id] }))
    .filter((root) => root.count > 0)
    .sort((a, b) => b.count - a.count);
}
