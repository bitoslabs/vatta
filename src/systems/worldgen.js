'use strict';

import { state } from '../core/state.js';
import { assembleRooms, buildDynamicWorld, blockedAt, waterAt } from '../world/rooms.js';
import { getForm } from './forms.js';
import { currentBiomeId, currentMapId } from './biome.js';
import { hasEffect } from './world-effects.js';
import { isLowTide } from './tide.js';
import { isDamp } from './moisture.js';
import { isLit } from './light.js';
import { hasEffect as hasWorldEffect } from './world-effects.js';

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
 * left behind — the design's "one life changes the next" (see
 * systems/world-effects.js).
 */
export function worldAbilities() {
  const abilities = { ...(getForm().abilities || {}) };
  // What earlier lives did stays done: watered soil lets any body tunnel, and a
  // widened crevice lets any body through the stone (systems/world-effects.js).
  if (hasEffect('root-watered')) abilities.burrow = true;
  if (hasEffect('water-linked')) abilities.slither = true;
  // The tide's door: at low water the flooded channel is shallow enough to wade,
  // and once a life has kept the channel clear it stays that way for everyone.
  if (isLowTide() || hasEffect('channel-kept')) abilities.crossCauseway = true;
  // The ground's dampness: a dry ridge is ordinary ground while it is damp, and a
  // trail an earlier life left keeps it that way for good.
  if (isDamp() || hasEffect('damp-trail')) abilities.dampGround = true;
  // The garden's light: the shadow over its gate is crossable only while the light
  // is on it (systems/light.js) — the fastest of the world's rhythms.
  if (isLit()) abilities.lightLit = true;
  // The swarm a firefly lit: the mist at the swarm field guides every body through
  // it from that life on (game/firefly.js).
  if (hasWorldEffect('swarm-lit')) abilities.swarmGuide = true;
  // What this life is carrying: the market alley's gate lets empty hands through
  // and its curtains open on heavier ones (game/market.js). Read straight from the
  // state so the systems layer keeps no dependency on the game layer.
  abilities.carryCount = Array.isArray(state.market?.carried) ? state.market.carried.length : 0;
  return abilities;
}

/** How much driftwood the world is carrying: none, once a life tended the river. */
export function worldSnags() {
  if (hasWorldEffect('river-tended')) return 0;
  return Array.isArray(state.world.snags) ? state.world.snags.length : 0;
}

export function initDynamicWorld(chapterId) {
  const seed = seedFor(chapterId);
  const built = buildDynamicWorld(seed, state.formId, worldAbilities(), currentBiomeId(), {
    snags: worldSnags(),
    pollinated: hasWorldEffect('forest-pollinated'),
    // Bridges a past life dragged into place stand for everyone.
    planks: Array.isArray(state.world.planks) ? state.world.planks : [],
    // Ground an earlier life rooted open or ate bare, and soil it turned.
    dug: Array.isArray(state.world.dug) ? state.world.dug : [],
    turned: hasWorldEffect('soil-turned'),
    // Stones a past life laid back over the city's broken gate.
    spans: Array.isArray(state.world.spans) ? state.world.spans : [],
    // Threads a past life spun across the web's fissure (game/spider.js).
    webs: Array.isArray(state.world.webs) ? state.world.webs : [],
    // How far a past life pushed the big seed (game/beetle.js).
    pushes: Number.isFinite(state.world.pushes) ? state.world.pushes : 0,
    // Bloom beds a past life released, and the seeds those beds sent travelling.
    releasedBeds: Array.isArray(state.world.released) ? state.world.released : [],
    releasedSeeds: hasWorldEffect('seeds-released'),
    // The market does not put its first curtain across the way once a life has
    // passed its gate with empty hands.
    loosed: hasWorldEffect('hands-emptied'),
  });
  // Anything lifted away in an earlier life stays away.
  const removed = new Set(state.world.removed || []);
  built.features = built.features.filter((feature) => !removed.has(feature.i));
  state.dynamic = { ...built, seed, mapId: currentMapId() };
  return state.dynamic;
}

/**
 * Lift one feature out of the world for good (the asura's strength, the
 * elephant's care). Root and soil are marked `fixed`: what holds the world's
 * shape cannot be lifted away — only what carries `liftable` can (the fallen
 * log, see world/rooms.js#assembleGrove).
 */
export function removeFeature(index) {
  if (!Number.isInteger(index)) return false;
  const target = dynamicFeatures().find((feature) => feature.i === index);
  if (!target || (target.fixed === true && target.liftable !== true)) return false;
  if (!state.world.removed.includes(index)) state.world.removed.push(index);
  state.dynamic.features = dynamicFeatures().filter((feature) => feature.i !== index);
  return true;
}

/**
 * Take one feature out of this world for good: the boar's digging (`diggable`
 * ground) and the garden's released bloom bed (`releasable`). Unlike
 * `removeFeature`, this is for features that are `fixed` — packed earth, roots and
 * a flowering bed cannot be lifted away, only broken open or let go. The caller
 * records *where* it happened (`state.world.dug`, `state.world.released`), because
 * indices do not survive into the next seed.
 */
export function digFeature(index) {
  if (!Number.isInteger(index)) return false;
  const target = dynamicFeatures().find((feature) => feature.i === index);
  if (!target || (target.diggable !== true && target.releasable !== true)) return false;
  state.dynamic.features = dynamicFeatures().filter((feature) => feature.i !== index);
  return true;
}

/** The next free feature index, for a feature a life adds to this world. */
export function nextFeatureIndex() {
  let next = 0;
  for (const feature of dynamicFeatures()) next = Math.max(next, (feature.i || 0) + 1);
  return next;
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
