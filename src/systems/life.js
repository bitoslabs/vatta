'use strict';

import { state } from '../core/state.js';
import { getKarmaMemory } from './karma-memory.js';
import { getForm, nextFormId, setForm } from './forms.js';
import { CHAPTERS, loadChapter } from '../game/chapters.js';

/** The first prototype slice: three connected lives (design §12). */
export const PROTOTYPE_LIVES = 3;

export function isLifeMode() {
  return state.lifeMode === true;
}

export function lifeForm() {
  return getForm();
}

/** Begin the multi-life prototype with a human life in chapter one. */
export function startLifeMode(chapterId = CHAPTERS[0].id) {
  state.lifeMode = true;
  state.lifeId = 1;
  state.formHistory = ['human'];
  setForm('human');
  loadChapter(chapterId);
}

/** What this life did, read from what kamma remembers (design §2 summary). */
export function summariseLife() {
  const memory = getKarmaMemory();
  return {
    lifeId: state.lifeId,
    formId: state.formId,
    helped: memory.gave > 0,
    held: memory.clung > 0,
    changed: memory.released > 0,
    merit: memory.merit,
    demerit: memory.demerit,
  };
}

export function isPrototypeComplete() {
  return state.lifeId >= PROTOTYPE_LIVES;
}

/**
 * End this life and begin the next: a new form, the next chapter, and the same
 * kamma carried across (loadChapter resets per-chapter state, not the ledger).
 */
export function advanceLife() {
  if (!isLifeMode()) return false;
  state.lifeId += 1;

  const next = nextFormId();
  setForm(next);
  state.formHistory.push(next);

  const index = (state.lifeId - 1) % CHAPTERS.length;
  loadChapter(CHAPTERS[index].id);
  return true;
}
