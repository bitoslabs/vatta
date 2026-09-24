'use strict';

import { state } from '../core/state.js';
import { exportKarma, importKarma } from './karma.js';
import { exportEchoes, importEchoes } from './karma-memory.js';
import { exportPath, importPath } from './path.js';
import { exportPrecepts, importPrecepts } from './precepts.js';

const VERSION = 1;
const SLOTS = 3;
const ACTIVE_KEY = 'vimutti.save.active';
const slotKey = (slot) => `vimutti.save.s${slot}`;

let activeSlot = 1;

function emptyStats() {
  return { caught: 0, lost: 0, time: 0, retaliations: 0, looted: 0, clung: 0, selfish: 0, reps: 0 };
}

export function slotCount() {
  return SLOTS;
}

function validSlot(slot) {
  return Number.isInteger(slot) && slot >= 1 && slot <= SLOTS;
}

/** Restore which slot is active (defaults to 1). */
export function initSave() {
  let stored = null;
  try {
    stored = localStorage.getItem(ACTIVE_KEY);
  } catch {
    stored = null;
  }
  const slot = Number.parseInt(stored, 10);
  activeSlot = validSlot(slot) ? slot : 1;
}

export function getActiveSlot() {
  return activeSlot;
}

export function setActiveSlot(slot) {
  if (!validSlot(slot)) return false;
  activeSlot = slot;
  try {
    localStorage.setItem(ACTIVE_KEY, String(slot));
  } catch {
    /* storage may be unavailable — the slot still applies for this session */
  }
  return true;
}

export function snapshot() {
  return {
    v: VERSION,
    savedAt: Date.now(),
    chapter: state.chapter,
    name: state.runName || '',
    realmId: state.realmId,
    liberated: state.liberated,
    stats: { ...state.stats },
    karma: exportKarma(),
    path: exportPath(),
    precepts: exportPrecepts(),
    echoes: exportEchoes(),
  };
}

export function saveRun(slot = activeSlot) {
  if (!validSlot(slot)) return false;
  try {
    localStorage.setItem(slotKey(slot), JSON.stringify(snapshot()));
    return true;
  } catch {
    return false;
  }
}

/** Read + validate a stored slot, or null when absent/corrupt/incompatible. */
export function readSave(slot = activeSlot) {
  if (!validSlot(slot)) return null;
  try {
    const raw = localStorage.getItem(slotKey(slot));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.v !== VERSION || typeof data.chapter !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave(slot = activeSlot) {
  return readSave(slot) !== null;
}

export function clearSave(slot = activeSlot) {
  if (!validSlot(slot)) return;
  try {
    localStorage.removeItem(slotKey(slot));
  } catch {
    /* storage may be unavailable — nothing to clear */
  }
}

/** Name the current run, and persist it if the active slot already holds a save. */
export function setRunName(name) {
  state.runName = String(name || '').slice(0, 24);
  if (hasSave()) saveRun();
  return state.runName;
}

export function getRunName() {
  return state.runName || '';
}

/** Every slot with a light summary, for the title screen's slot list. */
export function listSaves() {
  const slots = [];
  for (let slot = 1; slot <= SLOTS; slot++) {
    const data = readSave(slot);
    slots.push({
      slot,
      filled: data !== null,
      chapter: data ? data.chapter : null,
      name: data && typeof data.name === 'string' ? data.name : '',
      savedAt: data ? data.savedAt : null,
      merit: data && data.karma ? data.karma.merit : 0,
      demerit: data && data.karma ? data.karma.demerit : 0,
      liberated: Boolean(data && data.liberated),
    });
  }
  return slots;
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
  state.runName = typeof data.name === 'string' ? data.name : '';
  state.stats = { ...emptyStats(), ...(data.stats || {}) };
  if (typeof data.realmId === 'string') state.realmId = data.realmId;
  state.liberated = Boolean(data.liberated);
}
