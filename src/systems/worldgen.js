'use strict';

import { state } from '../core/state.js';
import { assembleRooms, buildDynamicWorld, blockedAt, waterAt } from '../world/rooms.js';
import { getForm } from './forms.js';

/**
 * The generated world for the current life and chapter (design §3).
 *
 * The seed is derived from (lifeId, chapterId), so the same life always gives
 * the same map — loading a save restores it exactly, as the design requires,
 * without storing the features themselves.
 */
export function seedFor(chapterId, lifeId = state.lifeId) {
  return ((lifeId * 7919) + (chapterId * 104729) + 20250607) >>> 0;
}

export function initDynamicWorld(chapterId) {
  const seed = seedFor(chapterId);
  const built = buildDynamicWorld(seed, state.formId, getForm().abilities || {});
  state.dynamic = { ...built, seed };
  return state.dynamic;
}

export function dynamicWorld() {
  return state.dynamic || { seed: 0, features: [], validation: null, attempts: 0 };
}

export function dynamicFeatures() {
  return dynamicWorld().features || [];
}

/** Solid dressing the player collides with, given the form's abilities. */
export function dynamicBlockers() {
  const abilities = getForm().abilities || {};
  if (abilities.flying === true) return [];
  return dynamicFeatures().filter((feature) => {
    if (feature.type === 'thicket') return abilities.climbing !== true;
    if (feature.type === 'boulders') return abilities.small !== true;
    return false;
  });
}

export function dynamicWaterAt(x, y) {
  return waterAt(dynamicFeatures(), x, y);
}

export function dynamicBlocked(x, y) {
  return blockedAt(dynamicFeatures(), x, y, getForm().abilities || {});
}

export { assembleRooms };
