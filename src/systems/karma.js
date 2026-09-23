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

/** Serialise / restore the whole ledger (used by systems/save.js). */
export function exportKarma() {
  return {
    merit: ledger.merit,
    demerit: ledger.demerit,
    kusala: ledger.kusala,
    akusala: ledger.akusala,
    roots: { ...ledger.roots },
    tendencies: { ...ledger.tendencies },
    actions: ledger.actions.map((entry) => ({ ...entry })),
  };
}

export function importKarma(data) {
  if (!data || typeof data !== 'object') return false;

  ledger.merit = Number(data.merit) || 0;
  ledger.demerit = Number(data.demerit) || 0;
  ledger.kusala = Number(data.kusala) || 0;
  ledger.akusala = Number(data.akusala) || 0;

  ledger.roots = emptyRoots();
  for (const [root, value] of Object.entries(data.roots || {})) {
    if (ledger.roots[root] !== undefined) ledger.roots[root] = Number(value) || 0;
  }

  ledger.tendencies = emptyTendencies();
  for (const [tendency, value] of Object.entries(data.tendencies || {})) {
    if (ledger.tendencies[tendency] !== undefined) ledger.tendencies[tendency] = Number(value) || 0;
  }

  ledger.actions = Array.isArray(data.actions)
    ? data.actions.filter((entry) => entry && typeof entry.actionId === 'string').map((entry) => ({
      actionId: entry.actionId,
      times: Number(entry.times) || 1,
      at: Number(entry.at) || 0,
    }))
    : [];

  emit(EVENTS.KARMA_CHANGED, 'import');
  return true;
}

const TENDENCY_ORDER = ['anger', 'greed', 'delusion', 'clinging'];

/** Unwholesome tendencies accumulated so far, strongest first (only > 0). */
export function rankedTendencies() {
  return TENDENCY_ORDER
    .map((id) => ({ id, value: Math.max(0, ledger.tendencies[id] || 0) }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((entry) => entry.id);
}

/**
 * The strongest remaining unwholesome tendency (อนุสัย), or null when none has
 * been accumulated. Chapters use this to choose the face they show the player.
 */
export function dominantTendencyId() {
  return rankedTendencies()[0] || null;
}
