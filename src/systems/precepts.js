'use strict';

import { PRECEPTS } from '../content/precepts.js';
import { emit, EVENTS, on } from '../core/events.js';
import { getKarmaMemory } from './karma-memory.js';

/** Precepts broken so far this run — used to announce each one only once. */
const broken = new Set();

export function evaluatePrecepts() {
  const memory = getKarmaMemory();
  for (const precept of PRECEPTS) {
    const count = memory.counts[precept.action] || 0;
    if (count > 0 && !broken.has(precept.id)) {
      broken.add(precept.id);
      emit(EVENTS.PRECEPT_BROKEN, precept.id);
    }
  }
}

/** Descriptive status: how often each precept was broken (0 = still kept). */
export function getPreceptStatus() {
  const memory = getKarmaMemory();
  return PRECEPTS.map((precept) => {
    const count = memory.counts[precept.action] || 0;
    return { id: precept.id, count, kept: count === 0 };
  });
}

export function keptPreceptCount() {
  return getPreceptStatus().filter((status) => status.kept).length;
}

export function isPreceptBroken(id) {
  return broken.has(id);
}

export function resetPrecepts() {
  broken.clear();
}

export function exportPrecepts() {
  return [...broken];
}

export function importPrecepts(ids) {
  broken.clear();
  if (!Array.isArray(ids)) return;
  for (const id of ids) if (PRECEPTS.some((precept) => precept.id === id)) broken.add(id);
}

on(EVENTS.KARMA_CHANGED, evaluatePrecepts);
