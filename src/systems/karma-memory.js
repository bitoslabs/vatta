'use strict';

import { getKarma } from './karma.js';

/**
 * Turns the raw kamma ledger into *facts about what this run has done*.
 * Chapters use these to make the world remember the player's conduct, instead
 * of only showing a score. Echoes fire at most once per run.
 */
const fired = new Set();

export function getKarmaMemory() {
  const karma = getKarma();
  const counts = {};
  for (const entry of karma.actions) {
    counts[entry.actionId] = (counts[entry.actionId] || 0) + entry.times;
  }

  return {
    counts,
    gave: counts.give || 0,
    took: counts.steal || 0,
    harmed: counts.harm || 0,
    lied: counts.lie || 0,
    released: counts.letgo || 0,
    clung: counts.cling || 0,
    sat: counts.meditate || 0,
    mindful: counts.mindful || 0,
    panicked: counts.panic || 0,
    merit: karma.merit,
    demerit: karma.demerit,
  };
}

/** True when the run has done more good than harm so far. */
export function isWholesomeRun() {
  const karma = getKarma();
  return karma.merit >= karma.demerit;
}

export function hasEchoFired(id) {
  return fired.has(id);
}

export function markEchoFired(id) {
  fired.add(id);
}

export function resetEchoes() {
  fired.clear();
}

export function exportEchoes() {
  return [...fired];
}

export function importEchoes(ids) {
  fired.clear();
  if (Array.isArray(ids)) for (const id of ids) fired.add(id);
}
