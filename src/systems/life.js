'use strict';

import { state } from '../core/state.js';
import { getKarmaMemory } from './karma-memory.js';
import { getForm, isWaterBound, nextFormId, setForm } from './forms.js';
import { addFloater } from './effects.js';
import { goalFor } from './goals.js';
import { t } from './i18n.js';
import { player } from '../entities/player.js';
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

/** Append this life to the log once, so the mirror courtyard can read it. */
export function recordLife() {
  const summary = summariseLife();
  const already = state.lifeLog.some((entry) => entry.lifeId === summary.lifeId);
  if (!already) state.lifeLog.push(summary);
  return summary;
}

export function getLifeLog() {
  return state.lifeLog;
}

/**
 * The form this run wore most often (design §6, มารกระจก: it offers to keep
 * your favourite form and power forever). Falls back to the current form.
 */
export function favouriteForm() {
  const counts = new Map();
  for (const life of state.lifeLog) {
    counts.set(life.formId, (counts.get(life.formId) || 0) + 1);
  }
  if (!counts.size) return state.formId;
  let best = state.formId;
  let bestCount = 0;
  for (const [id, count] of counts) {
    if (count > bestCount) {
      best = id;
      bestCount = count;
    }
  }
  return best;
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

  if (isWaterBound()) {
    const goal = goalFor();
    addFloater(
      (player.x + goal.x) / 2,
      Math.min(player.y, goal.y) - 120,
      t('life.goal.water'),
      '#9fc6dd',
      15,
    );
  }
  return true;
}
