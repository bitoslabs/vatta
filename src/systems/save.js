'use strict';

import { state } from '../core/state.js';
import { exportKarma, importKarma } from './karma.js';
import { exportEchoes, importEchoes } from './karma-memory.js';
import { exportPath, importPath } from './path.js';
import { exportPrecepts, importPrecepts } from './precepts.js';

const KEY = 'vimutti.save.v1';
const VERSION = 1;

function emptyStats() {
  return { caught: 0, lost: 0, time: 0, retaliations: 0, looted: 0, clung: 0, selfish: 0, reps: 0 };
}

export function snapshot() {
  return {
    v: VERSION,
    savedAt: Date.now(),
    chapter: state.chapter,
    realmId: state.realmId,
    liberated: state.liberated,
    stats: { ...state.stats },
    karma: exportKarma(),
    path: exportPath(),
    precepts: exportPrecepts(),
    echoes: exportEchoes(),
  };
}

export function saveRun() {
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot()));
    return true;
  } catch {
    return false;
  }
}

/** Read + validate the stored snapshot, or null when absent/corrupt/incompatible. */
export function readSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.v !== VERSION || typeof data.chapter !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  return readSave() !== null;
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage may be unavailable — nothing to clear */
  }
}

/**
 * Apply the parts that must exist *before* a chapter loads, so the chapter
 * derives its plane, path and precepts from the restored conduct.
 */
export function applySaveMeta(data) {
  if (!data) return false;
  importKarma(data.karma);
  importPath(data.path);
  importPrecepts(data.precepts);
  importEchoes(data.echoes);
  return true;
}

/** Apply the parts that loadChapter resets (chapter, stats, realm, liberation). */
export function applySaveRuntime(data) {
  if (!data) return;
  if (typeof data.chapter === 'number') state.chapter = data.chapter;
  state.stats = { ...emptyStats(), ...(data.stats || {}) };
  if (typeof data.realmId === 'string') state.realmId = data.realmId;
  state.liberated = Boolean(data.liberated);
}
