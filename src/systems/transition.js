'use strict';

import { state } from '../core/state.js';
import { realmById } from '../content/realms.js';
import { realmFormIds } from './rebirth.js';

/**
 * Changing lives (docs/rebirth-effects.md, docs/next-production-plan.md item 2).
 *
 * A life ends exactly once, and the next one is *reserved* before any of the
 * closing scene is shown: the form, the chapter and the life number are decided,
 * written into the save, and only then applied. Everything else follows from that
 * one rule:
 *
 *   - the same life cannot end twice (the transition is identified by run, life
 *     and kind, and an identical ending is refused),
 *   - skipping the effect, closing the page or loading at any moment leads to the
 *     same next life, because nothing recomputes it,
 *   - a save taken mid-scene carries the reservation (`pendingTransition`), so a
 *     reload resumes the life that was always going to happen.
 *
 * The phases are the doc's: ending → summary → resolving → spawning, then idle.
 * The systems layer owns the state and the save shape; systems/life.js applies the
 * reservation and ui/life-summary.js drives the screen.
 */
const PHASES = Object.freeze(['idle', 'ending', 'summary', 'resolving', 'spawning']);
let loaded = false;

function transition() {
  if (!loaded && !state.transition) {
    // A boot with no transition in the save: this run has nothing pending.
    state.transition = idleTransition();
    loaded = true;
  }
  if (!state.transition) state.transition = idleTransition();
  return state.transition;
}

function idleTransition() {
  return {
    id: null,
    phase: 'idle',
    fromLifeId: null,
    completionId: null,
    next: null,
    runId: state.runId || '',
  };
}

/** The identity of one ending: this run, this life, this kind of ending. */
export function transitionIdFor(lifeId, completionId, runId = state.runId || '') {
  return `${runId}:${lifeId}:${completionId}`;
}

export function transitionPhase() {
  return transition().phase;
}

export function isTransitioning() {
  return transition().phase !== 'idle';
}

/** The reservation, or null when no life is mid-ending. */
export function pendingTransition() {
  const t = transition();
  if (t.phase === 'idle' || !t.next) return null;
  return {
    id: t.id,
    phase: t.phase,
    fromLifeId: t.fromLifeId,
    completionId: t.completionId,
    next: {
      ...t.next,
      candidateIds: t.next.candidateIds ? [...t.next.candidateIds] : null,
      probabilities: t.next.probabilities ? { ...t.next.probabilities } : null,
    },
    runId: t.runId,
  };
}

/** What the next life will be, once it has been reserved. */
export function reservedNextLife() {
  const pending = pendingTransition();
  return pending ? { ...pending.next } : null;
}

/**
 * Reserve the next life and open the transition. Called the moment a life ends;
 * an identical ending (same run, life and kind) is refused, so a double event
 * cannot end one life twice or invent a second rebirth.
 */
export function beginLifeEnd({ lifeId, completionId = 'goal', plan = null } = {}) {
  const t = transition();
  const id = transitionIdFor(lifeId, completionId);
  if (t.phase !== 'idle') return { begun: false, transition: pendingTransition() };
  Object.assign(t, {
    id,
    phase: 'ending',
    fromLifeId: lifeId,
    completionId,
    next: plan ? { ...plan } : null,
    runId: state.runId || '',
  });
  return { begun: true, transition: pendingTransition() };
}

/** Attach the reserved plan if it was not known when the life ended. */
export function reserveNextLife(plan) {
  const t = transition();
  if (!plan) return false;
  if (t.phase === 'idle') return false;
  if (!t.next) t.next = { ...plan };
  return t.next;
}

export function setTransitionPhase(phase) {
  const t = transition();
  if (!PHASES.includes(phase)) return t.phase;
  t.phase = phase;
  return t.phase;
}

/**
 * The player has chosen one of the offered bodies (choice mode). Only a body on
 * offer may be chosen; the choice is written into the reservation so that a reload
 * keeps both the cards and the answer.
 */
export function markChosenBody(formId, probability = null) {
  const t = transition();
  if (t.phase === 'idle' || !t.next) return false;
  if (t.next.chosen === true) return false;
  // A reserved realm also limits choices restored from older saves or passed by
  // callers other than the animal book.
  if (t.next.realmId && !realmFormIds(t.next.realmId, t.next.chapter).includes(formId)) return false;
  // Explore mode uses the book as its picker. Otherwise use the reserved cards.
  if (t.next.explore === true) {
    t.next.formId = formId;
    t.next.chosen = true;
    return true;
  }
  if (!Array.isArray(t.next.candidateIds)) return false;
  if (!t.next.candidateIds.includes(formId)) return false;
  t.next.formId = formId;
  t.next.chosen = true;
  if (Number.isFinite(probability)) t.next.probability = probability;
  return true;
}

