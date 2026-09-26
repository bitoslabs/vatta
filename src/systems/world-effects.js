'use strict';

import { emit, EVENTS } from '../core/events.js';
import { state } from '../core/state.js';
import { GATE_OUT } from '../core/constants.js';
import {
  ASURA, BOAR, BLOOMS, BURROW, CAVE, CREVICE, DAMP, DEER, ENCLOSURE, FIELD, FORD, GARDEN, GROVE, MARSH,
  FISH, NEST, OTTER, OWL, PUSH, SEEDS, SIGNAL, TIDE, TRAIL, WARM_STONE, WEB, marketInside,
} from '../world/world-data.js';

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
  // `site` is the place a leaving stands: the world book (ui/codex.js) reads it to
  // say *where* a past life left something, and to walk the player back there.
  // Each site is the one whose own module records the effect (see src/game/*.js).
  'root-watered': {
    key: 'effect.rootWatered', consequenceKey: 'effect.rootWatered.consequence',
    color: '#bfd9cd', site: 'burrow',
  },
  'seed-carried': { key: 'effect.seedCarried', consequenceKey: 'effect.seedCarried.consequence', color: '#d9c48f', site: 'nest' },
  'runoff-drained': { key: 'effect.runoffDrained', consequenceKey: 'effect.runoffDrained.consequence', color: '#9fcad6', site: 'drain' },
  'fry-guided': { key: 'effect.fryGuided', consequenceKey: 'effect.fryGuided.consequence', color: '#a7d5d5', site: 'fish-channel' },
  'herd-sheltered': { key: 'effect.herdSheltered', consequenceKey: 'effect.herdSheltered.consequence', color: '#bad3a7', site: 'deer-herd' },
  'nest-sheltered': { key: 'effect.nestSheltered', consequenceKey: 'effect.nestSheltered.consequence', color: '#c9b7dd', site: 'field' },
  'water-opened': { key: 'effect.waterOpened', consequenceKey: 'effect.waterOpened.consequence', color: '#9fc6dd', site: 'marsh' },
  'eggs-shaded': { key: 'effect.eggsShaded', consequenceKey: 'effect.eggsShaded.consequence', color: '#cfe0b4', site: 'marsh' },
  'water-linked': { key: 'effect.waterLinked', color: '#8fd0c4', site: 'crevice' },
  'night-watched': { key: 'effect.nightWatched', color: '#cbd6ea', site: 'owl' },
  'ways-joined': { key: 'effect.waysJoined', color: '#c9b78f', site: 'grove' },
  'trust-built': { key: 'effect.trustBuilt', color: '#d8c8b4', site: 'trail' },
  'gate-opened': { key: 'effect.gateOpened', color: '#b9c9a8', site: 'enclosure' },
  'echo-shared': { key: 'effect.echoShared', color: '#cbd6ea', site: 'cave' },
  'seeds-scattered': { key: 'effect.seedsScattered', color: '#bfd0a0', site: 'seeds' },
  'channel-kept': { key: 'effect.channelKept', consequenceKey: 'effect.channelKept.consequence', color: '#9fc6dd', site: 'tide' },
  'river-tended': { key: 'effect.riverTended', color: '#9fd6b8', site: 'otter' },
  'forest-pollinated': { key: 'effect.forestPollinated', color: '#e0c8a0', site: 'blooms' },
  'hearths-respected': { key: 'effect.hearthsRespected', color: '#d8c8a8', site: 'homes' },
  'ford-bridged': { key: 'effect.fordBridged', color: '#c9a97a', site: 'ford' },
  'damp-trail': { key: 'effect.dampTrail', consequenceKey: 'effect.dampTrail.consequence', color: '#a8c6b4', site: 'damp' },
  'soil-turned': { key: 'effect.soilTurned', color: '#c2a878', site: 'boar' },
  'span-built': { key: 'effect.spanBuilt', color: '#b9c3d0', site: 'asura' },
  'seeds-released': { key: 'effect.seedsReleased', color: '#e6d8a8', site: 'garden' },
  'visitor-guided': { key: 'effect.visitorGuided', consequenceKey: 'effect.visitorGuided.consequence', color: '#e6d8a8', site: 'garden' },
  'hands-emptied': { key: 'effect.handsEmptied', color: '#e9c46a', site: 'market' },
  'offer-shared': { key: 'effect.offerShared', consequenceKey: 'effect.offerShared.consequence', color: '#bfd9cd', site: 'market' },
  'friend-kept': { key: 'effect.friendKept', color: '#e6d8a8', site: 'gate' },
  'web-spun': { key: 'effect.webSpun', color: '#cfd8e6', site: 'web' },
  'swarm-lit': { key: 'effect.swarmLit', color: '#f0e0a8', site: 'signal' },
  'trench-bridged': { key: 'effect.trenchBridged', color: '#c9b78f', site: 'push' },
});

/**
 * Where each site stands, so the world book can walk the player back to a leaving.
 * Read from the site constants rather than written down twice.
 */
