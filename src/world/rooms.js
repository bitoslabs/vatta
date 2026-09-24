'use strict';

import { TAU, TEMPLE, SALA, WORLD } from '../core/constants.js';
import { dist, distToPoly } from '../core/math.js';
import { mulberry32 } from '../core/rng.js';
import {
  ASURA, ASURA_KEEPOUTS, asuraGate, GARDEN, GARDEN_KEEPOUTS, gardenGate,
  MARKET, MARKET_KEEPOUTS, marketFar, marketGate, marketInside,
  BLOOMS, BLOOMS_APPROACH, BLOOMS_KEEPOUTS, BOAR, BOAR_KEEPOUTS, DAMP, DAMP_APPROACH, DAMP_KEEPOUTS,
  FORD, FORD_APPROACH, FORD_KEEPOUTS, fordBridge,
  HOMES, HOMES_APPROACH, HOMES_KEEPOUTS,
  HOME_WALL_RADIUS, WARM_STONE,
  BURROW, BURROW_KEEPOUT, CREVICE, CREVICE_APPROACH, CREVICE_KEEPOUT,
  SEEDS, SEEDS_APPROACH, SEEDS_KEEPOUTS,
  TIDE, TIDE_APPROACH, TIDE_KEEPOUTS,
  ENCLOSURE, ENCLOSURE_APPROACH, ENCLOSURE_KEEPOUTS,
  FIELD, FIELD_APPROACH, FIELD_KEEPOUTS, GROVE, GROVE_APPROACH, GROVE_KEEPOUTS,
  MARSH, MARSH_APPROACH, MARSH_KEEPOUT, MARSH_PONDS,
  NEST, NEST_KEEPOUT, RIVER, RIVER_WIDTH, routeForPlane,
} from './world-data.js';
import { PATH_WIDTH } from '../core/constants.js';
import { BIOMES } from '../content/biomes.js';

/**
 * Dynamic rooms: a fixed skeleton with seed-varied dressing (design §3).
 *
 * Instead of authoring one map, we assemble obstacle clusters along the true
 * path from a seed, then **validate that the assembled world is traversable for
 * the form in play** — the design's guard against unwinnable maps. If a seed
 * fails, another is tried, and an empty (trivially valid) set is the fallback.
 */
export const FEATURE_TYPES = Object.freeze(['thicket', 'boulders', 'pond', 'clearing']);

/** Dressing kinds added by the planes of design §7. */
export const BIOME_FEATURE_TYPES = Object.freeze(['tower', 'bridge', 'bloom', 'stall', 'weir']);

/**
 * Dressing kinds added by the soil under the great root (docs/animal-lives-story.md
 * ch.2): `rootwall` is hard root nobody passes, `burrow` is soft soil only a
 * tunnelling body passes, `pebble` is loose stone that blocks no one.
 */
export const BURROW_FEATURE_TYPES = Object.freeze(['rootwall', 'burrow', 'pebble']);

/**
 * The nest's own kind: `crack` is a gap a small body slips through and every
 * other body is stopped by (docs/animal-lives-story.md ch.3).
 */
export const NEST_FEATURE_TYPES = Object.freeze(['crack']);

/**
 * The marsh's own kind: `mire` is deep mud and standing water that only a body
 * able to leap crosses — tunnelling into it or being small does not help
 * (docs/animal-lives-story.md ch.4).
 */
export const MARSH_FEATURE_TYPES = Object.freeze(['mire']);

/**
 * The crevice's own kind: `crevice` is a slot in stone that only a body able to
 * flatten itself slips through — being small or being able to tunnel is not
 * enough (docs/animal-lives-story.md ch.6).
 */
export const CREVICE_FEATURE_TYPES = Object.freeze(['crevice']);

/**
 * The field's own kind: `gully` is a washed-out channel a leaping body crosses —
 * it is a line, not a ring, so it divides the field rather than sealing a place
 * (docs/animal-lives-story.md ch.10).
 */
export const FIELD_FEATURE_TYPES = Object.freeze(['gully']);

/**
 * The grove's own kinds (docs/animal-lives-story.md ch.11): `log` is a fallen
 * trunk nobody passes until a strong body lifts it, and `crawlway` is the gap
 * beneath it that only a small body slips through — the same wall, two ways.
 */
export const GROVE_FEATURE_TYPES = Object.freeze(['log', 'crawlway']);

/**
 * The enclosure's own kind (reserve table, จิ้งจก): `wall` is sheer stone that
 * nothing walks over but a clinging body can climb — the gate in it is a wall
 * too, and the only wall that can be opened, from the inside (game/gecko.js).
 */
export const ENCLOSURE_FEATURE_TYPES = Object.freeze(['wall']);

/**
 * The seed trees' own kind (reserve table, กระรอก): `canopy` is a crown that only
 * a climbing body gets into. A walker passes underneath it and finds nothing,
 * because the seeds are up there.
 */
export const SEEDS_FEATURE_TYPES = Object.freeze(['canopy']);

/**
 * The tide's own kind (reserve table, ปู): `flood` is the channel the river runs
 * through. At high water it is deep — passable only to a body that swims deep; at
 * low water anyone can wade across. `crossCauseway` (systems/worldgen.js) is what
 * the world grants when the water is out, or to every body at all once a life has
 * kept the channel shallow for good.
 */
export const TIDE_FEATURE_TYPES = Object.freeze(['flood']);

/**
 * Driftwood that snagged (reserve table, นาก): a jam across the channel, which is
 * what the river does with anything a life leaves in it. Solid to everyone, and
 * only there at all because a previous life did not tend the water
 * (`state.world.snags`, game/otter.js).
 */
export const SNAG_FEATURE_TYPES = Object.freeze(['snag']);

/**
 * The cat's walls (reserve table, แมว): a low wall beside each home, which is the
 * cat's door — it climbs up and looks in from above instead of walking in. The
 * wall is the same hard stone as everywhere else, so `cling` is the only way onto
 * it and the game gates the peering on the tool as well (game/cat.js).
 */
export const HOMES_FEATURE_TYPES = Object.freeze(['wall']);

/**
 * The ford's own kinds (story table ch.11, ควาย): `mud` is ground you cross slowly
 * unless you wade (systems/terrain.js), and `plank` is the log a buffalo dragged
 * across the chasm — not a wall, but the one thing that makes the chasm crossable
 * for every body. `plank` overrides the chasm under it (blockedAt below).
 */
export const FORD_FEATURE_TYPES = Object.freeze(['mud', 'plank']);

/**
 * The ridge's own kind (story table, หอยทาก): `dry` is ground that stops a body
 * which needs the damp — and only that body. While the ground is damp, or once a
 * snail has left a trail over it (`damp-trail`), it is ordinary ground again
 * (systems/moisture.js, systems/worldgen.js#worldAbilities).
 */
export const DAMP_FEATURE_TYPES = Object.freeze(['dry']);

/**
 * The feeding ground's own kinds (story table, หมูป่า): `mound` is packed earth —
 * solid to every body until a life roots it open (`dug`) — and `root` is a patch
 * of roots the boar tears up for food, one of which may be a colony's roof.
 */
export const BOAR_FEATURE_TYPES = Object.freeze(['mound', 'root']);

/**
 * The asura city's own kinds (design §7, นครอสุร): `citywall` is cut stone,
 * `drop` is the broken gate no walker crosses, `span` is stones laid back over it
 * by a life that stopped competing, and `shrine` is the place inside that rests
 * the mind once the span is there.
 */
export const ASURA_FEATURE_TYPES = Object.freeze(['citywall', 'drop', 'span', 'shrine']);

/**
 * The light garden's own kinds (design §7, สวนแสงไม่เที่ยง): `hedge` is the ring,
 * `shadow` is the gate that is passable only while the light is on it, `beam` is
 * that light, and `bloombed` is a bed of flowers with an age — `seedfall` is the
 * mark a released bed leaves behind.
 */
export const GARDEN_FEATURE_TYPES = Object.freeze(['hedge', 'shadow', 'beam', 'bloombed', 'seedfall']);

/**
 * The market alley's own kinds (design §7, ตลาดความอยาก): `marketwall` is the
 * alley's cut stone, `narrowgate` is the gate only empty hands pass, `curtain` is
 * a shop's curtain that opens as the hands get heavier, and `gift` is what a stall
 * is offering.
 */
export const MARKET_FEATURE_TYPES = Object.freeze(['marketwall', 'narrowgate', 'curtain', 'gift']);

const SOLID_TYPES = new Set([
  'thicket', 'boulders', 'tower', 'stall', 'rootwall', 'stone', 'log', 'wall', 'canopy', 'flood', 'snag',
  'citywall', 'hedge', 'marketwall',
]);

