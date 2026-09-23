'use strict';

import { FACTORS } from '../content/factors.js';
import { emit, EVENTS, on } from '../core/events.js';
import { getKarmaMemory } from './karma-memory.js';

/** Factors unlocked during this run (session-scoped, like the kamma ledger). */
const unlocked = new Set();

/** Re-check every locked factor against what the run has done. */
export function evaluatePath() {
  const memory = getKarmaMemory();
  for (const factor of FACTORS) {
    if (unlocked.has(factor.id)) continue;
    if (factor.condition(memory)) {
      unlocked.add(factor.id);
      emit(EVENTS.PATH_UNLOCKED, factor.id);
    }
  }
}

export function isUnlocked(id) {
  return unlocked.has(id);
}

export function unlockedFactors() {
  return FACTORS.filter((factor) => unlocked.has(factor.id));
}

export function unlockedCount() {
  return unlocked.size;
}

export function resetPath() {
  unlocked.clear();
}

/** Aggregate the unlocked factors' ways of seeing. */
export function getPathModifiers() {
  const modifiers = { fearRelief: 0, mindDissolve: 1, vision: 0 };
  for (const factor of FACTORS) {
    if (!unlocked.has(factor.id)) continue;
    const effect = factor.effect;
    if (effect.fearRelief) modifiers.fearRelief += effect.fearRelief;
    if (effect.mindDissolve) modifiers.mindDissolve *= effect.mindDissolve;
    if (effect.vision) modifiers.vision += effect.vision;
  }
  return modifiers;
}

export function exportPath() {
  return [...unlocked];
}

export function importPath(ids) {
  unlocked.clear();
  if (!Array.isArray(ids)) return;
  for (const id of ids) if (FACTORS.some((factor) => factor.id === id)) unlocked.add(id);
}

on(EVENTS.KARMA_CHANGED, evaluatePath);
