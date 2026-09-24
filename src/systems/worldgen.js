'use strict';

import { state } from '../core/state.js';
import { assembleRooms, buildDynamicWorld, blockedAt, waterAt } from '../world/rooms.js';
import { getForm } from './forms.js';
import { currentBiomeId } from './biome.js';
import { hasEffect } from './world-effects.js';

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

/**
 * How the current body meets this world: its own tools, plus what earlier lives
 * left behind. Once the earthworm has watered the root, the soil stays soft for
 * every later body — the design's "one life changes the next" (see
 * systems/world-effects.js).
 */
export function worldAbilities() {
  const abilities = { ...(getForm().abilities || {}) };
  if (hasEffect('root-watered')) abilities.burrow = true;
  return abilities;
}

export function initDynamicWorld(chapterId) {
  const seed = seedFor(chapterId);
  const built = buildDynamicWorld(seed, state.formId, worldAbilities(), currentBiomeId());
  // Anything lifted away in an earlier life stays away.
  const removed = new Set(state.world.removed || []);
  built.features = built.features.filter((feature) => !removed.has(feature.i));
  state.dynamic = { ...built, seed };
  return state.dynamic;
}

/**
 * Lift one feature out of the world for good (the asura's strength). Root and
 * soil are marked `fixed`: what holds the world's shape cannot be lifted away.
 */
export function removeFeature(index) {
  if (!Number.isInteger(index)) return false;
  const target = dynamicFeatures().find((feature) => feature.i === index);
  if (!target || target.fixed === true) return false;
  if (!state.world.removed.includes(index)) state.world.removed.push(index);
  state.dynamic.features = dynamicFeatures().filter((feature) => feature.i !== index);
  return true;
}

export function dynamicWorld() {
  return state.dynamic || { seed: 0, features: [], validation: null, attempts: 0 };
}

export function dynamicFeatures() {
  return dynamicWorld().features || [];
}

/** Solid dressing the player collides with, given the form's abilities. */
export function dynamicBlockers() {
  const abilities = worldAbilities();
  if (abilities.flying === true) return [];
  return dynamicFeatures().filter((feature) => {
    if (feature.type === 'burrow') return abilities.burrow !== true;
    if (feature.type === 'thicket') return abilities.climbing !== true;
    if (feature.type === 'boulders') return abilities.small !== true;
    return false;
  });
}

export function dynamicWaterAt(x, y) {
  return waterAt(dynamicFeatures(), x, y);
}

export function dynamicBlocked(x, y) {
  return blockedAt(dynamicFeatures(), x, y, worldAbilities());
}

export { assembleRooms };