function featureRadius(type, rng) {
  if (type === 'boulders') return 36 + rng() * 14;
  if (type === 'thicket') return 46 + rng() * 18;
  if (type === 'pond') return 70 + rng() * 30;
  if (type === 'tower') return 52 + rng() * 20;
  if (type === 'bridge') return 96;
  if (type === 'bloom') return 30 + rng() * 10;
  if (type === 'stall') return 44 + rng() * 10;
  if (type === 'weir') return 58;
  if (type === 'rootwall') return BURROW.wallRadius;
  if (type === 'burrow') return BURROW.gapRadius;
  if (type === 'crack') return NEST.crackRadius;
  if (type === 'mire') return MARSH.mireRadius;
  if (type === 'crevice') return CREVICE.gapRadius;
  if (type === 'stone') return CREVICE.wallRadius;
  if (type === 'gully') return FIELD.gully.radius;
  if (type === 'log') return GROVE.logRadius;
  if (type === 'crawlway') return GROVE.crawlRadius;
  if (type === 'wall') return ENCLOSURE.wallRadius;
  if (type === 'canopy') return SEEDS.canopyRadius;
  if (type === 'flood') return TIDE.floodRadius;
  if (type === 'snag') return 52;
  if (type === 'mud') return FORD.mudRadius;
  if (type === 'dry') return DAMP.ridgeRadius;
  if (type === 'mound') return BOAR.moundRadius;
  if (type === 'root') return BOAR.patchRadius;
  if (type === 'citywall') return ASURA.wallRadius;
  if (type === 'drop') return ASURA.dropRadius;
  if (type === 'span') return ASURA.spanRadius;
  if (type === 'shrine') return ASURA.shrineRadius;
  if (type === 'marketwall') return MARKET.wallRadius;
  if (type === 'narrowgate') return MARKET.gateRadius;
  if (type === 'curtain') return MARKET.curtainRadius;
  if (type === 'gift') return MARKET.giftRadius;
  if (type === 'hedge') return GARDEN.hedgeRadius;
  if (type === 'shadow') return GARDEN.shadowRadius;
  if (type === 'beam') return GARDEN.beamRadius;
  if (type === 'bloombed') return GARDEN.bedRadius;
  if (type === 'seedfall') return 26;
  if (type === 'plank') return FORD.plankRadius;
  if (type === 'pebble') return 18 + rng() * 10;
  return 62;
}

const MARGIN_FROM_PATH = 46;
const GRID_CELL = 40;
const GRID_MARGIN = 220;
const MAX_SEED_TRIES = 12;

/** The line a life must be able to walk: the river for a fish, the plane's road otherwise. */
export function routeFor(formId, biomeId = 'memory-forest') {
  return formId === 'fish' ? RIVER : routeForPlane(biomeId);
}

/**
 * Is this point on the road being walked? The plane decides which road that is,
 * so a corner of the asura city counts as the way and the same point in the
 * forest does not (design §7). Being on it is what keeps a body at full speed.
 */
export function isOnRoute(x, y, biomeId = 'memory-forest') {
  if (distToPoly(routeForPlane(biomeId), x, y) < PATH_WIDTH.trueWidth) return true;
  return false;
}

function featureAt(feature, x, y) {
  return dist(x, y, feature.x, feature.y) < feature.r;
}

export function waterAt(features, x, y) {
  if (distToPoly(RIVER, x, y) < RIVER_WIDTH) return true;
  return features.some((feature) => feature.type === 'pond' && featureAt(feature, x, y));
}

export function blockedAt(features, x, y, abilities = {}) {
  if (abilities.flying === true) return false;
  // A plank is not a door of its own: it is ground laid over a chasm, so it clears
  // whatever is under it before anything gets a chance to block.
  const bridged = features.some((feature) => feature.type === 'plank' && featureAt(feature, x, y));
  // The same idea in stone: a span laid over the city's broken gate is ground.
  const spanned = features.some((feature) => feature.type === 'span' && featureAt(feature, x, y));
  return features.some((feature) => {
    if (bridged && (feature.type === 'gully' || feature.type === 'plank')) return false;
    if (spanned && (feature.type === 'drop' || feature.type === 'span')) return false;
    // The city's broken gate: a gap, not a wall — a leaping body clears it, and
    // nothing else crosses until a span lies over it.
    if (feature.type === 'drop') return abilities.leap !== true && featureAt(feature, x, y);
    // The garden's gate is a shadow: dark ground, crossable only while the light is
    // on it (systems/light.js). The fastest of the world's rhythms, and the only
    // door in the game that opens and closes with the light itself.
    if (feature.type === 'shadow') return abilities.lightLit !== true && featureAt(feature, x, y);
    // The market's gate is narrow: it lets a body through only with empty hands, and
    // a curtain opens as the hands get heavier — the only two doors in the game
    // whose key is what the body is *carrying* (game/market.js).
    if (feature.type === 'narrowgate') return (abilities.carryCount || 0) > 0 && featureAt(feature, x, y);
    if (feature.type === 'curtain') return (abilities.carryCount || 0) < (feature.needs || 1) && featureAt(feature, x, y);
    if (feature.type === 'burrow') return abilities.burrow !== true && featureAt(feature, x, y);
    if (feature.type === 'crack') return abilities.small !== true && featureAt(feature, x, y);
    if (feature.type === 'mire') return abilities.leap !== true && featureAt(feature, x, y);
    if (feature.type === 'crevice') return abilities.slither !== true && featureAt(feature, x, y);
    if (feature.type === 'gully') return abilities.leap !== true && featureAt(feature, x, y);
    if (feature.type === 'crawlway') return abilities.small !== true && featureAt(feature, x, y);
    if (feature.type === 'wall') return abilities.cling !== true && featureAt(feature, x, y);
    // A canopy is the squirrel's door: only climbing (or flying) gets into it.
    if (feature.type === 'canopy') return abilities.climbing !== true && featureAt(feature, x, y);
    // The channel is the tide's door: deep water stops a body that cannot swim
    // deep, unless the water is out (crossCauseway) — or unless an earlier life
    // kept the channel shallow for good.
    if (feature.type === 'flood') {
      return abilities.crossCauseway !== true && abilities.swimDeep !== true && featureAt(feature, x, y);
    }
    // The dry ridge stops a body that needs the damp, and no other body at all.
    if (feature.type === 'dry') {
      return abilities.needsDamp === true && abilities.dampGround !== true && featureAt(feature, x, y);
    }
    // Packed earth is solid to every body until a life roots it open: the boar's
    // door is an *action*, and the opening stays open for every life after it.
    if (feature.type === 'mound') return feature.dug !== true && featureAt(feature, x, y);
    if (!SOLID_TYPES.has(feature.type)) return false;
    if (feature.type === 'thicket') return abilities.climbing !== true && featureAt(feature, x, y);
    if (feature.type === 'boulders') return abilities.small !== true && featureAt(feature, x, y);
    return featureAt(feature, x, y);
  });
}

function mayPlace(type, x, y, radius, route) {
  if (x < 80 || y < 80 || x > WORLD.w - 80 || y > WORLD.h - 80) return false;
  if (dist(x, y, TEMPLE.x, TEMPLE.y) < TEMPLE.r + 60) return false;
  if (dist(x, y, SALA.x, SALA.y) < SALA.r + 60) return false;
  // Never cover the road itself; dressing sits beside this plane's road.
  if (distToPoly(route, x, y) < radius + MARGIN_FROM_PATH) return false;
  // Never crowd the root chamber, or a seed could seal its own tunnel.
  if (dist(x, y, BURROW_KEEPOUT.x, BURROW_KEEPOUT.y) < BURROW_KEEPOUT.r + radius) return false;
  // Nor the ant's nest, or a trunk could close the crack.
  if (dist(x, y, NEST_KEEPOUT.x, NEST_KEEPOUT.y) < NEST_KEEPOUT.r + radius) return false;
  // Nor the marsh, or a trunk could block the leap across the mire.
  if (dist(x, y, MARSH_KEEPOUT.x, MARSH_KEEPOUT.y) < MARSH_KEEPOUT.r + radius) return false;
  // Nor the stone ring, or a trunk could close the crevice.
  if (dist(x, y, CREVICE_KEEPOUT.x, CREVICE_KEEPOUT.y) < CREVICE_KEEPOUT.r + radius) return false;
  // Nor the field, or a trunk could break the relay or dam the gully.
  if (FIELD_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r + radius)) return false;
  // Nor the walled grove, or a trunk could fall across the log.
  if (GROVE_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r + radius)) return false;
  // Nor the walled enclosure, or a trunk could lean over the wall.
  if (ENCLOSURE_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r + radius)) return false;
  // Nor the seed trees or the cache, or a trunk could close a crown.
  if (SEEDS_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r + radius)) return false;
  // Nor the causeway, or a trunk could stand in the middle of the crossing.
  if (TIDE_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r + radius)) return false;
  // Nor the hive, the flowers or the meadow, or a trunk could split the chain.
  if (BLOOMS_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r + radius)) return false;
  // Nor the walls the cat peers from, or a trunk could stand in for one.
  if (HOMES_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r + radius)) return false;
  // Nor the ford, or a trunk could fall across the log or the chasm.
  if (FORD_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r + radius)) return false;
  // Nor the dry ridge, or a trunk could break the crossing that is one body's.
  if (DAMP_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r + radius)) return false;
  // Nor the feeding ground, or a trunk could fall inside the ring or over a root.
  if (BOAR_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r + radius)) return false;
  // Nor the city plaza, or a trunk could stand in its gate or on its shrine.
  if (ASURA_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r + radius)) return false;
  // Nor the garden, or a trunk could shade a bloom bed or the gate's light.
  if (GARDEN_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r + radius)) return false;
  // Nor the market alley, or a trunk could stand in a stall's curtain.
  if (MARKET_KEEPOUTS.some((area) => dist(x, y, area.x, area.y) < area.r + radius)) return false;
  void type;
  return true;
}

/**
 * The root chamber (docs/animal-lives-story.md ch.2, "ทางใต้ราก").
 *
 * A ring of hard root with one mouth of soft soil, placed so the mouth faces the
 * way in. It is assembled from the fixed geometry in world/world-data.js rather
 * than from a seed: the design requires a real burrow with a *verifiable* exit,
 * so the shape must be the same in every world, and the validator must be able
 * to prove that only a tunnelling body can reach the seed.
 */