export function sitePlaces() {
  return {
    burrow: { x: BURROW.chamber.x, y: BURROW.chamber.y },
    nest: { x: NEST.chamber.x, y: NEST.chamber.y },
    drain: { x: NEST.drain.x, y: NEST.drain.y },
    'fish-channel': { x: FISH.channel.x, y: FISH.channel.y },
    'deer-herd': { x: DEER.herd.x, y: DEER.herd.y },
    field: { x: FIELD.meadow.x, y: FIELD.meadow.y },
    marsh: { x: MARSH.bank.x, y: MARSH.bank.y },
    crevice: { x: CREVICE.spring.x, y: CREVICE.spring.y },
    owl: { x: OWL.roost.x, y: OWL.roost.y },
    grove: { x: GROVE.grove.x, y: GROVE.grove.y },
    trail: { x: TRAIL.hollow.x, y: TRAIL.hollow.y },
    enclosure: { x: ENCLOSURE.center.x, y: ENCLOSURE.center.y },
    cave: { x: CAVE.center.x, y: CAVE.center.y },
    seeds: { x: SEEDS.cache.x, y: SEEDS.cache.y },
    tide: { x: TIDE.home.x, y: TIDE.home.y },
    otter: { x: OTTER.holt.x, y: OTTER.holt.y },
    blooms: { x: BLOOMS.hive.x, y: BLOOMS.hive.y },
    homes: { x: WARM_STONE.x, y: WARM_STONE.y },
    ford: { x: FORD.log.x, y: FORD.log.y },
    damp: { x: DAMP.garden.x, y: DAMP.garden.y },
    boar: { x: BOAR.feed.x, y: BOAR.feed.y },
    asura: { x: ASURA.shrine.x, y: ASURA.shrine.y },
    garden: { x: GARDEN.center.x, y: GARDEN.center.y },
    market: { x: marketInside().x, y: marketInside().y },
    gate: { x: GATE_OUT.x, y: GATE_OUT.y },
    web: { x: WEB.anchorIn.x, y: WEB.anchorIn.y },
    signal: { x: SIGNAL.stone.x, y: SIGNAL.stone.y },
    push: { x: PUSH.socket.x, y: PUSH.socket.y },
  };
}

/**
 * The leavings: one entry per effect, in the order lives left them. This is the
 * "memory you can play" — the world book shows it, and the player can walk back to
 * any of them (state.waypoint). Only the *first* life to leave something is the one
 * named; later lives inherit it, which is the whole point of a shared world.
 */
export function leavings() {
  if (!state.world || typeof state.world !== 'object') state.world = {};
  if (!Array.isArray(state.world.leavings)) state.world.leavings = [];
  return state.world.leavings;
}

/** Keep only entries whose effect is known and whose numbers are real. */
export function sanitiseLeavings(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const clean = [];
  for (const entry of raw) {
    if (!entry || typeof entry.code !== 'string' || !WORLD_EFFECTS[entry.code]) continue;
    if (seen.has(entry.code)) continue;
    seen.add(entry.code);
    clean.push({
      code: entry.code,
      lifeId: Number.isFinite(entry.lifeId) ? entry.lifeId : null,
      formId: typeof entry.formId === 'string' ? entry.formId : null,
      chapter: Number.isFinite(entry.chapter) ? entry.chapter : null,
    });
    if (clean.length >= 40) break;
  }
  return clean;
}

/** Recover effects from older saves without inventing a source life. */
export function completeLeavings(raw, effects) {
  const known = sanitiseLeavings(raw).filter((entry) => effects?.[entry.code] === true);
  const seen = new Set(known.map((entry) => entry.code));
  for (const code of Object.keys(WORLD_EFFECTS)) {
    if (effects?.[code] === true && !seen.has(code)) {
      known.push({ code, lifeId: null, formId: null, chapter: null });
    }
  }
  return known;
}

/** The effect store, created on demand so old saves need no migration. */
export function worldEffects() {
  if (!state.world || typeof state.world !== 'object') state.world = {};
  if (!state.world.effects || typeof state.world.effects !== 'object') state.world.effects = {};
  return state.world.effects;
}

export function hasEffect(code) {
  return worldEffects()[code] === true;
}

/** An effect applies as an inheritance only after the life that first left it. */
export function inheritedEffect(code) {
  if (!hasEffect(code)) return false;
  const source = leavings().find((entry) => entry.code === code);
  // Older saves may know the effect without knowing which life left it.
  return !source || source.lifeId === null || source.lifeId !== state.lifeId;
}

/**
 * Record an effect once. Returns true when this life is the one that did it — and
 * that first life is written into the leavings, so the world book can name who left
 * what, for the lives that inherit it.
 */
export function recordEffect(code) {
  if (!WORLD_EFFECTS[code]) return false;
  const store = worldEffects();
  if (store[code] === true) return false;
  store[code] = true;
  leavings().push({
    code,
    lifeId: Number.isFinite(state.lifeId) ? state.lifeId : null,
    formId: typeof state.formId === 'string' ? state.formId : null,
    chapter: Number.isFinite(state.chapter) ? state.chapter : null,
  });
  emit(EVENTS.EFFECT_RECORDED, code);
  return true;
}

/** The leavings with their place and display data resolved, newest last. */
export function leavingList() {
  const places = sitePlaces();
  return leavings().map((entry) => {
    const data = WORLD_EFFECTS[entry.code] || {};
    const place = data.site ? places[data.site] : null;
    return { ...entry, site: data.site || null, place, color: data.color,
      key: data.key, consequenceKey: data.consequenceKey || null };
  });
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
