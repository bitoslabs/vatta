'use strict';

import { state } from '../core/state.js';
import { getKarmaMemory } from './karma-memory.js';
import { getForm, isWaterBound, setForm } from './forms.js';
import { planNextLife } from './life-route.js';
import { addFloater } from './effects.js';
import { goalFor } from './goals.js';
import { t } from './i18n.js';
import { player } from '../entities/player.js';
import { CHAPTERS, loadChapter } from '../game/chapters.js';

/** The first prototype slice: three connected lives (design §12). */
export const PROTOTYPE_LIVES = 3;
/** After this many lives the courtyard begins advising, without forcing (§8). */
export const GUIDED_LIVES = 6;

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
  state.lifeLog = [];
  state.journeyComplete = false;
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
  return state.chapter === CHAPTERS.at(-1).id && journeyReadiness().ready;
}

export function nextLifePlan() {
  return planNextLife({ chapter: state.chapter, lifeId: state.lifeId,
    history: state.formHistory, chapterIds: CHAPTERS.map(chapter => chapter.id) });
}

/**
 * Readiness for the final chapter (design §8): the journey must have *met* fear,
 * anger, craving and clinging, returned something, helped someone and released
 * something — not merely accumulated points.
 */
export function journeyReadiness() {
  const memory = getKarmaMemory();
  const counts = memory.counts || {};
  const conditions = [
    { id: 'fear', ok: memory.sat >= 1 || memory.panicked >= 1 },
    { id: 'anger', ok: memory.harmed >= 1 || (counts.compassion || 0) >= 1 },
    { id: 'craving', ok: memory.took >= 1 || memory.gave >= 1 },
    { id: 'clinging', ok: memory.clung >= 1 || memory.released >= 1 },
    { id: 'returned', ok: memory.gave >= 1 },
    { id: 'helped', ok: memory.gave >= 2 },
    { id: 'released', ok: memory.released >= 1 },
  ];
  const missing = conditions.filter((condition) => !condition.ok).map((condition) => condition.id);
  return { conditions, missing, ready: missing.length === 0 };
}

export function isJourneyComplete() {
  return state.journeyComplete === true;
}

export function recordJourneyComplete() {
  state.journeyComplete = true;
}

/**
 * End this life and begin the next: a new form, the next chapter, and the same
 * kamma carried across (loadChapter resets per-chapter state, not the ledger).
 */
export function advanceLife() {
  if (!isLifeMode() || state.liberated || state.journeyComplete) return false;
  const next = nextLifePlan();
  state.lifeId = next.lifeId;
  setForm(next.formId);
  state.formHistory.push(next.formId);
  loadChapter(next.chapter);

  // A life whose end is not the temple is told where it can go (systems/goals.js).
  const form = getForm();
  const lifeGoal = isWaterBound() ? 'water' : (form.lifeGoal || 'land');
  const hint = {
    water: { key: 'life.goal.water', color: '#9fc6dd' },
    seed: { key: 'life.goal.burrow', color: '#c9a97a' },
    nest: { key: 'life.goal.nest', color: '#d7bd8c' },
    crevice: { key: 'life.goal.crevice', color: '#8fd0c4' },
    storm: { key: 'life.goal.storm', color: '#d9c48f' },
    watch: { key: 'life.goal.watch', color: '#cbd6ea' },
    grove: { key: 'life.goal.grove', color: '#c9b78f' },
    trail: { key: 'life.goal.trail', color: '#d8c8b4' },
    enclosure: { key: 'life.goal.enclosure', color: '#b9c9a8' },
  }[lifeGoal];
  if (hint) {
    const goal = goalFor();
    addFloater(
      (player.x + goal.x) / 2,
      Math.min(player.y, goal.y) - 120,
      t(hint.key),
      hint.color,
      15,
    );
  }
  return true;
}