export function assembleBurrow() {
  const { mouth, chamber, ring, walls, wallRadius, gapRadius } = BURROW;
  const features = [];
  const gapAngle = Math.atan2(mouth.y - chamber.y, mouth.x - chamber.x);
  const step = TAU / (walls + 2);

  // Hard root all the way round except the mouth: slots 1.5 .. walls + 0.5.
  for (let k = 0; k < walls; k++) {
    const angle = gapAngle + (k + 1.5) * step;
    features.push({
      i: features.length,
      site: 'burrow',
      type: 'rootwall',
      fixed: true,
      x: chamber.x + Math.cos(angle) * ring,
      y: chamber.y + Math.sin(angle) * ring,
      r: wallRadius,
    });
  }

  // Soft soil plugs the mouth: overlapping circles so no walking body can
  // squeeze through the opening, while a tunnelling body passes freely.
  const face = { x: Math.cos(gapAngle), y: Math.sin(gapAngle) };
  const side = { x: -face.y, y: face.x };
  for (const offset of [-40, 0, 40]) {
    features.push({
      i: features.length,
      site: 'burrow',
      type: 'burrow',
      fixed: true,
      x: chamber.x + face.x * ring + side.x * offset,
      y: chamber.y + face.y * ring + side.y * offset,
      r: gapRadius,
    });
  }

  return features;
}

/**
 * The ant's nest (docs/animal-lives-story.md ch.3, "เมล็ดของใคร").
 *
 * Same shape of proof as the burrow, a different door: a dome of hard root whose
 * only gap is a crack. `validateNestRoute` shows that a small body slips through
 * and that walking bodies — and even the tunnelling earthworm — cannot.
 */
export function assembleNest() {
  const { seed, chamber, ring, walls, wallRadius, crackRadius, crackPlugs } = NEST;
  const features = [];
  const doorAngle = Math.atan2(seed.y - chamber.y, seed.x - chamber.x);
  const step = TAU / (walls + 2);

  for (let k = 0; k < walls; k++) {
    const angle = doorAngle + (k + 1.5) * step;
    features.push({
      i: features.length,
      site: 'nest',
      type: 'rootwall',
      fixed: true,
      x: chamber.x + Math.cos(angle) * ring,
      y: chamber.y + Math.sin(angle) * ring,
      r: wallRadius,
    });
  }

  const face = { x: Math.cos(doorAngle), y: Math.sin(doorAngle) };
  const side = { x: -face.y, y: face.x };
  const plugStep = 40;
  for (let i = 0; i < crackPlugs; i++) {
    const offset = (i - (crackPlugs - 1) / 2) * plugStep;
    features.push({
      i: features.length,
      site: 'nest',
      type: 'crack',
      fixed: true,
      x: chamber.x + face.x * ring + side.x * offset,
      y: chamber.y + face.y * ring + side.y * offset,
      r: crackRadius,
    });
  }

  return features;
}

/**
 * The marsh (docs/animal-lives-story.md ch.4, "ฝนหยดแรก").
 *
 * The channel gate sits inside a ring of deep mire with one gap, and the pools
 * and the spawning bank lie outside it. Only a leaping body crosses the mire, so
 * `validateFrogRoute` can prove the inlet belongs to the frog and to no one
 * else; the bank stays open, because laying eggs is not a locked door.
 */
export function assembleMarsh() {
  const { inlet, ring, walls, wallRadius, mireRadius, mirePlugs } = MARSH;
  const features = [];
  const entryAngle = -Math.PI / 2; // the way in faces the road, north of the ring
  const step = TAU / (walls + 2);

  for (let k = 0; k < walls; k++) {
    const angle = entryAngle + (k + 1.5) * step;
    features.push({
      i: 0,
      site: 'marsh',
      type: 'mire',
      fixed: true,
      x: inlet.x + Math.cos(angle) * ring,
      y: inlet.y + Math.sin(angle) * ring,
      r: wallRadius,
    });
  }

  const face = { x: Math.cos(entryAngle), y: Math.sin(entryAngle) };
  const side = { x: -face.y, y: face.x };
  const plugStep = 40;
  for (let i = 0; i < mirePlugs; i++) {
    const offset = (i - (mirePlugs - 1) / 2) * plugStep;
    features.push({
      i: 0,
      site: 'marsh',
      type: 'mire',
      fixed: true,
      x: inlet.x + face.x * ring + side.x * offset,
      y: inlet.y + face.y * ring + side.y * offset,
      r: mireRadius,
    });
  }

  // Still water to swim in, and the soft bank at the marsh edge.
  for (const pond of MARSH_PONDS) {
    features.push({ i: 0, site: 'marsh', type: 'pond', fixed: true, x: pond.x, y: pond.y, r: pond.r });
  }

  return features;
}

/**
 * The crevice and the sealed spring (docs/animal-lives-story.md ch.6, "ช่องแคบ").
 *
 * A ring of stone around the spring with one slot, so that only a slithering
 * body gets in. Once the crevice has been widened (`water-linked`, see
 * systems/world-effects.js) it is a door for everyone — which is exactly what
 * the snake decides inside.
 */
export function assembleCrevice() {
  const { spring, outflow, ring, walls, wallRadius, gapRadius, gapPlugs } = CREVICE;
  const features = [];
  const doorAngle = Math.atan2(outflow.y - spring.y, outflow.x - spring.x);
  const step = TAU / (walls + 2);

  for (let k = 0; k < walls; k++) {
    const angle = doorAngle + (k + 1.5) * step;
    features.push({
      i: 0,
      site: 'crevice',
      type: 'stone',
      fixed: true,
      x: spring.x + Math.cos(angle) * ring,
      y: spring.y + Math.sin(angle) * ring,
      r: wallRadius,
    });
  }

  const face = { x: Math.cos(doorAngle), y: Math.sin(doorAngle) };
  const side = { x: -face.y, y: face.x };
  const plugStep = 40;
  for (let i = 0; i < gapPlugs; i++) {
    const offset = (i - (gapPlugs - 1) / 2) * plugStep;
    features.push({
      i: 0,
      site: 'crevice',
      type: 'crevice',
      fixed: true,
      x: spring.x + face.x * ring + side.x * offset,
      y: spring.y + face.y * ring + side.y * offset,
      r: gapRadius,
    });
  }

  // The spring itself is water, so the snake swims in the dark.
  features.push({ i: 0, site: 'crevice', type: 'pond', fixed: true, x: spring.x, y: spring.y, r: 72 });

  return features;
}

/**
 * The field and the washed rim (docs/animal-lives-story.md ch.10, "ที่หลบก่อนพายุ").
 *
 * The gully is an unbroken ring of overlapping channels around the far warren:
 * a leaping body crosses anywhere along it and no other body crosses at all. The
 * warrens themselves are not features — they are places a life visits, not walls.
 */
export function assembleField() {
  const features = [];
  const { gully } = FIELD;
  const step = TAU / gully.segments;
  for (let i = 0; i < gully.segments; i++) {
    const angle = i * step;
    features.push({
      i: 0,
      site: 'field',
      type: 'gully',
      fixed: true,
      x: gully.x + Math.cos(angle) * gully.ring,
      y: gully.y + Math.sin(angle) * gully.ring,
      r: gully.radius,
    });
  }
  return features;
}

/**
 * The walled grove and the fallen log (docs/animal-lives-story.md ch.11).
 *
 * A stone ring around the grove with exactly two openings: the mouth, plugged by
 * the log (lifted only by a strong body through game/elephant.js), and a small
 * crawlway beside it. Both openings lead to the same place, which is the point:
 * the large road and the small road meet at this wall.
 */
export function assembleGrove() {
  const { grove, ring, segments, stoneRadius, log, logRadius, crawlAngle, crawlRadius } = GROVE;
  const features = [];
  const mouthAngle = Math.PI / 2; // the way in faces the road, south of the ring
  const step = TAU / (segments + 2);

  for (let k = 0; k < segments; k++) {
    const angle = mouthAngle + (k + 1.5) * step;
    // the crawlway replaces the stone nearest to it
    const crawlDistance = Math.abs(((angle - crawlAngle + Math.PI) % TAU + TAU) % TAU - Math.PI);
    if (crawlDistance < step) continue;
    features.push({
      i: 0,
      site: 'grove',
      type: 'stone',
      fixed: true,
      x: grove.x + Math.cos(angle) * ring,
      y: grove.y + Math.sin(angle) * ring,
      r: stoneRadius,
    });
  }

  features.push({
    i: 0,
    site: 'grove',
    type: 'crawlway',
    fixed: true,
    x: grove.x + Math.cos(crawlAngle) * ring,
    y: grove.y + Math.sin(crawlAngle) * ring,
    r: crawlRadius,
  });

  features.push({
    i: 0,
    site: 'grove',
    type: 'log',
    fixed: true,
    // The log holds the world's shape until a strong body chooses to move it,
    // so it is fixed like the stone — but it is the one fixed thing that can go.
    liftable: true,
    x: log.x,
    y: log.y,
    r: logRadius,
  });

  return features;
}

/** The grove without its log: what the world looks like once strength is used. */
export function groveWithoutLog(features = assembleGrove()) {
  return features.filter((feature) => feature.type !== 'log');
}

/**
 * The dry ridge (story table, หอยทาก).
 *
 * A ridge of dry ground rings the garden: for every body but a snail it is simply
 * ground, and for a snail it is a wall except while the ground is damp. Nothing
 * about it is a wall to anyone else — which is what makes it the game's first
 * barrier that exists for exactly one body (`needsDamp`).
 */