/**
 * Is a life waiting for the player to pick a body? True both for the three cards
 * (choice mode) and for the animal book (explore mode) — either way nothing is born
 * until a pick is made.
 */
export function choicePending() {
  const t = transition();
  if (t.phase === 'idle' || !t.next || t.next.chosen === true) return false;
  return Array.isArray(t.next.candidateIds) || t.next.explore === true;
}

/** The reservation has been applied and the new life is in the world. */
export function finishTransition() {
  const t = transition();
  t.id = null;
  t.phase = 'idle';
  t.fromLifeId = null;
  t.completionId = null;
  t.next = null;
  return true;
}

/** A new run starts with nothing pending. */
export function resetTransition(runId = state.runId || '') {
  state.transition = idleTransition();
  state.transition.runId = runId;
  loaded = true;
  return state.transition;
}

/** What goes into the save: the reservation, if there is one. */
export function exportTransition() {
  const pending = pendingTransition();
  if (!pending) return null;
  return { ...pending };
}

/**
 * Read a stored transition back. Anything that cannot be trusted — an unknown
 * phase, a missing or malformed reservation — is dropped rather than resumed.
 */
export function importTransition(raw) {
  loaded = true;
  if (!raw || typeof raw !== 'object') {
    state.transition = idleTransition();
    return false;
  }
  const phase = PHASES.includes(raw.phase) ? raw.phase : null;
  const next = raw.next && typeof raw.next === 'object' ? raw.next : null;
  const valid = phase && phase !== 'idle' && next
    && Number.isFinite(next.lifeId) && Number.isFinite(next.chapter)
    && typeof next.formId === 'string' && next.formId.length > 0;
  if (!valid) {
    state.transition = idleTransition();
    return false;
  }
  const realmId = typeof next.realmId === 'string' && realmById(next.realmId) ? next.realmId : null;
  const allowedIds = realmId ? realmFormIds(realmId, next.chapter) : null;
  const allowed = allowedIds ? new Set(allowedIds) : null;
  const candidates = Array.isArray(next.candidateIds)
    ? [...new Set(next.candidateIds.filter((id) => typeof id === 'string' && id && (!allowed || allowed.has(id))))]
    : null;
  // Older saves may contain a free-picked body from before the realm restriction.
  // Keep the reserved realm and repair the body without re-running the karma draw.
  const formId = allowed && !allowed.has(next.formId) ? allowedIds[0] : next.formId;
  if (!formId) {
    state.transition = idleTransition();
    return false;
  }
  if (candidates && candidates.length === 0 && allowedIds?.length) candidates.push(formId);
  const probabilities = next.probabilities && typeof next.probabilities === 'object'
    ? Object.fromEntries(Object.entries(next.probabilities).filter(([id, value]) =>
      Number.isFinite(value) && (!allowed || allowed.has(id))))
    : null;
  state.transition = {
    id: typeof raw.id === 'string' ? raw.id : transitionIdFor(raw.fromLifeId, raw.completionId, raw.runId),
    phase,
    fromLifeId: Number.isFinite(raw.fromLifeId) ? raw.fromLifeId : null,
    completionId: typeof raw.completionId === 'string' ? raw.completionId : null,
    next: {
      lifeId: next.lifeId,
      chapter: next.chapter,
      formId,
      realmId,
      reasonKey: typeof next.reasonKey === 'string' && next.reasonKey.startsWith('rebirth.reason.') ? next.reasonKey : null,
      // The odds the draw gave this body, kept so the summary can show the real
      // number again after a reload (never recomputed — systems/rebirth.js).
      probability: formId === next.formId && Number.isFinite(next.probability) ? next.probability : null,
      // Choice mode: the three bodies the draw offered, and which one was picked.
      // Kept so a reload shows the same cards and the same selection.
      candidateIds: candidates,
      probabilities,
      chosen: next.chosen === true && formId === next.formId
        && (next.explore === true || Boolean(candidates) && candidates.includes(formId)),
      explore: next.explore === true,
    },
    runId: typeof raw.runId === 'string' ? raw.runId : '',
  };
  return true;
}

export const TRANSITION_PHASES = PHASES;
