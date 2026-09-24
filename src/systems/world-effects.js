'use strict';

import { emit, EVENTS } from '../core/events.js';
import { state } from '../core/state.js';

/**
 * World effects: what one life leaves behind for the next (design §12 step 4,
 * docs/animal-lives-story.md "สิ่งที่ส่งต่อ").
 *
 * An effect is a *named, permanent* change to the shared world — the earthworm
 * opens the root and the soil stays watered for every later body. It is kept
 * apart from the seeded dressing (`state.world.removed`, `state.dynamic`), which
 * belongs to one generated map, so a reborn life always sees its own seed *plus*
 * whatever the previous lives actually did.
 */
export const WORLD_EFFECTS = Object.freeze({
  'root-watered': { key: 'effect.rootWatered', color: '#bfd9cd' },
  'seed-carried': { key: 'effect.seedCarried', color: '#d9c48f' },
  'nest-sheltered': { key: 'effect.nestSheltered', color: '#c9b7dd' },
  'water-opened': { key: 'effect.waterOpened', color: '#9fc6dd' },
  'water-linked': { key: 'effect.waterLinked', color: '#8fd0c4' },
  'night-watched': { key: 'effect.nightWatched', color: '#cbd6ea' },
  'ways-joined': { key: 'effect.waysJoined', color: '#c9b78f' },
  'trust-built': { key: 'effect.trustBuilt', color: '#d8c8b4' },
  'gate-opened': { key: 'effect.gateOpened', color: '#b9c9a8' },
});

/** The effect store, created on demand so old saves need no migration. */
export function worldEffects() {
  if (!state.world || typeof state.world !== 'object') state.world = {};
  if (!state.world.effects || typeof state.world.effects !== 'object') state.world.effects = {};
  return state.world.effects;
}

export function hasEffect(code) {
  return worldEffects()[code] === true;
}

/** Record an effect once. Returns true when this life is the one that did it. */
export function recordEffect(code) {
  if (!WORLD_EFFECTS[code]) return false;
  const store = worldEffects();
  if (store[code] === true) return false;
  store[code] = true;
  emit(EVENTS.EFFECT_RECORDED, code);
  return true;
}

/** Every recorded effect, in registry order, with its display data. */
export function listEffects() {
  const store = worldEffects();
  return Object.entries(WORLD_EFFECTS)
    .filter(([code]) => store[code] === true)
    .map(([code, data]) => ({ code, ...data }));
}

export function effectCount() {
  const store = worldEffects();
  return Object.keys(WORLD_EFFECTS).filter((code) => store[code] === true).length;
}

export function exportEffects() {
  return { ...worldEffects() };
}

export function importEffects(data) {
  state.world.effects = sanitiseEffects(data);
}

/** Keep only known codes that are exactly `true`, so a save cannot invent one. */
export function sanitiseEffects(raw) {
  const clean = {};
  if (!raw || typeof raw !== 'object') return clean;
  for (const code of Object.keys(WORLD_EFFECTS)) {
    if (raw[code] === true) clean[code] = true;
  }
  return clean;
}