export function assembleDryRidge() {
  const features = [];
  const { garden, ring, segments, ridgeRadius } = DAMP;
  const step = TAU / segments;
  for (let i = 0; i < segments; i++) {
    const angle = i * step;
    features.push({
      i: 0,
      site: 'damp',
      type: 'dry',
      fixed: true,
      x: garden.x + Math.cos(angle) * ring,
      y: garden.y + Math.sin(angle) * ring,
      r: ridgeRadius,
    });
  }
  return features;
}

/**
 * Prove the ridge is a *snail's* barrier (story table, หอยทาก): a body that needs
 * the damp cannot reach the garden while the ground is dry, can while it is damp or
 * on a trail an earlier life left (`dampGround`), and a body that does not need the
 * damp is never stopped by it at all.
 */
export function validateSnailRoute(features, abilities = {}) {
  const base = { ...abilities, flying: false };
  const from = DAMP.hollow;
  const goal = DAMP.garden;
  const drySnail = reachableBetween(features, from, goal, { ...base, needsDamp: true, dampGround: false }, DAMP.gardenRadius * 0.5);
  const dampSnail = reachableBetween(features, from, goal, { ...base, needsDamp: true, dampGround: true }, DAMP.gardenRadius * 0.5);
  const walker = reachableBetween(features, from, goal, { ...base, needsDamp: false }, DAMP.gardenRadius * 0.5);
  const ok = drySnail === false && dampSnail === true && walker === true;
  return { ok, drySnail, dampSnail, walker };
}

/**
 * The feeding ground (story table, หมูป่า).
 *
 * A ring of packed earth, and four root patches inside it — one of them the roof
 * of a colony of small lives. The colony is *seeded*: which patch it is changes
 * from world to world, but the geometry is fixed, so the validator can prove that
 * the safe way always exists. Patches eaten or mounds opened in an earlier life
 * arrive already dug, and turned soil grows fresh roots (`soil-turned`).
 */
export function assembleBoar(seed = 1, options = {}) {
  const rng = mulberry32(seed);
  const features = [];
  const { feed, ring, segments, moundRadius, patches, patchRadius } = BOAR;
  const dug = options.dug || [];
  const isDug = (x, y) => dug.some((spot) => dist(x, y, spot.x, spot.y) < 1);

  // Drawn first and unconditionally, so the colony's patch is the same in every
  // world this seed generates, whatever the life before it did.
  const colonyAt = (rng() * patches.length) | 0;

  const step = TAU / segments;
  for (let i = 0; i < segments; i++) {
    const angle = i * step;
    const x = feed.x + Math.cos(angle) * ring;
    const y = feed.y + Math.sin(angle) * ring;
    features.push({ i: 0, site: 'boar', type: 'mound', fixed: true, diggable: true, dug: isDug(x, y), x, y, r: moundRadius });
  }

  patches.forEach((patch, index) => {
    const colony = index === colonyAt;
    const eaten = isDug(patch.x, patch.y);
    // Eaten in an earlier life: bare ground — unless the soil was turned, in which
    // case the roots grow back. Turned soil keeps giving, and a colony that was
    // crushed is never one of the patches that comes back.
    if (eaten && !(options.turned === true && !colony)) return;
    features.push({
      i: 0, site: 'boar', type: 'root', fixed: true, diggable: true,
      colony, regrown: eaten && !colony, x: patch.x, y: patch.y, r: patchRadius,
    });
  });
  return features;
}

/**
 * Prove the feeding ground is the boar's (story table, หมูป่า) — and the first
 * proof in the game with an *ethical* dimension: not only that a body can get in,
 * but that it can get in without destroying a life that lives there.
 *
 *   sealed      with the ring whole, nothing at all reaches the food
 *   rooted      with a single mound rooted open, a walking body gets in
 *   safeWay     the safe way always exists: every seed has at least `need`
 *               colony-free patches, and the boar can root its way to each of them
 *   harmPossible the colony's patch can be reached too — the risk is real, and
 *               not a decoration the map keeps out of reach
 */
export function validateBoarRoute(features) {
  const base = { flying: false };
  const from = BOAR.wallow;
  const goal = BOAR.feed;
  const goalRadius = BOAR.feed ? 60 : 60;
  const sealed = reachableBetween(features, from, goal, base, goalRadius);

  const mounds = features.filter((feature) => feature.type === 'mound');
  const opened = (index) => features.map((feature) => (
    feature === mounds[index] ? { ...feature, dug: true } : feature
  ));
  const rooted = mounds.some((_, index) => reachableBetween(opened(index), from, goal, base, goalRadius));

  const roots = features.filter((feature) => feature.type === 'root');
  // The boar chooses which mound to root, so "can it get there" means "opening
  // some mound gets it there". The radius is the patch's own: the coarse grid has
  // to be able to stand *at* the patch, and a patch is not solid, so arriving is
  // what reaching it means.
  const reaches = (target, radius) => mounds.some((_, index) => (
    reachableBetween(opened(index), from, target, base, radius)
  ));
  const free = roots.filter((feature) => feature.colony !== true);
  const safeWay = free.length >= BOAR.need && free.every((patch) => reaches(patch, patch.r));
  const colony = roots.filter((feature) => feature.colony === true);
  const harmPossible = colony.length === 1 && reaches(colony[0], colony[0].r);

  const ok = sealed === false && rooted === true && safeWay === true && harmPossible === true;
  return { ok, sealed, rooted, safeWay, harmPossible, freePatches: free.length };
}

/**
 * The asura city's plaza (design §7, นครอสุร).
 *
 * A ring of cut stone with two segments left out at the gate, and that opening
 * plugged by the drop — overlapping so nothing slips between, the way the tide's
 * channel is plugged. Inside stands the shrine. `options.spans` are the spans
 * lives have laid back over the drop; each one is ground over the whole gate.
 */
export function assembleAsuraRooms(options = {}) {
  const { plaza, ring, segments, wallRadius, gateSegments, dropRadius, dropPlugs } = ASURA;
  const gate = asuraGate();
  const features = [];
  const step = TAU / segments;
  const openHalf = step * (gateSegments / 2);

  for (let i = 0; i < segments; i++) {
    const angle = i * step;
    const delta = Math.abs((((angle - gate.angle + Math.PI) % TAU) + TAU) % TAU - Math.PI);
    // The gate's own segments are left out — that is where the gate used to be.
    if (delta < openHalf) continue;
    features.push({
      i: 0, site: 'asura', type: 'citywall', fixed: true,
      x: plaza.x + Math.cos(angle) * ring,
      y: plaza.y + Math.sin(angle) * ring,
      r: wallRadius,
    });
  }

  // The broken gate: the drop, plugged along the opening so it is a gap and not a
  // doorway.
  const face = { x: Math.cos(gate.angle), y: Math.sin(gate.angle) };
  const side = { x: -face.y, y: face.x };
  for (let i = 0; i < dropPlugs; i++) {
    const offset = (i - (dropPlugs - 1) / 2) * 36;
    features.push({
      i: 0, site: 'asura', type: 'drop', fixed: true,
      x: gate.x + side.x * offset,
      y: gate.y + side.y * offset,
      r: dropRadius,
    });
  }

  // The shrine, and the spans a past life laid back.
  features.push({ i: 0, site: 'asura', type: 'shrine', fixed: true, x: ASURA.shrine.x, y: ASURA.shrine.y, r: ASURA.shrineRadius });
  for (const f of assembleSpans(options.spans || [])) features.push(f);
  return features;
}

/** Stones laid over the broken gate: what every later life crosses into the plaza on. */
export function assembleSpans(spans = []) {
  return spans.map((span) => ({
    i: 0, site: 'asura', type: 'span', fixed: true, x: span.x, y: span.y, r: ASURA.spanRadius,
  }));
}

/**
 * Prove the broken gate is the city's question (design §7, นครอสุร): with the gate
 * broken, no walking body reaches the shrine; with the stones laid back as a span,
 * an ordinary walking body does; and a leaping body was never stopped at all. Same
 * proof shape as the ford — and the same point: what one life builds, the next
 * life walks across.
 */
export function validateAsuraRoute(features, abilities = {}) {
  const base = { ...abilities, flying: false, leap: false };
  const from = ASURA.road;
  const goal = ASURA.shrine;
  const radius = ASURA.shrineRadius * 0.5;
  const walkerBefore = reachableBetween(features, from, goal, base, radius);
  const walkerAfter = reachableBetween(
    [...features, ...assembleSpans([asuraGate()])],
    from, goal, base, radius,
  );
  const leaper = reachableBetween(features, from, goal, { ...base, leap: true }, radius);
  const ok = walkerBefore === false && walkerAfter === true && leaper === true;
  return { ok, walkerBefore, walkerAfter, leaper };
}

/**
 * The light garden (design §7, สวนแสงไม่เที่ยง).
 *
 * A hedge ring with two segments left out at the gate, plugged by the shadow the
 * way the tide's channel is plugged; the beam is the light that lies over it, and
 * it is drawn there whether or not the light is on. Inside are the bloom beds, and
 * every seed has at least one ripe bed — a life can always let a seed travel on.
 * `options.releasedBeds` are the beds earlier lives already released.
 */
