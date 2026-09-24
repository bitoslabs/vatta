'use strict';

import { TAU, TEMPLE, SALA, WORLD } from '../core/constants.js';
import { dist, distToPoly } from '../core/math.js';
import { mulberry32 } from '../core/rng.js';
import {
  BURROW, BURROW_KEEPOUT, CREVICE, CREVICE_APPROACH, CREVICE_KEEPOUT,
  ENCLOSURE, ENCLOSURE_APPROACH, ENCLOSURE_KEEPOUTS,
  FIELD, FIELD_APPROACH, FIELD_KEEPOUTS, GROVE, GROVE_APPROACH, GROVE_KEEPOUTS,
  MARSH, MARSH_APPROACH, MARSH_KEEPOUT, MARSH_PONDS,
  NEST, NEST_KEEPOUT, PATH, RIVER, RIVER_WIDTH,
} from './world-data.js';
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

const SOLID_TYPES = new Set(['thicket', 'boulders', 'tower', 'stall', 'rootwall', 'stone', 'log', 'wall']);

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
  if (type === 'pebble') return 18 + rng() * 10;
  return 62;
}

const MARGIN_FROM_PATH = 46;
const GRID_CELL = 40;
const GRID_MARGIN = 220;
const MAX_SEED_TRIES = 12;

export function routeFor(formId) {
  return formId === 'fish' ? RIVER : PATH;
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
  return features.some((feature) => {
    if (feature.type === 'burrow') return abilities.burrow !== true && featureAt(feature, x, y);
    if (feature.type === 'crack') return abilities.small !== true && featureAt(feature, x, y);
    if (feature.type === 'mire') return abilities.leap !== true && featureAt(feature, x, y);
    if (feature.type === 'crevice') return abilities.slither !== true && featureAt(feature, x, y);
    if (feature.type === 'gully') return abilities.leap !== true && featureAt(feature, x, y);
    if (feature.type === 'crawlway') return abilities.small !== true && featureAt(feature, x, y);
    if (feature.type === 'wall') return abilities.cling !== true && featureAt(feature, x, y);
    if (!SOLID_TYPES.has(feature.type)) return false;
    if (feature.type === 'thicket') return abilities.climbing !== true && featureAt(feature, x, y);
    if (feature.type === 'boulders') return abilities.small !== true && featureAt(feature, x, y);
    return featureAt(feature, x, y);
  });
}

function mayPlace(type, x, y, radius) {
  if (x < 80 || y < 80 || x > WORLD.w - 80 || y > WORLD.h - 80) return false;
  if (dist(x, y, TEMPLE.x, TEMPLE.y) < TEMPLE.r + 60) return false;
  if (dist(x, y, SALA.x, SALA.y) < SALA.r + 60) return false;
  // Never cover the road itself; dressing sits beside it.
  if (distToPoly(PATH, x, y) < radius + MARGIN_FROM_PATH) return false;
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
export function assembleRooms(seed, biomeId = 'memory-forest') {
  const rng = mulberry32(seed);
  const features = [];
  const pool = (BIOMES[biomeId] && BIOMES[biomeId].features) || FEATURE_TYPES;

  for (let i = 1; i < PATH.length - 1; i++) {
    for (let k = 0; k < 2; k++) {
      if (rng() < 0.3) continue;
      const type = pool[(rng() * pool.length) | 0] || 'clearing';
      const angle = rng() * TAU;
      const reach = 130 + rng() * 110;
      const x = PATH[i][0] + Math.cos(angle) * reach;
      const y = PATH[i][1] + Math.sin(angle) * reach;
      const radius = featureRadius(type, rng);
      if (!mayPlace(type, x, y, radius)) continue;
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
export function validateRoute(features, formId, abilities = {}) {
  const waterBound = formId === 'fish';
  const route = routeFor(formId);
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
function reachableBetween(features, from, to, abilities) {
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
  const goal = nearestFreeCell(blocked, cols, rows, toCell(to));
  if (!start || !goal) return false;

  const seen = new Uint8Array(cols * rows);
  const queue = [start];
  seen[index(start.c, start.r)] = 1;
  while (queue.length) {
    const cell = queue.shift();
    if (cell.c === goal.c && cell.r === goal.r) return true;
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

/** Try seeds until one validates for this form; fall back to an empty world. */export function buildDynamicWorld(seed, formId, abilities = {}, biomeId = 'memory-forest') {
  for (let attempt = 0; attempt < MAX_SEED_TRIES; attempt++) {
    const trySeed = (seed + attempt) >>> 0;
    const features = assembleRooms(trySeed, biomeId);
    const validation = validateRoute(features, formId, abilities);
    if (validation.ok) return { seed: trySeed, features, validation, attempts: attempt + 1 };
  }
  return {
    seed,
    features: [],
    validation: { ok: true, reachable: 0, cells: 0, fallback: true },
    attempts: MAX_SEED_TRIES,
  };
}