export function assembleGardenRooms(seed = 1, options = {}) {
  const rng = mulberry32(seed);
  const { center, ring, segments, hedgeRadius, gateSegments, shadowRadius, shadowPlugs, beamRadius, beds, bedRadius } = GARDEN;
  const gate = gardenGate();
  const released = options.releasedBeds || [];
  const isReleased = (bed) => released.some((spot) => dist(bed.x, bed.y, spot.x, spot.y) < 1);
  const features = [];
  const step = TAU / segments;
  const openHalf = step * (gateSegments / 2);

  for (let i = 0; i < segments; i++) {
    const angle = i * step;
    const delta = Math.abs((((angle - gate.angle + Math.PI) % TAU) + TAU) % TAU - Math.PI);
    if (delta < openHalf) continue;
    features.push({
      i: 0, site: 'garden', type: 'hedge', fixed: true,
      x: center.x + Math.cos(angle) * ring,
      y: center.y + Math.sin(angle) * ring,
      r: hedgeRadius,
    });
  }

  // The gate: the shadow, plugged along the opening, and the beam over it.
  const face = { x: Math.cos(gate.angle), y: Math.sin(gate.angle) };
  const side = { x: -face.y, y: face.x };
  for (let i = 0; i < shadowPlugs; i++) {
    const offset = (i - (shadowPlugs - 1) / 2) * 36;
    features.push({
      i: 0, site: 'garden', type: 'shadow', fixed: true,
      x: gate.x + side.x * offset,
      y: gate.y + side.y * offset,
      r: shadowRadius,
    });
  }
  features.push({ i: 0, site: 'garden', type: 'beam', fixed: true, x: gate.x, y: gate.y, r: beamRadius });

  // The beds: one age each, drawn unconditionally so the same seed always gives
  // the same garden, and at least one of them always ripe.
  const ages = beds.map(() => rng());
  const ripe = ages.map((value) => value < 0.55);
  if (!ripe.some(Boolean)) ripe[0] = true;
  beds.forEach((bed, index) => {
    if (isReleased(bed)) {
      // Released in an earlier life: bare soil, and the seed is on its way.
      features.push({ i: 0, site: 'garden', type: 'seedfall', fixed: true, x: bed.x, y: bed.y, r: 26 });
      return;
    }
    features.push({
      i: 0, site: 'garden', type: 'bloombed', fixed: true, releasable: true,
      ripe: ripe[index], x: bed.x, y: bed.y, r: bedRadius,
    });
  });
  return features;
}

/**
 * Prove the garden's gate is the light's (design §7, สวนแสงไม่เที่ยง): with the
 * light off, no walking body reaches the beds; with the light on, an ordinary
 * walking body does. And the garden always has a ripe bed, so a life can always
 * let its seeds travel on — the safe way always exists, in bloom this time.
 */
export function validateGardenRoute(features, abilities = {}) {
  const base = { ...abilities, flying: false };
  const from = GARDEN.road;
  const goal = GARDEN.center;
  const radius = GARDEN.innerRadius * 0.5;
  const dimWalker = reachableBetween(features, from, goal, { ...base, lightLit: false }, radius);
  const litWalker = reachableBetween(features, from, goal, { ...base, lightLit: true }, radius);
  const blooms = features.filter((feature) => feature.type === 'bloombed');
  const ripeBlooms = blooms.filter((feature) => feature.ripe === true).length;
  const ok = dimWalker === false && litWalker === true && ripeBlooms >= 1;
  return { ok, dimWalker, litWalker, ripeBlooms, blooms: blooms.length };
}

/**
 * Flowers a released bed sends along the plane's own road: what the garden keeps
 * because a life let its seeds travel (`seeds-released`).
 */
export function assembleReleasedBlooms(seed = 1, biomeId = 'light-garden') {
  const rng = mulberry32(seed >>> 0 || 1);
  const features = [];
  const route = routeForPlane(biomeId);
  for (let i = 1; i < route.length - 1; i++) {
    for (const side of [-1, 1]) {
      if (rng() < 0.45) continue;
      const offset = 120 + rng() * 90;
      const nx = -(route[i + 1][1] - route[i - 1][1]);
      const ny = route[i + 1][0] - route[i - 1][0];
      const length = Math.hypot(nx, ny) || 1;
      features.push({
        i: 0,
        site: 'garden',
        type: 'bloombed',
        x: route[i][0] + (nx / length) * offset * side,
        y: route[i][1] + (ny / length) * offset * side,
        r: 26 + rng() * 10,
        travelled: true,
      });
    }
  }
  return features;
}

/**
 * The market's alley (design §7, ตลาดความอยาก).
 *
 * One straight alley, walled on both sides, capped at the far end, and closed at
 * the near end by the narrow gate. Three curtains cross it, each opening on more
 * than the last, and the offers stand between them: take one and the next curtain
 * parts, carry nothing and the gate is the only way on. `options.loosed` is the
 * `hands-emptied` effect of a life that let go — the market does not put its first
 * curtain across the way in the next world.
 */
export function assembleMarketRooms(options = {}) {
  const { length, halfWidth, wallRadius, curtainAt, curtainNeeds, gifts, giftRadius } = MARKET;
  const gate = marketGate();
  const axis = MARKET.axis;
  // Perpendicular to the alley's axis, along the street.
  const side = { x: -axis.y, y: axis.x };
  const at = (distance, across = 0) => ({
    x: gate.x + axis.x * distance + side.x * across,
    y: gate.y + axis.y * distance + side.y * across,
  });
  const features = [];
  const wall = (spot, r = wallRadius) => features.push({
    i: 0, site: 'market', type: 'marketwall', fixed: true, x: spot.x, y: spot.y, r,
  });

  // The two side walls, overlapping so nothing slips between.
  for (let distance = 0; distance <= length; distance += 40) {
    for (const across of [-halfWidth, halfWidth]) wall(at(distance, across));
  }

  // The far cap.
  for (const across of [-40, 0, 40]) wall(at(length, across));

  // The narrow gate: one plug-line, and empty hands are the key.
  for (const across of [-40, 0, 40]) {
    features.push({
      i: 0, site: 'market', type: 'narrowgate', fixed: true,
      x: at(0, across).x, y: at(0, across).y, r: MARKET.gateRadius,
    });
  }

  // The curtains, each opening on heavier hands than the last. A curtain spans the
  // free width of the alley on its own, so opening it opens the whole way.
  curtainAt.forEach((distance, index) => {
    if (options.loosed === true && index === 0) return;
    features.push({
      i: 0, site: 'market', type: 'curtain', fixed: true,
      needs: curtainNeeds[index], x: at(distance).x, y: at(distance).y, r: MARKET.curtainRadius,
    });
  });

  // What the stalls are offering.
  for (const gift of gifts) {
    const spot = at(gift.d, gift.across);
    features.push({ i: 0, site: 'market', type: 'gift', fixed: true, x: spot.x, y: spot.y, r: giftRadius });
  }
  return features;
}

/**
 * Prove the alley is the *craving* plane's (design §7, ตลาดความอยาก), and the
 * richhest proof in the game because the whole design line is a shape:
 *
 *   emptyIn   with empty hands, a walker enters the alley
 *   carryIn   with anything carried, it cannot
 *   emptyOut  with empty hands, it can leave again
 *   carryOut  carrying, it cannot
 *   emptyDeep empty-handed, the chambers behind the curtains stay shut
 *   ladenDeep holding three, a walker reaches the deepest chamber of all
 */
export function validateMarketRoute(features, abilities = {}) {
  const base = { ...abilities, flying: false };
  const road = MARKET.anchor;
  const inside = marketInside();
  const far = marketFar();
  const room = 60;
  const emptyIn = reachableBetween(features, road, inside, { ...base, carryCount: 0 }, room);
  const carryIn = reachableBetween(features, road, inside, { ...base, carryCount: 1 }, room);
  const emptyOut = reachableBetween(features, inside, road, { ...base, carryCount: 0 }, room);
  const carryOut = reachableBetween(features, inside, road, { ...base, carryCount: 1 }, room);
  const emptyDeep = reachableBetween(features, inside, far, { ...base, carryCount: 0 }, room);
  const ladenDeep = reachableBetween(features, inside, far, { ...base, carryCount: 3 }, room);
  const ok = emptyIn === true && carryIn === false
    && emptyOut === true && carryOut === false
    && emptyDeep === false && ladenDeep === true;
  return { ok, emptyIn, carryIn, emptyOut, carryOut, emptyDeep, ladenDeep };
}

/**
 * The ford (story table ch.11, ควาย).
 *
 * The mud flat, the fallen log, and the chasm as a leap-wide line: a body with
 * legs for it crosses anywhere, and nothing else crosses at all until a log lies
 * over it.
 */
export function assembleFord() {
  const features = [];
  const { mud, log, pasture, ring, segments, chasmRadius } = FORD;

  features.push({ i: 0, site: 'ford', type: 'mud', fixed: true, x: mud.x, y: mud.y, r: FORD.mudRadius });
  features.push({ i: 0, site: 'ford', type: 'log', fixed: true, liftable: true, x: log.x, y: log.y, r: FORD.logRadius });

  // The chasm rings the pasture unbroken: a leaping body clears it anywhere, and
  // nothing else crosses until a log lies over it (the `plank` override above).
  const step = TAU / segments;
  for (let i = 0; i < segments; i++) {
    const angle = i * step;
    features.push({
      i: 0,
      site: 'ford',
      type: 'gully',
      fixed: true,
      x: pasture.x + Math.cos(angle) * ring,
      y: pasture.y + Math.sin(angle) * ring,
      r: chasmRadius,
    });
  }
  return features;
}

/** The log, dragged into place: what every later life crosses the chasm on. */
export function assemblePlanks(planks = []) {
  return planks.map((plank) => ({
    i: 0,
    site: 'ford',
    type: 'plank',
    fixed: true,
    x: plank.x,
    y: plank.y,
    r: FORD.plankRadius,
  }));
}

/**
 * Prove the chasm is a *pending* bridge (story table ch.11, ควาย): with the log
 * lying on the near side, nothing that cannot leap reaches the far pasture; with
 * the same log dragged across, an ordinary walking body does. The first proof in
 * the game about a change a life makes to the shape of the map.
 */
export function validateBuffaloRoute(features, abilities = {}) {
  const base = { ...abilities, flying: false, leap: false };
  const from = { x: FORD.mud.x, y: FORD.mud.y };
  const goal = FORD.pasture;
  const walkerBefore = reachableBetween(features, from, goal, base, FORD.pastureRadius * 0.5);
  const walkerAfter = reachableBetween(
    [...features, ...assemblePlanks([fordBridge()])],
    from, goal, base, FORD.pastureRadius * 0.5,
  );
  const leaper = reachableBetween(features, from, goal, { ...base, leap: true }, FORD.pastureRadius * 0.5);
  const ok = walkerBefore === false && walkerAfter === true && leaper === true;
  return { ok, walkerBefore, walkerAfter, leaper };
}

/**
 * The three walls the cat peers from (reserve table, แมว).
 *
 * One low wall a step from each home: nothing is sealed, because nothing needs to
 * be — the cat's door is that it can *stand on the wall*, and every other body has
 * to walk around it and look up.
 */
export function assembleHomeWalls() {
  return HOMES.map((home) => ({
    i: 0,
    site: 'homes',
    type: 'wall',
    fixed: true,
    x: home.wall.x,
    y: home.wall.y,
    r: HOME_WALL_RADIUS,
  }));
}

/**
 * Prove the walls are the cat's door (reserve table, แมว): with `cling` a body can
 * be on every wall, and without it, on none of them.
 */
export function validateCatRoute(features, abilities = {}) {
  const base = { ...abilities, flying: false };
  const walls = assembleHomeWalls();
  const clingOn = walls.every((wall) => blockedAt([wall], wall.x, wall.y, { ...base, cling: true }) === false);
  const walkerOn = walls.some((wall) => blockedAt([wall], wall.x, wall.y, { ...base, cling: false }) !== true);
  // The cat's round: the warm stone, then each wall from the one before it.
  const waypoints = [WARM_STONE, ...HOMES.map((home) => home.wall)];
  const climbReaches = HOMES.every((home, index) => (
    reachableBetween(features, waypoints[index], home.wall, { ...base, cling: true }, 24)
  ));
  const ok = clingOn && !walkerOn && climbReaches;
  return { ok, clingOn, walkerOn, climbReaches };
}

/**
 * The causeway (reserve table, ปู — "รักษาที่อยู่ท่ามกลางน้ำขึ้นลง").
 *
 * The bar is drawn as overlapping stones along the line, so the crossing is
 * unbroken: every seed of it must be crossed, not slipped between.
 */
export function assembleTide() {
  const features = [];
  const { farPool, ring, segments, wallRadius, floodRadius, floodPlugs } = TIDE;
  // The way in faces the sand bar, east of the ring.
  const doorAngle = Math.atan2(TIDE.causeway[1][1] - farPool.y, TIDE.causeway[1][0] - farPool.x);
  const step = TAU / (segments + 2);

  for (let k = 0; k < segments; k++) {
    const angle = doorAngle + (k + 1.5) * step;
    features.push({
      i: 0,
      site: 'tide',
      type: 'stone',
      fixed: true,
      x: farPool.x + Math.cos(angle) * ring,
      y: farPool.y + Math.sin(angle) * ring,
      r: wallRadius,
    });
  }

  // The channel: overlapping water so nothing slips between the stones.
  const face = { x: Math.cos(doorAngle), y: Math.sin(doorAngle) };
  const side = { x: -face.y, y: face.x };
  for (let i = 0; i < floodPlugs; i++) {
    const offset = (i - (floodPlugs - 1) / 2) * 40;
    features.push({
      i: 0,
      site: 'tide',
      type: 'flood',
      fixed: true,
      x: farPool.x + face.x * ring + side.x * offset,
      y: farPool.y + face.y * ring + side.y * offset,
      r: floodRadius,
    });
  }

  // Both pools are water, as pools should be.
  features.push({ i: 0, site: 'tide', type: 'pond', fixed: true, x: TIDE.home.x, y: TIDE.home.y, r: 84 });
  features.push({ i: 0, site: 'tide', type: 'pond', fixed: true, x: farPool.x, y: farPool.y, r: 84 });
  return features;
}

/**
 * Prove the bar is the *tide's* door (reserve table, ปู): with the water over it
 * nothing reaches the far pool; with the water out, a walking body does. Same
 * world, same start, different hour.
 */
export function validateCrabRoute(features, abilities = {}) {
  const base = { ...abilities, flying: false };
  const from = { x: TIDE.home.x, y: TIDE.home.y };
  const goal = TIDE.farPool;
  const walkerLowWater = reachableBetween(features, from, goal, { ...base, crossCauseway: true, swimDeep: false });
  const walkerHighWater = reachableBetween(features, from, goal, { ...base, crossCauseway: false, swimDeep: false });
  const swimmerHighWater = reachableBetween(features, from, goal, { ...base, crossCauseway: false, swimDeep: true });
  const ok = walkerLowWater === true && walkerHighWater === false && swimmerHighWater === true;
  return { ok, walkerLowWater, walkerHighWater, swimmerHighWater };
}

/**
 * The seed trees (reserve table, กระรอก — "ปีนและกระจายเมล็ด").
 *
 * Three crowns, one of which is a hollow cache: the seeds wait inside the crowns,
 * so a climbing body can reach them and a walking body cannot. Nothing else is
 * added here — the errand is a count and a decision, not a wall.
 */
export function assembleSeedTrees() {
  return SEEDS.canopies.map((crown) => ({
    i: 0,
    site: 'seeds',
    type: 'canopy',
    fixed: true,
    x: crown.x,
    y: crown.y,
    r: SEEDS.canopyRadius,
  }));
}

/** The crowns without their seeds: what the world looks like once they are picked. */
export function canopyPicked(features, picked) {
  return features.map((feature) => (
    feature.type === 'canopy' && picked.includes(feature.x) ? { ...feature, picked: true } : feature
  ));
}

/**
 * Prove the crowns are a climbing body's door (reserve table, กระรอก): a climbing
 * body reaches the inside of each crown from the road, a walking body never does.
 */
export function validateSquirrelRoute(features, abilities = {}) {
  const base = { ...abilities, flying: false };
  const start = SEEDS_APPROACH[0];
  const from = { x: start[0], y: start[1] };
  // "into the crown", not "beside it": a walker finds no free cell up there at all.
  const middle = SEEDS.canopyRadius * 0.4;
  const climbReaches = SEEDS.canopies.every((crown) => (
    reachableBetween(features, from, crown, { ...base, climbing: true }, middle)
  ));
  const walkerReaches = SEEDS.canopies.some((crown) => (
    reachableBetween(features, from, crown, { ...base, climbing: false }, middle)
  ));
  const ok = climbReaches === true && walkerReaches === false;
  return { ok, climbReaches, walkerReaches };
}

/**
 * The walled enclosure (reserve table, จิ้งจก — "มองปัญหาจากมุมใหม่").
 *
 * A sheer ring of wall with one gate in it, and the gate stands in the same ring:
 * a clinging body climbs over anywhere, while every other body must wait for the
 * gate — which only opens from the inside. The gate is the one wall marked
 * `liftable`, so game/gecko.js can take it out of the world for good.
 */
export function assembleEnclosure() {
  const { center, ring, segments, wallRadius } = ENCLOSURE;
  const features = [];
  const gateAngle = Math.PI / 2; // the gate faces the road, south of the ring
  const step = TAU / segments;

  for (let i = 0; i < segments; i++) {
    const angle = i * step;
    const isGate = Math.abs(((angle - gateAngle + Math.PI) % TAU + TAU) % TAU - Math.PI) < step / 2;
    features.push({
      i: 0,
      site: 'enclosure',
      type: 'wall',
      fixed: true,
      // The gate is as solid as the wall — until a body inside opens it.
      gate: isGate || undefined,
      liftable: isGate || undefined,
      x: center.x + Math.cos(angle) * ring,
      y: center.y + Math.sin(angle) * ring,
      r: wallRadius,
    });
  }

  return features;
}

/** Assemble the seed's dressing: the plane's own kinds beside the true path. */
/**
 * A jam of driftwood across the tide's channel: what a river does with what a life
 * left in it. `snags` is how much driftwood was left (game/otter.js), so a tended
 * river carries none and the crossing stays open for every later body.
 */
export function assembleSnags(count = 0) {
  const features = [];
  const { farPool, ring, floodPlugs } = TIDE;
  const doorAngle = Math.atan2(TIDE.causeway[1][1] - farPool.y, TIDE.causeway[1][0] - farPool.x);
  const side = { x: -Math.sin(doorAngle), y: Math.cos(doorAngle) };
  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * 52;
    features.push({
      i: 0,
      site: 'tide',
      type: 'snag',
      fixed: true,
      x: farPool.x + Math.cos(doorAngle) * ring + side.x * offset,
      y: farPool.y + Math.sin(doorAngle) * ring + side.y * offset,
      r: 52,
    });
  }
  void floodPlugs;
  return features;
}

/**
 * Flowers the forest grows because a bee once carried pollen across it
 * (reserve table, ผึ้ง). They are dressing like any other bloom — nothing to
 * collide with — but they are the one thing in the game a *past life* adds to the
 * map's plants rather than to its walls.
 */
export function assemblePollinatedBlooms(seed = 1) {
  const rng = mulberry32(seed >>> 0 || 1);
  const features = [];
  const route = routeForPlane('memory-forest');
  for (let i = 1; i < route.length - 1; i++) {
    for (const side of [-1, 1]) {
      if (rng() < 0.45) continue;
      const offset = 120 + rng() * 90;
      const nx = -(route[i + 1][1] - route[i - 1][1]);
      const ny = route[i + 1][0] - route[i - 1][0];
      const length = Math.hypot(nx, ny) || 1;
      features.push({
        i: 0,
        type: 'bloom',
        x: route[i][0] + (nx / length) * offset * side,
        y: route[i][1] + (ny / length) * offset * side,
        r: 26 + rng() * 10,
      });
    }
  }
  return features;
}

export function assembleRooms(seed, biomeId = 'memory-forest', options = {}) {
  const rng = mulberry32(seed);
  const features = [];
  const pool = (BIOMES[biomeId] && BIOMES[biomeId].features) || FEATURE_TYPES;
  // The spine of this map: dressing sits beside *this* plane's road.
  const route = routeForPlane(biomeId);

  for (let i = 1; i < route.length - 1; i++) {
    for (let k = 0; k < 3; k++) {
      if (rng() < 0.3) continue;
      const type = pool[(rng() * pool.length) | 0] || 'clearing';
      // The radius comes first so even a big tower can stand beside the road
      // without ever covering it: reach is always outside its own clearance.
      const radius = featureRadius(type, rng);
      const angle = rng() * TAU;
      const reach = radius + MARGIN_FROM_PATH + 24 + rng() * 120;
      const x = route[i][0] + Math.cos(angle) * reach;
      const y = route[i][1] + Math.sin(angle) * reach;
      if (!mayPlace(type, x, y, radius, route)) continue;
      features.push({ i: features.length, type, x, y, r: radius });
    }
  }

  // The plane's fixed sites: whole lives hang on these, so they come from the
  // plane's own geometry rather than from the seed (design §7, design §12).
  const sites = (BIOMES[biomeId] && BIOMES[biomeId].sites) || [];
  if (sites.includes('burrow')) for (const f of assembleBurrow()) features.push({ ...f, i: features.length });
  if (sites.includes('nest')) for (const f of assembleNest()) features.push({ ...f, i: features.length });
  if (sites.includes('marsh')) for (const f of assembleMarsh()) features.push({ ...f, i: features.length });
  if (sites.includes('crevice')) for (const f of assembleCrevice()) features.push({ ...f, i: features.length });
  if (sites.includes('field')) for (const f of assembleField()) features.push({ ...f, i: features.length });
  if (sites.includes('grove')) for (const f of assembleGrove()) features.push({ ...f, i: features.length });
  if (sites.includes('enclosure')) for (const f of assembleEnclosure()) features.push({ ...f, i: features.length });
  if (sites.includes('seeds')) for (const f of assembleSeedTrees()) features.push({ ...f, i: features.length });
  if (sites.includes('homes')) for (const f of assembleHomeWalls()) features.push({ ...f, i: features.length });
  if (sites.includes('damp')) for (const f of assembleDryRidge()) features.push({ ...f, i: features.length });
  if (sites.includes('boar')) {
    for (const f of assembleBoar(seed, options)) features.push({ ...f, i: features.length });
  }
  if (sites.includes('asura')) {
    // The city's plaza, and the spans earlier lives laid over its broken gate.
    for (const f of assembleAsuraRooms(options)) features.push({ ...f, i: features.length });
  }
  if (sites.includes('market')) {
    // The alley off the plane's own street, and the curtains a life loosened.
    for (const f of assembleMarketRooms(options)) features.push({ ...f, i: features.length });
  }
  if (sites.includes('garden')) {
    // The walled garden's beds, and the ones earlier lives released.
    for (const f of assembleGardenRooms(seed, options)) features.push({ ...f, i: features.length });
    // Seeds a released bed sent travelling: flowers along this plane's road.
    if (options.releasedSeeds === true) {
      for (const f of assembleReleasedBlooms(seed, biomeId)) features.push({ ...f, i: features.length });
    }
  }
  if (sites.includes('ford')) {
    for (const f of assembleFord()) features.push({ ...f, i: features.length });
    // Logs a past life dragged across the chasm: the bridge stands.
    for (const f of assemblePlanks(options.planks || [])) features.push({ ...f, i: features.length });
  }
  if (sites.includes('tide')) {
    for (const f of assembleTide()) features.push({ ...f, i: features.length });
    // Driftwood someone left in the water, if the river was never tended.
    for (const f of assembleSnags(options.snags || 0)) features.push({ ...f, i: features.length });
  }

  // Flowers the forest keeps because a bee carried pollen along it.
  if (options.pollinated === true) {
    for (const f of assemblePollinatedBlooms(seed)) features.push({ ...f, i: features.length });
  }

  // Occasionally silt builds up in the river — which the route check must catch.
  if (rng() < 0.35) {
    const point = RIVER[1 + ((rng() * (RIVER.length - 2)) | 0)];
    // Marked as river silt: it is the one dressing every plane inherits.
    features.push({
      i: features.length, type: 'boulders', silt: true,
      x: point[0], y: point[1], r: 60 + rng() * 40,
    });
  }

  return features;
}

function nearestFreeCell(blocked, cols, rows, cell) {
  const index = (c, r) => r * cols + c;
  if (!blocked[index(cell.c, cell.r)]) return cell;
  const maxRing = 6;
  for (let ring = 1; ring <= maxRing; ring++) {
    for (let dc = -ring; dc <= ring; dc++) {
      for (let dr = -ring; dr <= ring; dr++) {
        const c = cell.c + dc;
        const r = cell.r + dr;
        if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
        if (!blocked[index(c, r)]) return { c, r };
      }
    }
  }
  return null;
}

/**
 * Breadth-first check that the route start can reach the route end on a coarse
 * grid, using the *same* rules the player moves by: solids block everyone, and
 * a water-bound form may only cross water.
 */
export function validateRoute(features, formId, abilities = {}, biomeId = 'memory-forest') {
  const waterBound = formId === 'fish';
  const route = routeFor(formId, biomeId);
  const start = route[0];
  const goal = route[route.length - 1];

  const xs = route.map((point) => point[0]);
  const ys = route.map((point) => point[1]);
  const minX = Math.min(...xs) - GRID_MARGIN;
  const minY = Math.min(...ys) - GRID_MARGIN;
  const cols = Math.ceil((Math.max(...xs) - minX + GRID_MARGIN) / GRID_CELL);
  const rows = Math.ceil((Math.max(...ys) - minY + GRID_MARGIN) / GRID_CELL);

  const index = (c, r) => r * cols + c;
  const blocked = new Uint8Array(cols * rows);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = minX + c * GRID_CELL + GRID_CELL / 2;
      const y = minY + r * GRID_CELL + GRID_CELL / 2;
      const solid = blockedAt(features, x, y, abilities);
      const water = waterAt(features, x, y);
      blocked[index(c, r)] = (solid || (waterBound && !water)) ? 1 : 0;
    }
  }

  const toCell = (point) => ({
    c: Math.floor((point[0] - minX) / GRID_CELL),
    r: Math.floor((point[1] - minY) / GRID_CELL),
  });

  const from = nearestFreeCell(blocked, cols, rows, toCell(start));
  const to = nearestFreeCell(blocked, cols, rows, toCell(goal));
  if (!from || !to) return { ok: false, reachable: 0, cells: cols * rows };

  const seen = new Uint8Array(cols * rows);
  const queue = [from];
  seen[index(from.c, from.r)] = 1;
  let visited = 0;

  while (queue.length) {
    const cell = queue.shift();
    visited++;
    if (cell.c === to.c && cell.r === to.r) {
      return { ok: true, reachable: visited, cells: cols * rows };
    }
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = cell.c + dc;
      const r = cell.r + dr;
      if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
      const i = index(c, r);
      if (blocked[i] || seen[i]) continue;
      seen[i] = 1;
      queue.push({ c, r });
    }
  }

  return { ok: false, reachable: visited, cells: cols * rows };
}

/** Can `to` be reached from `from` on the coarse grid, at these abilities? */
/**
 * Can `to` be reached from `from` on the coarse grid, at these abilities?
 *
 * `goalRadius` asks a different question: not "can the walker stand exactly
 * there", but "can it get *into that place*" — true when any free cell within the
 * radius is reached. The seed crowns need that, because their middle is solid to
 * a walking body and there is no free cell in there to stand on at all
 * (`nearestFreeCell` would otherwise helpfully step just outside the crown and
 * call the place reached).
 */
function reachableBetween(features, from, to, abilities, goalRadius = 0) {
  const pad = 260;
  const minX = Math.min(from.x, to.x) - pad;
  const minY = Math.min(from.y, to.y) - pad;
  const cols = Math.ceil((Math.abs(from.x - to.x) + pad * 2) / GRID_CELL);
  const rows = Math.ceil((Math.abs(from.y - to.y) + pad * 2) / GRID_CELL);

  const index = (c, r) => r * cols + c;
  const blocked = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = minX + c * GRID_CELL + GRID_CELL / 2;
      const y = minY + r * GRID_CELL + GRID_CELL / 2;
      blocked[index(c, r)] = blockedAt(features, x, y, abilities) ? 1 : 0;
    }
  }

  const toCell = (point) => ({
    c: Math.floor((point.x - minX) / GRID_CELL),
    r: Math.floor((point.y - minY) / GRID_CELL),
  });
  const start = nearestFreeCell(blocked, cols, rows, toCell(from));
  if (!start) return false;

  const goals = new Set();
  if (goalRadius > 0) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (blocked[index(c, r)]) continue;
        const x = minX + c * GRID_CELL + GRID_CELL / 2;
        const y = minY + r * GRID_CELL + GRID_CELL / 2;
        if (Math.hypot(x - to.x, y - to.y) <= goalRadius) goals.add(index(c, r));
      }
    }
    if (!goals.size) return false;
  } else {
    const goal = nearestFreeCell(blocked, cols, rows, toCell(to));
    if (!goal) return false;
    goals.add(index(goal.c, goal.r));
  }

  const seen = new Uint8Array(cols * rows);
  const queue = [start];
  seen[index(start.c, start.r)] = 1;
  while (queue.length) {
    const cell = queue.shift();
    if (goals.has(index(cell.c, cell.r))) return true;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = cell.c + dc;
      const r = cell.r + dr;
      if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
      const i = index(c, r);
      if (blocked[i] || seen[i]) continue;
      seen[i] = 1;
      queue.push({ c, r });
    }
  }
  return false;
}

/**
 * Prove the burrow is a real tunnel (docs/animal-lives-story.md "ทางออกที่ตรวจสอบได้"):
 * a tunnelling body reaches the seed chamber from the mouth, and a walking body
 * — same world, same start — cannot, because the root ring is unbroken otherwise.
 * Flyers are excluded from both runs: a bird may drop in from above, which is a
 * different road than the soil's.
 */
export function validateBurrowExit(features, abilities = {}) {
  const base = { ...abilities, flying: false };
  const burrowReaches = reachableBetween(features, BURROW.mouth, BURROW.chamber, { ...base, burrow: true });
  const walkerReaches = reachableBetween(features, BURROW.mouth, BURROW.chamber, { ...base, burrow: false });
  return { ok: burrowReaches && !walkerReaches, burrowReaches, walkerReaches };
}

/**
 * Prove the ant's nest is a small body's home (docs/animal-lives-story.md ch.3):
 * a small body slips through the crack from the fallen seed, while walking
 * bodies cannot — and neither can a tunnelling body that is not small, so the
 * crack and the burrow stay different doors.
 */
export function validateNestRoute(features, abilities = {}) {
  const base = { ...abilities, flying: false };
  const smallReaches = reachableBetween(features, NEST.seed, NEST.chamber, { ...base, small: true });
  const walkerReaches = reachableBetween(features, NEST.seed, NEST.chamber, { ...base, small: false, burrow: false });
  const tunnelReaches = reachableBetween(features, NEST.seed, NEST.chamber, { ...base, small: false, burrow: true });
  return { ok: smallReaches && !walkerReaches && !tunnelReaches, smallReaches, walkerReaches, tunnelReaches };
}

/**
 * Prove the marsh inlet is the frog's alone (docs/animal-lives-story.md ch.4):
 * a leaping body crosses the mire from the road side, while walking bodies,
 * tunnellers and small bodies are all stopped by it — the mud is not a burrow,
 * and nothing can squeeze through standing water.
 */
export function validateFrogRoute(features, abilities = {}) {
  const base = { ...abilities, flying: false };
  const start = MARSH_APPROACH[0];
  const from = { x: start[0], y: start[1] };
  const leapReaches = reachableBetween(features, from, MARSH.inlet, { ...base, leap: true });
  const walkerReaches = reachableBetween(features, from, MARSH.inlet, { ...base, leap: false });
  const tunnelReaches = reachableBetween(features, from, MARSH.inlet, { ...base, leap: false, burrow: true });
  const smallReaches = reachableBetween(features, from, MARSH.inlet, { ...base, leap: false, small: true });
  const ok = leapReaches && !walkerReaches && !tunnelReaches && !smallReaches;
  return { ok, leapReaches, walkerReaches, tunnelReaches, smallReaches };
}

/** The enclosure without its gate: what the world looks like once it is opened. */
export function enclosureWithGateOpen(features = assembleEnclosure()) {
  return features.filter((feature) => feature.gate !== true);
}

/**
 * Prove the enclosure's gate is *a door opened from the far side* (reserve table,
 * จิ้งจก): a clinging body reaches the inside by climbing the wall, a walking body
 * cannot — and once the gate is open, the same walker can walk straight in. The
 * life's whole point is that last line.
 */
export function validateGeckoRoute(features, abilities = {}) {
  const base = { ...abilities, flying: false };
  const start = ENCLOSURE_APPROACH[0];
  const from = { x: start[0], y: start[1] };
  const inside = ENCLOSURE.center;
  const climbReaches = reachableBetween(features, from, inside, { ...base, cling: true });
  const walkerBefore = reachableBetween(features, from, inside, { ...base, cling: false });
  const walkerAfter = reachableBetween(enclosureWithGateOpen(features), from, inside, { ...base, cling: false });
  const ok = climbReaches === true && walkerBefore === false && walkerAfter === true;
  return { ok, climbReaches, walkerBefore, walkerAfter };
}

/**
 * Prove the grove's mouth is *shut until strength opens it* (docs/animal-lives-story.md
 * ch.11): a strong body cannot reach the grove while the log lies across the
 * mouth, can once it is lifted, while a small body reaches it either way through
 * the crawlway — the same wall, one way for the large and one for the small.
 * Nothing here judges the body: the other direction of the same act (how the log
 * was lifted, and whether the nests survived) is decided in game/elephant.js.
 */
export function validateElephantRoute(features, abilities = {}) {
  const base = { ...abilities, flying: false };
  const start = GROVE_APPROACH[0];
  const from = { x: start[0], y: start[1] };
  const goal = GROVE.grove;
  const strong = { ...base, strong: true, small: false };
  const beforeLifting = reachableBetween(features, from, goal, strong);
  const afterLifting = reachableBetween(groveWithoutLog(features), from, goal, strong);
  const smallWithoutLifting = reachableBetween(features, from, goal, { ...base, strong: false, small: true });
  const walkerReaches = reachableBetween(features, from, goal, { ...base, strong: false, small: false });
  const ok = beforeLifting === false && afterLifting === true && smallWithoutLifting === true && walkerReaches === false;
  return { ok, beforeLifting, afterLifting, smallWithoutLifting, walkerReaches };
}

/**
 * Prove the far warren is reachable by leaping the gully (docs/animal-lives-story.md
 * ch.10). There is deliberately no timing here: the design says speed is not a
 * score, so the proof is only about the leap — walking bodies, small bodies,
 * tunnellers and slitherers are all stopped by the washed-out channel.
 */
export function validateRabbitRoute(features, abilities = {}) {
  const base = { ...abilities, flying: false };
  const start = FIELD_APPROACH[0];
  const from = { x: start[0], y: start[1] };
  const far = FIELD.warrens.find((warren) => warren.id === 'c');
  const leapReaches = reachableBetween(features, from, far, { ...base, leap: true });
  const walkerReaches = reachableBetween(features, from, far, { ...base, leap: false });
  const smallReaches = reachableBetween(features, from, far, { ...base, leap: false, small: true });
  const tunnelReaches = reachableBetween(features, from, far, { ...base, leap: false, burrow: true });
  const slitherReaches = reachableBetween(features, from, far, { ...base, leap: false, slither: true });
  const ok = leapReaches && !walkerReaches && !smallReaches && !tunnelReaches && !slitherReaches;
  return { ok, leapReaches, walkerReaches, smallReaches, tunnelReaches, slitherReaches };
}

/**
 * Prove the crevice is the snake's alone (docs/animal-lives-story.md ch.6): a
 * slithering body reaches the spring from the road side, while walking bodies,
 * small bodies (an ant is small, not flat) and tunnelling bodies cannot.
 */
export function validateSnakeRoute(features, abilities = {}) {
  const base = { ...abilities, flying: false };
  const start = CREVICE_APPROACH[0];
  const from = { x: start[0], y: start[1] };
  const slitherReaches = reachableBetween(features, from, CREVICE.spring, { ...base, slither: true });
  const walkerReaches = reachableBetween(features, from, CREVICE.spring, { ...base, slither: false });
  const smallReaches = reachableBetween(features, from, CREVICE.spring, { ...base, slither: false, small: true });
  const tunnelReaches = reachableBetween(features, from, CREVICE.spring, { ...base, slither: false, burrow: true });
  const ok = slitherReaches && !walkerReaches && !smallReaches && !tunnelReaches;
  return { ok, slitherReaches, walkerReaches, smallReaches, tunnelReaches };
}

/** Try seeds until one validates for this form; fall back to an empty world. */
export function buildDynamicWorld(seed, formId, abilities = {}, biomeId = 'memory-forest', options = {}) {
  for (let attempt = 0; attempt < MAX_SEED_TRIES; attempt++) {
    const trySeed = (seed + attempt) >>> 0;
    const features = assembleRooms(trySeed, biomeId, options);
    // Validation walks the road of the plane this life is born into.
    const validation = validateRoute(features, formId, abilities, biomeId);
    if (validation.ok) return { seed: trySeed, features, validation, attempts: attempt + 1 };
  }
  return {
    seed,
    features: [],
    validation: { ok: true, reachable: 0, cells: 0, fallback: true },
    attempts: MAX_SEED_TRIES,
  };
}
