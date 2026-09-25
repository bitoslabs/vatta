'use strict';

import { MODE, TAU, WORLD } from '../core/constants.js';
import { clamp, dist } from '../core/math.js';
import { rng } from '../core/rng.js';
import { state } from '../core/state.js';
import { isMindful } from '../systems/input.js';
import { t } from '../systems/i18n.js';
import { getRealm } from '../systems/samsara.js';
import { teacherLandmarks, tourTarget } from '../systems/teacher.js';
import { floaters, lifeLights, screenNotes, sparks } from '../systems/effects.js';
import { ctx, viewport } from '../systems/viewport.js';
import { textures } from '../world/textures.js';
import {
  ENCLOSURE, FALSE_A, FALSE_B, FOOT, GATES, RIVER, RIVER_WIDTH, TREES,
  footprintsAlong, routeForPlane, saplingsAlong,
} from '../world/world-data.js';
import { cam } from '../game/camera.js';
import { ghosts } from '../entities/ghost.js';
import { player } from '../entities/player.js';
import { updateHud } from '../ui/hud.js';
import { canvasFont } from '../systems/fonts.js';
import { renderLighting, shakeOffset } from './lighting.js';
import { drawEncounter, drawGhost, drawGuardian, drawLure, drawPlayer, drawPrompt, drawSala, drawTeacherLabel, drawTemple, drawTourMarker, drawTree } from './sprites.js';
import { getLures } from '../game/lures.js';
import { bridgeSite, hasBridge, isWaterwayCleared } from '../game/world-memory.js';
import { burrowSite, rootWatered } from '../game/burrow.js';
import { isCarrying, nestSite, seedCarried } from '../game/ant.js';
import { marshSite, waterOpened } from '../game/frog.js';
import { creviceSite, isLinked } from '../game/snake.js';
import { fieldSite, isSheltered, warrenIsConnected } from '../game/rabbit.js';
import { nightWatched, owlFound, owlSite, perceivesLost } from '../game/owl.js';
import { groveSite, nestCrashed, waysJoined } from '../game/elephant.js';
import { caveSite, perceivesPup } from '../game/bat.js';
import { crownPicked, seedsScattered, seedsSite } from '../game/squirrel.js';
import { channelKept, tideSite, waterLevel } from '../game/crab.js';
import { holtSite, riverTended } from '../game/otter.js';
import { drifterPositions } from '../systems/drift.js';
import { bloomsSite, flowerVisited, forestPollinated, reachableFlower } from '../game/bee.js';
import { hearthsRespected, homeVisited, homesSite, peekedAt, warmStone } from '../game/cat.js';
import { bridgePoint, fordBridged, fordSite } from '../game/buffalo.js';
import { dampSite, trailKept } from '../game/snail.js';
import { boarSite, coloniesLost, groundTells, turnedSoil } from '../game/boar.js';
import { asuraSite, gatePoint, spanBuilt, spans } from '../game/asura-city.js';
import { gardenSite, gatePoint as gardenGatePoint, releasedBeds } from '../game/garden.js';
import { isLit, lightLevel } from '../systems/light.js';
import { waypoint } from '../systems/waypoint.js';
import { companionState } from '../systems/companion.js';
import { threads, webSite, webSpun } from '../game/spider.js';
import { drawFormBody } from './forms-sprites.js';
import { carriedCount, gatePoint as marketGatePoint, giftTaken, marketSite } from '../game/market.js';
import { marketAxis } from '../world/world-data.js';
import { isDamp as isDampNow, moistureLevel } from '../systems/moisture.js';
import { isHighTide as isHighTideNow } from '../systems/tide.js';
import { canTrack, inHollowRest, isHunted, tracksRead, trailSite } from '../game/tiger.js';
import { enclosureSite, gateOpened as geckoGateOpened } from '../game/gecko.js';
import { visionRadius } from '../systems/vision.js';
import { dynamicFeatures } from '../systems/worldgen.js';
import { currentBiome, currentBiomeId } from '../systems/biome.js';
import { getForm, isWaterBound } from '../systems/forms.js';
import { goalFor } from '../systems/goals.js';
import { guardianSpot } from '../game/npc.js';
import { ENCOUNTERS } from '../content/encounters.js';

/**
 * How each plane's road is *made* (design §7) — the same line the whole game
 * walks, laid in the material of that world: packed forest earth, a dug tunnel,
 * cramped black ground, paved city stone, pale garden sand, dusty market dirt,
 * and in the formless plane almost nothing at all.
 */
const ROUTE_LOOK = {
  'memory-forest': { width: 84, dawn: '#2a2115', night: '#10170d' },
  'under-root': { width: 74, dawn: '#241a10', night: '#0b0805' },
  woeful: { width: 62, dawn: '#141209', night: '#07060a' },
  'asura-city': { width: 92, dawn: '#3c382f', night: '#1b1a16' },
  'light-garden': { width: 88, dawn: '#6d6449', night: '#2b2c21' },
  'craving-market': { width: 80, dawn: '#4a3a28', night: '#1d1710' },
  formless: { width: 44, dawn: 'rgba(120,116,96,.16)', night: 'rgba(70,70,60,.14)' },
};

function routeLook(plane, dawn) {
  const look = ROUTE_LOOK[plane] || ROUTE_LOOK['memory-forest'];
  return { width: look.width, color: dawn ? look.dawn : look.night };
}

function drawPath(points, width, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.stroke();
}

export function renderWorld() {
  const { W, H } = viewport;
  const dawn = state.story.released;
  const mind = isMindful();

  ctx.fillStyle = dawn ? '#131b10' : '#050b08';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  const shake = shakeOffset();
  ctx.translate(Math.round(W / 2 - cam.x + shake.x), Math.round(H / 2 - cam.y + shake.y));

  drawGround(dawn);
  drawRiver(dawn);
  drawWorldMemory(dawn);
  drawPaths(dawn);
  drawDynamicRooms(dawn);
  drawBurrow(dawn);
  drawNest(dawn);
  drawMarsh(dawn);
  drawCrevice(dawn);
  drawField(dawn);
  drawOwlNight(dawn);
  drawGrove(dawn);
  drawTigerTrail(dawn);
  drawEnclosure(dawn);
  drawCave(dawn);
  drawSquirrelSeeds(dawn);
  drawTide(dawn);
  drawDrift(dawn);
  drawBlooms(dawn);
  drawHomes(dawn);
  drawFord(dawn);
  drawDampGround(dawn);
  drawBoarGround(dawn);
  drawWebSite(dawn);
  drawAsuraRooms(dawn);
  drawGardenRooms(dawn);
  drawMarketRooms(dawn);
  drawHolt(dawn);
  drawFootprints(mind);
  drawTemple(dawn);
  drawSala(dawn);
  drawLightGates(mind);
  drawSparks();
  drawLures();
  drawLifeGoal();
  const guardian = guardianSpot();
  drawGuardian(guardian.x, guardian.y);
  for (const encounter of ENCOUNTERS) drawEncounter(encounter.x, encounter.y, encounter.kind);
  drawEntities(dawn);
  drawTeacherOverlay();
  drawInteractionPrompt();

  ctx.restore();

  renderLighting(mind);
  drawRealmVeil();
  if (state.chapter === 2) {
    // Ember veil for the anger chapter.
    ctx.fillStyle = 'rgba(120,30,20,.05)';
    ctx.fillRect(0, 0, W, H);
  } else if (state.chapter === 8) {
    // Indigo veil for the mirror chapter (Part 2).
    ctx.fillStyle = 'rgba(40,50,90,.07)';
    ctx.fillRect(0, 0, W, H);
  } else if (state.chapter === 9) {
    // Dusky violet for the habit chapter.
    ctx.fillStyle = 'rgba(60,50,80,.07)';
    ctx.fillRect(0, 0, W, H);
  } else if (state.chapter === 10) {
    // Rose-grey for the growing shadow.
    ctx.fillStyle = 'rgba(80,40,60,.07)';
    ctx.fillRect(0, 0, W, H);
  } else if (state.chapter === 11) {
    // Two-tinted dusk for the pair.
    ctx.fillStyle = 'rgba(70,45,70,.07)';
    ctx.fillRect(0, 0, W, H);
  } else if (state.chapter === 12) {
    // Cold steel for the dividing spirit.
    ctx.fillStyle = 'rgba(45,55,75,.07)';
    ctx.fillRect(0, 0, W, H);
  } else if (state.chapter === 13) {
    // Ash-grey closing veil for the Part Two finale.
    ctx.fillStyle = 'rgba(60,55,70,.08)';
    ctx.fillRect(0, 0, W, H);
  } else if (state.chapter === 14) {
    // First-light veil for the capstone.
    ctx.fillStyle = 'rgba(70,70,55,.07)';
    ctx.fillRect(0, 0, W, H);
  }

  // The realm's own veil sits over the chapter's.
  const biomeVeil = currentBiome().veil;
  if (biomeVeil) {
    ctx.fillStyle = biomeVeil;
    ctx.fillRect(0, 0, W, H);
  }
  drawFog();
  drawFloaters();
  drawScreenNotes();
  drawFearVignette();
  drawGrain();

  updateHud(mind);
}

function drawGround(dawn) {
  ctx.fillStyle = dawn ? textures.groundDawn : textures.groundNight;
  ctx.fillRect(-60, -60, WORLD.w + 120, WORLD.h + 120);
  // The plane you were born into re-tints the same ground.
  ctx.fillStyle = currentBiome().ground;
  ctx.fillRect(-60, -60, WORLD.w + 120, WORLD.h + 120);
}

/** Seed-assembled dressing: thickets, boulders, ponds and clearings. */
function drawDynamicRooms(dawn) {
  for (const feature of dynamicFeatures()) {
    if (feature.type === 'pond') {
      ctx.fillStyle = dawn ? '#1d3c58' : '#0b2035';
      ctx.beginPath();
      ctx.ellipse(feature.x, feature.y, feature.r, feature.r * 0.66, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(140,190,220,.22)';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (feature.type === 'boulders') {
      for (let i = 0; i < 3; i++) {
        const a = i * 2.1;
        ctx.fillStyle = dawn ? '#5b564d' : '#2b2a26';
        ctx.beginPath();
        ctx.ellipse(
          feature.x + Math.cos(a) * feature.r * 0.45,
          feature.y + Math.sin(a) * feature.r * 0.35,
          feature.r * 0.6, feature.r * 0.44, 0, 0, TAU,
        );
        ctx.fill();
      }
    } else if (feature.type === 'thicket') {
      for (let i = 0; i < 4; i++) {
        const a = i * 1.7;
        ctx.fillStyle = dawn ? '#2c4425' : '#0e2013';
        ctx.beginPath();
        ctx.arc(feature.x + Math.cos(a) * feature.r * 0.5, feature.y + Math.sin(a) * feature.r * 0.5, feature.r * 0.55, 0, TAU);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = dawn ? 'rgba(60,70,40,.18)' : 'rgba(40,55,35,.18)';
      ctx.beginPath();
      ctx.ellipse(feature.x, feature.y, feature.r, feature.r * 0.7, 0, 0, TAU);
      ctx.fill();
    }
  }
}

/**
 * The soil under the great root (docs/animal-lives-story.md ch.2): hard root the
 * road bends around, the soft mouth a tunnelling body passes, loose pebbles, and
 * the seed inside the chamber that waters the root when it is reached.
 */
function drawBurrow(dawn) {
  const features = dynamicFeatures();
  // The chamber only exists where the soil is this life's plane.
  const hasChamber = features.some((feature) => feature.type === 'rootwall' && feature.fixed === true);

  for (const feature of features) {
    if (feature.type === 'rootwall') {
      ctx.fillStyle = dawn ? '#4a3620' : '#241a10';
      ctx.beginPath();
      ctx.arc(feature.x, feature.y, feature.r, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = dawn ? 'rgba(120,96,58,.5)' : 'rgba(150,116,68,.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(feature.x, feature.y, feature.r * 0.72, 0, TAU);
      ctx.stroke();
    } else if (feature.type === 'burrow') {
      ctx.fillStyle = dawn ? 'rgba(58,42,26,.85)' : 'rgba(26,18,10,.9)';
      ctx.beginPath();
      ctx.arc(feature.x, feature.y, feature.r, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(190,160,110,.22)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.arc(feature.x, feature.y, feature.r * 0.8, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (feature.type === 'pebble') {
      ctx.fillStyle = dawn ? 'rgba(120,112,96,.5)' : 'rgba(80,74,62,.6)';
      ctx.beginPath();
      ctx.ellipse(feature.x, feature.y, feature.r, feature.r * 0.68, 0, 0, TAU);
      ctx.fill();
    }
  }

  if (!hasChamber) return;

  // The way in, and the seed waiting at the end of it.
  const { mouth, chamber } = burrowSite();
  ctx.strokeStyle = 'rgba(200,170,120,.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(mouth.x, mouth.y, 26, 17, 0, 0, TAU);
  ctx.stroke();

  const stored = rootWatered();
  const glow = stored ? 'rgba(198,232,206,.5)' : 'rgba(214,190,120,.42)';
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(chamber.x, chamber.y, 9, 6, 0.6, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = stored ? 'rgba(198,232,206,.5)' : 'rgba(214,190,120,.28)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(chamber.x, chamber.y, 26 + Math.sin(performance.now() * 0.002) * 3, 0, TAU);
  ctx.stroke();
  if (stored) {
    ctx.strokeStyle = 'rgba(160,210,150,.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(chamber.x, chamber.y - 4);
    ctx.quadraticCurveTo(chamber.x - 6, chamber.y - 22, chamber.x - 13, chamber.y - 26);
    ctx.moveTo(chamber.x, chamber.y - 4);
    ctx.quadraticCurveTo(chamber.x + 6, chamber.y - 22, chamber.x + 13, chamber.y - 26);
    ctx.stroke();
  }
}

/**
 * The ant's errand (docs/animal-lives-story.md ch.3): the fallen seed, the crack
 * only a small body fits, and the sprouts that come up once a seed is carried
 * home — the forest the errand planted.
 */
function drawNest(dawn) {
  const features = dynamicFeatures();
  const hasNest = features.some((feature) => feature.type === 'crack');
  if (!hasNest) return;
  const { seed, chamber } = nestSite();

  for (const feature of features) {
    if (feature.type !== 'crack') continue;
    ctx.fillStyle = dawn ? 'rgba(30,22,12,.75)' : 'rgba(14,10,6,.8)';
    ctx.beginPath();
    ctx.ellipse(feature.x, feature.y, feature.r * 0.7, feature.r * 1.15, 0, 0, TAU);
    ctx.fill();
  }

  // The nest mound, and the way in.
  ctx.fillStyle = dawn ? 'rgba(84,62,38,.85)' : 'rgba(38,28,16,.9)';
  ctx.beginPath();
  ctx.ellipse(chamber.x, chamber.y, 108, 78, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = dawn ? 'rgba(40,28,14,.8)' : 'rgba(16,11,6,.85)';
  ctx.beginPath();
  ctx.ellipse(chamber.x, chamber.y, 34, 24, 0, 0, TAU);
  ctx.fill();

  // The seed this life is meant to carry.
  if (!isCarrying()) {
    ctx.fillStyle = dawn ? 'rgba(226,200,132,.95)' : 'rgba(200,172,104,.9)';
    for (const [dx, dy] of [[0, 0], [13, 6], [-11, 7]]) {
      ctx.beginPath();
      ctx.ellipse(seed.x + dx, seed.y + dy, 7, 4.6, 0.5, 0, TAU);
      ctx.fill();
    }
  }

  // Once carried, the route remembers: small shoots along the way home.
  if (seedCarried()) {
    ctx.strokeStyle = 'rgba(168,206,140,.8)';
    ctx.lineWidth = 2;
    for (const [offset, height] of [[0, 30], [46, 22], [-40, 26], [92, 18]]) {
      const x = seed.x + (offset * 0.5);
      const y = seed.y + 60 + Math.abs(offset) * 0.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x - 5, y - height * 0.6, x - 9, y - height);
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 5, y - height * 0.6, x + 9, y - height);
      ctx.stroke();
    }
  }
}

/**
 * The marsh (docs/animal-lives-story.md ch.4): deep mire only a leap crosses, the
 * blocked channel inside it, and — once the channel is opened — water running
 * down to the lower forest.
 */
function drawMarsh(dawn) {
  const features = dynamicFeatures();
  const hasMarsh = features.some((feature) => feature.type === 'mire');
  if (!hasMarsh) return;
  const { inlet, bank } = marshSite();
  const opened = waterOpened();

  for (const feature of features) {
    if (feature.type !== 'mire') continue;
    ctx.fillStyle = dawn ? 'rgba(38,46,34,.9)' : 'rgba(18,24,18,.92)';
    ctx.beginPath();
    ctx.arc(feature.x, feature.y, feature.r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = dawn ? 'rgba(70,86,64,.35)' : 'rgba(40,54,42,.4)';
    for (let i = 0; i < 3; i++) {
      const angle = i * 2.1 + feature.x * 0.01;
      ctx.beginPath();
      ctx.arc(
        feature.x + Math.cos(angle) * feature.r * 0.42,
        feature.y + Math.sin(angle) * feature.r * 0.42,
        feature.r * 0.22, 0, TAU,
      );
      ctx.fill();
    }
  }

  // The channel gate: closed boards, or a running spill once it is opened.
  ctx.fillStyle = dawn ? '#4a3520' : '#2a1d10';
  ctx.fillRect(inlet.x - 26, inlet.y - 10, 52, 20);
  if (opened) {
    const flow = 0.6 + Math.sin(performance.now() * 0.003) * 0.25;
    ctx.strokeStyle = `rgba(150,205,235,${flow * 0.7})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(inlet.x, inlet.y + 10);
    ctx.quadraticCurveTo(inlet.x + 60, inlet.y + 120, inlet.x + 30, inlet.y + 240);
    ctx.stroke();
    ctx.strokeStyle = `rgba(150,205,235,${flow * 0.35})`;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(inlet.x + 6, inlet.y + 14);
    ctx.quadraticCurveTo(inlet.x + 70, inlet.y + 130, inlet.x + 44, inlet.y + 250);
    ctx.stroke();
  } else {
    ctx.strokeStyle = 'rgba(200,180,140,.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(inlet.x - 30, inlet.y - 14);
    ctx.lineTo(inlet.x + 30, inlet.y + 14);
    ctx.stroke();
  }

  // The bank: reeds, and the eggs once this life has spawned.
  ctx.fillStyle = dawn ? 'rgba(96,84,54,.9)' : 'rgba(44,38,24,.9)';
  ctx.beginPath();
  ctx.ellipse(bank.x, bank.y, 62, 34, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = dawn ? 'rgba(120,146,96,.8)' : 'rgba(96,124,80,.75)';
  ctx.lineWidth = 2;
  for (const offset of [-34, -12, 14, 36]) {
    const sway = Math.sin(performance.now() * 0.0012 + offset) * 2.4;
    ctx.beginPath();
    ctx.moveTo(bank.x + offset, bank.y + 12);
    ctx.quadraticCurveTo(bank.x + offset + sway, bank.y - 14, bank.x + offset + sway * 2, bank.y - 34);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(226,238,214,.5)';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(bank.x - 18 + i * 9, bank.y + 26, 3.4, 0, TAU);
    ctx.fill();
  }
}

/**
 * The crevice and the sealed spring (docs/animal-lives-story.md ch.6): stone that
 * only a flattened body slips through, the spring inside, and — once the slot is
 * widened — water running out to the river.
 */
function drawCrevice(dawn) {
  const features = dynamicFeatures();
  const hasStone = features.some((feature) => feature.type === 'stone');
  if (!hasStone) return;
  const { spring, outflow } = creviceSite();
  const linked = isLinked();

  for (const feature of features) {
    if (feature.type === 'stone') {
      ctx.fillStyle = dawn ? '#6a6a62' : '#33352f';
      ctx.beginPath();
      ctx.arc(feature.x, feature.y, feature.r, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = dawn ? 'rgba(168,168,158,.45)' : 'rgba(120,124,116,.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(feature.x, feature.y, feature.r * 0.7, 0.6, 2.6);
      ctx.stroke();
    } else if (feature.type === 'crevice') {
      ctx.fillStyle = dawn ? 'rgba(20,20,18,.55)' : 'rgba(8,8,8,.6)';
      ctx.beginPath();
      ctx.ellipse(feature.x, feature.y, feature.r * 0.42, feature.r * 1.25, 0, 0, TAU);
      ctx.fill();
    }
  }

  // The water inside the stone.
  ctx.fillStyle = dawn ? 'rgba(60,120,160,.9)' : 'rgba(22,58,86,.92)';
  ctx.beginPath();
  ctx.ellipse(spring.x, spring.y, 68, 50, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = `rgba(150,205,235,${linked ? 0.5 : 0.22})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(spring.x, spring.y, 74, 56, 0, 0, TAU);
  ctx.stroke();

  if (linked) {
    // The link: the spring runs out of the stone and down to the river.
    const flow = 0.6 + Math.sin(performance.now() * 0.0026) * 0.25;
    ctx.strokeStyle = `rgba(150,205,235,${flow * 0.8})`;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(spring.x, spring.y);
    ctx.quadraticCurveTo((spring.x + outflow.x) / 2, outflow.y - 60, outflow.x, outflow.y);
    ctx.lineTo(outflow.x - 150, outflow.y + 90);
    ctx.stroke();
    ctx.strokeStyle = `rgba(190,230,250,${flow * 0.4})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(spring.x, spring.y + 6);
    ctx.quadraticCurveTo((spring.x + outflow.x) / 2, outflow.y - 44, outflow.x, outflow.y + 6);
    ctx.stroke();
  } else {
    ctx.strokeStyle = 'rgba(200,196,180,.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(spring.x - 30, spring.y - 30);
    ctx.lineTo(spring.x + 30, spring.y + 30);
    ctx.stroke();
  }
}

/**
 * The field, the washed rim and the warrens (docs/animal-lives-story.md ch.10):
 * a gully only a leap crosses, the warrens the rabbit joins one by one, and the
 * meadow the life finishes in. Once the shelter was shared, the warrens glow
 * faintly — they are shelters for every body now.
 */
function drawField(dawn) {
  const features = dynamicFeatures();
  const hasGully = features.some((feature) => feature.type === 'gully');
  if (!hasGully) return;
  const { meadow, warrens } = fieldSite();
  const sheltered = isSheltered();

  for (const feature of features) {
    if (feature.type !== 'gully') continue;
    ctx.fillStyle = dawn ? 'rgba(96,80,54,.85)' : 'rgba(46,38,24,.9)';
    ctx.beginPath();
    ctx.ellipse(feature.x, feature.y, feature.r * 1.1, feature.r * 0.8, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = dawn ? 'rgba(150,128,88,.35)' : 'rgba(110,92,60,.35)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(feature.x, feature.y, feature.r * 0.6, 0, TAU);
    ctx.stroke();
  }

  for (const warren of warrens) {
    const joined = warrenIsConnected(warren.id);
    ctx.fillStyle = dawn ? 'rgba(84,64,40,.9)' : 'rgba(38,28,16,.92)';
    ctx.beginPath();
    ctx.ellipse(warren.x, warren.y, 58, 40, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = dawn ? 'rgba(28,20,10,.9)' : 'rgba(12,8,4,.92)';
    ctx.beginPath();
    ctx.ellipse(warren.x, warren.y + 8, 22, 15, 0, 0, TAU);
    ctx.fill();
    if (joined) {
      ctx.strokeStyle = sheltered ? 'rgba(226,206,148,.75)' : 'rgba(200,182,140,.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(warren.x, warren.y - 4, 40 + Math.sin(performance.now() * 0.002) * 2, 0, TAU);
      ctx.stroke();
    }
    if (sheltered) {
      ctx.fillStyle = 'rgba(233,217,160,.16)';
      ctx.beginPath();
      ctx.arc(warren.x, warren.y - 4, 62, 0, TAU);
      ctx.fill();
    }
  }

  // The open field: grass, and the storm the life is preparing for.
  ctx.fillStyle = dawn ? 'rgba(74,96,54,.5)' : 'rgba(34,52,30,.55)';
  ctx.beginPath();
  ctx.ellipse(meadow.x, meadow.y, 96, 62, 0, 0, TAU);
  ctx.fill();
}

/**
 * The night and the lost ones (docs/animal-lives-story.md ch.13): the roost, and
 * the animals waiting in the dark — drawn only when the body wearing them can
 * actually perceive them (systems/vision.js). This is the one place in the game
 * where a form's eyes change what exists on screen.
 */
function drawOwlNight(dawn) {
  if (getForm().lifeGoal !== 'watch') return;
  const { roost, lost } = owlSite();
  const radius = visionRadius(false);

  // The roost tree stands whatever the light.
  ctx.fillStyle = dawn ? '#4a3620' : '#241a10';
  ctx.fillRect(roost.x - 9, roost.y - 120, 18, 120);
  ctx.beginPath();
  ctx.arc(roost.x, roost.y - 140, 62, 0, TAU);
  ctx.fill();
  ctx.fillStyle = dawn ? 'rgba(70,92,58,.9)' : 'rgba(30,44,28,.9)';
  ctx.beginPath();
  ctx.arc(roost.x - 24, roost.y - 152, 40, 0, TAU);
  ctx.arc(roost.x + 26, roost.y - 148, 38, 0, TAU);
  ctx.fill();
  if (nightWatched()) {
    ctx.strokeStyle = 'rgba(203,214,234,.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(roost.x, roost.y - 140, 78 + Math.sin(performance.now() * 0.002) * 3, 0, TAU);
    ctx.stroke();
  }

  for (const animal of lost) {
    const seen = perceivesLost(animal);
    const found = owlFound(animal.id);
    if (!seen && !found) continue;
    const fade = found ? 0.45 : 1;
    ctx.globalAlpha = fade;
    // A small hunched body, and the eyes that give it away in the dark.
    ctx.fillStyle = dawn ? '#7a6a52' : '#3a3324';
    ctx.beginPath();
    ctx.ellipse(animal.x, animal.y, 22, 15, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = dawn ? '#6b5c46' : '#2e2919';
    ctx.beginPath();
    ctx.arc(animal.x + 18, animal.y - 10, 10, 0, TAU);
    ctx.fill();
    if (!found) {
      ctx.fillStyle = 'rgba(226,238,214,.85)';
      ctx.beginPath();
      ctx.arc(animal.x + 20, animal.y - 12, 2.6, 0, TAU);
      ctx.arc(animal.x + 25, animal.y - 12, 2.6, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

/**
 * The walled grove, the fallen log and the nests beneath it
 * (docs/animal-lives-story.md ch.11): the same wall with one way for the large
 * and one for the small, and the two little homes whose wholeness is the whole
 * question. Nests crushed in any life stay crushed in every later one.
 */
function drawGrove(dawn) {
  const features = dynamicFeatures();
  const hasGrove = features.some((feature) => feature.site === 'grove');
  if (!hasGrove) return;
  const { grove, nests } = groveSite();

  for (const feature of features) {
    if (feature.type === 'stone') {
      ctx.fillStyle = dawn ? '#6a6a62' : '#33352f';
      ctx.beginPath();
      ctx.arc(feature.x, feature.y, feature.r, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = dawn ? 'rgba(168,168,158,.4)' : 'rgba(120,124,116,.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(feature.x, feature.y, feature.r * 0.66, 0.4, 2.8);
      ctx.stroke();
    } else if (feature.type === 'crawlway') {
      ctx.fillStyle = dawn ? 'rgba(30,30,26,.5)' : 'rgba(10,10,8,.6)';
      ctx.beginPath();
      ctx.ellipse(feature.x, feature.y, feature.r * 0.8, feature.r * 1.2, 0, 0, TAU);
      ctx.fill();
    } else if (feature.type === 'log') {
      // The fallen trunk across the mouth, bark and rings.
      ctx.save();
      ctx.translate(feature.x, feature.y);
      ctx.rotate(-0.12);
      ctx.fillStyle = dawn ? '#5a4227' : '#2b2012';
      ctx.beginPath();
      ctx.ellipse(0, 0, feature.r * 1.35, feature.r * 0.62, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = dawn ? 'rgba(150,116,68,.5)' : 'rgba(120,92,52,.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(-feature.r * 1.1, 0, feature.r * 0.2, feature.r * 0.5, 0, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(feature.r * 1.1, 0, feature.r * 0.2, feature.r * 0.5, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  // The gathering place inside: trampled ground, and the little homes outside.
  ctx.fillStyle = dawn ? 'rgba(86,74,48,.45)' : 'rgba(44,38,22,.5)';
  ctx.beginPath();
  ctx.ellipse(grove.x, grove.y, 96, 66, 0, 0, TAU);
  ctx.fill();

  for (const nest of nests) {
    const broken = nestCrashed(nest.id);
    ctx.strokeStyle = broken ? 'rgba(150,110,90,.75)' : 'rgba(190,166,112,.8)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * TAU + (broken ? 0.4 : 0);
      const radius = broken ? 8 + i * 3 : 26 * (broken ? 0.4 : 1);
      ctx.beginPath();
      ctx.moveTo(nest.x, nest.y);
      ctx.lineTo(nest.x + Math.cos(angle) * radius, nest.y + Math.sin(angle) * radius * 0.8);
      ctx.stroke();
    }
    ctx.fillStyle = broken ? 'rgba(70,52,40,.8)' : 'rgba(122,98,62,.85)';
    ctx.beginPath();
    ctx.ellipse(nest.x, nest.y, 20, 13, 0, 0, TAU);
    ctx.fill();
    if (waysJoined() && !broken) {
      ctx.fillStyle = 'rgba(233,217,160,.14)';
      ctx.beginPath();
      ctx.arc(nest.x, nest.y, 48, 0, TAU);
      ctx.fill();
    }
  }
}

/**
 * The trail, the rival and the range (docs/animal-lives-story.md ch.12): real
 * tracks in order, readable only by a body that reads trails — or by any body at
 * all once a tiger left the fight unpicked. The hollow is a place of rest in that
 * case, and an empty, hunted place if it was not.
 */
function drawTigerTrail(dawn) {
  if (getForm().lifeGoal !== 'trail') return;
  const { tracks, hollow, range } = trailSite();
  const step = tracksRead();
  const readable = canTrack();

  // The tiger's own range.
  ctx.strokeStyle = dawn ? 'rgba(150,120,80,.4)' : 'rgba(120,96,64,.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(range.x, range.y, 86, 58, 0, 0, TAU);
  ctx.stroke();

  for (const [index, track] of tracks.entries()) {
    const isNext = readable && index === step;
    const already = index < step;
    // A track is a pair of paw prints, and a mistake to read out of order.
    ctx.fillStyle = already
      ? (dawn ? 'rgba(120,98,70,.35)' : 'rgba(80,66,46,.35)')
      : (dawn ? 'rgba(60,48,32,.85)' : 'rgba(24,20,14,.85)');
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(track.x + side * 11, track.y + side * 7, 7, 9, 0, 0, TAU);
      ctx.fill();
    }
    // Only the next one in the chain is lit — following is one step at a time.
    if (isNext) {
      ctx.strokeStyle = `rgba(216,200,180,${0.4 + Math.sin(performance.now() * 0.003) * 0.2})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(track.x, track.y, 34, 0, TAU);
      ctx.stroke();
    }
  }

  // The hollow: a rival resting, or the place a fight was not picked.
  const resting = inHollowRest(hollow.x, hollow.y);
  ctx.fillStyle = dawn ? 'rgba(40,44,32,.5)' : 'rgba(16,20,14,.55)';
  ctx.beginPath();
  ctx.ellipse(hollow.x, hollow.y, 104, 68, 0, 0, TAU);
  ctx.fill();
  if (!isHunted()) {
    ctx.fillStyle = dawn ? 'rgba(70,62,48,.9)' : 'rgba(30,26,20,.92)';
    ctx.beginPath();
    ctx.ellipse(hollow.x, hollow.y, 42, 26, -0.15, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(228,214,180,.75)';
    ctx.beginPath();
    ctx.arc(hollow.x + 26, hollow.y - 8, 3, 0, TAU);
    ctx.fill();
    if (resting) {
      ctx.strokeStyle = `rgba(216,200,180,${0.2 + Math.sin(performance.now() * 0.002) * 0.08})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hollow.x, hollow.y, 118, 0, TAU);
      ctx.stroke();
    }
  }
}

/**
 * The walled enclosure and its gate (reserve table, จิ้งจก): a sheer ring only a
 * clinging body climbs, a barred gate that only opens from the inside, and the
 * refuge every body walks into once it has been opened.
 */
function drawEnclosure(dawn) {
  const features = dynamicFeatures();
  const walls = features.filter((feature) => feature.type === 'wall');
  if (!walls.length) return;
  const { center, refugeRadius } = enclosureSite();
  const opened = geckoGateOpened();

  for (const wall of walls) {
    if (wall.gate === true && !opened) {
      // The barred gate: a wall with a bar across it.
      ctx.fillStyle = dawn ? '#7a6a4a' : '#3a3220';
      ctx.fillRect(wall.x - wall.r, wall.y - 8, wall.r * 2, 16);
      ctx.strokeStyle = 'rgba(226,206,148,.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(wall.x - wall.r, wall.y);
      ctx.lineTo(wall.x + wall.r, wall.y);
      ctx.stroke();
      continue;
    }
    if (wall.gate === true) continue; // an opened gate is simply gone
    ctx.fillStyle = dawn ? '#5e5e56' : '#2c2e28';
    ctx.beginPath();
    ctx.arc(wall.x, wall.y, wall.r, 0, TAU);
    ctx.fill();
    // courses of stone, so a wall reads as built rather than as a boulder
    ctx.strokeStyle = dawn ? 'rgba(150,150,140,.35)' : 'rgba(110,114,106,.3)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(wall.x - wall.r * 0.8, wall.y - wall.r * 0.3);
    ctx.lineTo(wall.x + wall.r * 0.8, wall.y - wall.r * 0.3);
    ctx.moveTo(wall.x - wall.r * 0.8, wall.y + wall.r * 0.3);
    ctx.lineTo(wall.x + wall.r * 0.8, wall.y + wall.r * 0.3);
    ctx.stroke();
  }

  // The refuge inside: mossy ground, and a warm ring once it is open to all.
  ctx.fillStyle = dawn ? 'rgba(74,92,60,.45)' : 'rgba(32,48,32,.5)';
  ctx.beginPath();
  ctx.ellipse(center.x, center.y, refugeRadius, refugeRadius * 0.8, 0, 0, TAU);
  ctx.fill();
  if (opened) {
    ctx.strokeStyle = `rgba(185,201,168,${0.25 + Math.sin(performance.now() * 0.002) * 0.08})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center.x, center.y, refugeRadius + 26, 0, TAU);
    ctx.stroke();
    // the gate the gecko left open, drawn as a gap in the ring
    ctx.strokeStyle = 'rgba(226,206,148,.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(center.x, center.y, ENCLOSURE.ring, Math.PI / 2 - 0.12, Math.PI / 2 + 0.12);
    ctx.stroke();
  }
}

/**
 * The dry ridge and the damp garden (story table, หอยทาก): pale cracked ground that
 * is a wall to one body only, the garden inside it, and the sheen the whole world
 * takes on while the ground is damp (systems/moisture.js). A trail an earlier snail
 * left keeps the crossing damp, and is drawn as such.
 */
function drawDampGround(dawn) {
  const { hollow, garden, ring } = dampSite();
  const damp = isDampNow();
  const trail = trailKept();

  // The sheen: while the ground is damp, the whole floor catches the light a little.
  if (damp) {
    ctx.fillStyle = `rgba(168,198,180,${0.04 + moistureLevel() * 0.05})`;
    ctx.fillRect(0, 0, viewport.W, viewport.H);
  }

  if (getForm().lifeGoal !== 'damp' && !trail) return;

  // The ridge: dry, cracked, and drawn as what it is.
  for (const feature of dynamicFeatures()) {
    if (feature.type !== 'dry') continue;
    ctx.fillStyle = dawn ? 'rgba(150,140,116,.55)' : 'rgba(96,90,74,.5)';
    ctx.beginPath();
    ctx.ellipse(feature.x, feature.y, feature.r, feature.r * 0.7, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = trail
      ? `rgba(168,198,180,${0.4 + Math.sin(performance.now() * 0.002) * 0.12})`
      : 'rgba(120,110,88,.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(feature.x - feature.r * 0.6, feature.y - feature.r * 0.3);
    ctx.lineTo(feature.x + feature.r * 0.5, feature.y + feature.r * 0.2);
    ctx.stroke();
  }

  // The garden at the end, and the hollow it set out from.
  ctx.fillStyle = dawn ? 'rgba(86,112,74,.5)' : 'rgba(40,56,38,.55)';
  ctx.beginPath();
  ctx.ellipse(garden.x, garden.y, ring - 44, (ring - 44) * 0.8, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = dawn ? 'rgba(70,96,120,.5)' : 'rgba(30,48,64,.55)';
  ctx.beginPath();
  ctx.ellipse(hollow.x, hollow.y, 84, 58, 0, 0, TAU);
  ctx.fill();

  if (trail) {
    // The damp trail a snail left: a wet line from the hollow to the garden.
    ctx.strokeStyle = `rgba(168,198,180,${0.3 + Math.sin(performance.now() * 0.0016) * 0.08})`;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hollow.x, hollow.y);
    ctx.lineTo(garden.x, garden.y);
    ctx.stroke();
  }
}

/**
 * The feeding ground (story table, หมูป่า): the ring of packed earth — opened where
 * a life rooted through it — the root patches inside, the quiet bare places where
 * colonies were crushed, and the shoots that come up where a life turned the soil.
 *
 * The tell is the whole story: within reach of its nose a boar *sees* which patch
 * has small lives under it (`groundTells`), so the ground itself is what the life
 * asks the player to notice.
 */
function drawBoarGround(dawn) {
  const { feed, wallow, ring } = boarSite();
  const tells = groundTells();
  const turned = turnedSoil();
  const lost = coloniesLost();

  // The wallow, and the ground inside the ring.
  ctx.fillStyle = dawn ? 'rgba(74,60,42,.5)' : 'rgba(28,22,14,.55)';
  ctx.beginPath();
  ctx.ellipse(wallow.x, wallow.y, 78, 52, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = dawn ? 'rgba(96,86,58,.28)' : 'rgba(46,40,26,.3)';
  ctx.beginPath();
  ctx.ellipse(feed.x, feed.y, ring - 50, (ring - 50) * 0.84, 0, 0, TAU);
  ctx.fill();

  // The ring: packed earth, hollow where a life opened it.
  for (const feature of dynamicFeatures()) {
    if (feature.type !== 'mound') continue;
    if (feature.dug === true) {
      // Broken open: a shallow hollow of turned earth, and a way through.
      ctx.fillStyle = dawn ? 'rgba(112,96,64,.4)' : 'rgba(52,44,28,.45)';
      ctx.beginPath();
      ctx.ellipse(feature.x, feature.y, feature.r * 0.8, feature.r * 0.58, 0, 0, TAU);
      ctx.fill();
      continue;
    }
    ctx.fillStyle = dawn ? 'rgba(126,108,74,.55)' : 'rgba(58,48,32,.6)';
    ctx.beginPath();
    ctx.ellipse(feature.x, feature.y, feature.r, feature.r * 0.72, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,132,96,.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(feature.x, feature.y, feature.r * 0.55, feature.r * 0.38, 0, 0, TAU);
    ctx.stroke();
  }

  // The root patches, and the tell: a patch with a colony under it stirs.
  for (const feature of dynamicFeatures()) {
    if (feature.type !== 'root') continue;
    ctx.fillStyle = feature.regrown === true
      ? (dawn ? 'rgba(104,120,64,.5)' : 'rgba(52,64,34,.55)')
      : (dawn ? 'rgba(96,84,54,.5)' : 'rgba(48,40,26,.55)');
    ctx.beginPath();
    ctx.ellipse(feature.x, feature.y, feature.r, feature.r * 0.7, 0, 0, TAU);
    ctx.fill();
    // Roots showing through: short strokes.
    ctx.strokeStyle = 'rgba(160,142,96,.35)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const angle = i * 1.7 + feature.x * 0.01;
      ctx.beginPath();
      ctx.moveTo(feature.x, feature.y);
      ctx.lineTo(feature.x + Math.cos(angle) * feature.r * 0.8, feature.y + Math.sin(angle) * feature.r * 0.55);
      ctx.stroke();
    }
    const told = tells.find((tell) => tell.x === feature.x && tell.y === feature.y);
    if (told && told.colony === true) {
      // Something is alive under it: the ground breathes.
      const pulse = 0.35 + Math.sin(performance.now() * 0.004) * 0.25;
      ctx.strokeStyle = `rgba(214,176,132,${pulse.toFixed(2)})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(feature.x, feature.y, feature.r * (0.3 + i * 0.22), feature.r * (0.2 + i * 0.15), 0, 0, TAU);
        ctx.stroke();
      }
    } else if (turned && feature.regrown === true) {
      // Turned soil keeps giving: new shoots.
      ctx.strokeStyle = 'rgba(150,178,104,.5)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const x = feature.x - 12 + i * 12;
        ctx.beginPath();
        ctx.moveTo(x, feature.y + 4);
        ctx.lineTo(x + 2, feature.y - 8);
        ctx.stroke();
      }
    }
  }

  // Where a colony was crushed: bare, hard, and quiet.
  for (const spot of lost) {
    ctx.fillStyle = dawn ? 'rgba(88,78,58,.5)' : 'rgba(34,30,20,.55)';
    ctx.beginPath();
    ctx.ellipse(spot.x, spot.y, 30, 21, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(24,20,14,.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(spot.x - 9, spot.y - 6);
    ctx.lineTo(spot.x + 9, spot.y + 6);
    ctx.moveTo(spot.x + 9, spot.y - 6);
    ctx.lineTo(spot.x - 9, spot.y + 6);
    ctx.stroke();
  }
}

/**
 * The asura city's plaza (design §7, นครอสุร): the cut-stone ring with its gate
 * left out, the drop where the span used to be, the two rival towers that ate it,
 * and — once a life lays its stones back — the span itself and the shrine it
 * leads to, which is where the city lets the mind rest.
 */
function drawAsuraRooms(dawn) {
  const { plaza, ring } = asuraSite();
  const gate = gatePoint();
  const laid = spanBuilt();

  // The plaza floor.
  ctx.fillStyle = dawn ? 'rgba(120,124,112,.3)' : 'rgba(46,50,46,.36)';
  ctx.beginPath();
  ctx.ellipse(plaza.x, plaza.y, ring - 54, (ring - 54) * 0.85, 0, 0, TAU);
  ctx.fill();

  // The shrine: a stepped stone platform at the middle.
  ctx.fillStyle = dawn ? 'rgba(150,152,140,.45)' : 'rgba(70,74,70,.5)';
  ctx.beginPath();
  ctx.ellipse(plaza.x, plaza.y, 62, 52, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = dawn ? 'rgba(176,178,164,.5)' : 'rgba(88,92,86,.55)';
  ctx.beginPath();
  ctx.ellipse(plaza.x, plaza.y, 34, 28, 0, 0, TAU);
  ctx.fill();
  if (laid) {
    // Rest comes off the stones: a slow pale ring.
    ctx.strokeStyle = `rgba(200,214,226,${0.3 + Math.sin(performance.now() * 0.0018) * 0.1})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(plaza.x, plaza.y, 74 + Math.sin(performance.now() * 0.0012) * 4, 62, 0, 0, TAU);
    ctx.stroke();
  }

  // The ring: cut stone, a course at a time.
  for (const feature of dynamicFeatures()) {
    if (feature.type !== 'citywall') continue;
    ctx.fillStyle = dawn ? 'rgba(132,132,124,.6)' : 'rgba(52,54,52,.66)';
    ctx.beginPath();
    ctx.ellipse(feature.x, feature.y, feature.r, feature.r * 0.78, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(168,168,156,.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(feature.x, feature.y, feature.r * 0.62, feature.r * 0.48, 0, 0, TAU);
    ctx.stroke();
  }

  // The drop at the gate: a dark gap with rubble, and the span over it if it was
  // laid back down.
  for (const feature of dynamicFeatures()) {
    if (feature.type !== 'drop') continue;
    ctx.fillStyle = dawn ? 'rgba(22,24,26,.7)' : 'rgba(6,8,10,.85)';
    ctx.beginPath();
    ctx.ellipse(feature.x, feature.y, feature.r, feature.r * 0.8, 0, 0, TAU);
    ctx.fill();
  }
  const spanList = spans().length ? spans() : (laid ? [gate] : []);
  for (const spot of spanList) {
    // Stones laid back across: wider than the gap, pale, and clearly someone's doing.
    ctx.fillStyle = dawn ? 'rgba(178,180,168,.7)' : 'rgba(104,108,104,.7)';
    ctx.beginPath();
    ctx.ellipse(spot.x, spot.y, 92, 34, gate.angle + Math.PI / 2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(212,214,200,.3)';
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(spot.x + Math.sin(gate.angle) * i * 26, spot.y - Math.cos(gate.angle) * i * 26);
      ctx.lineTo(spot.x + Math.cos(gate.angle) * 80 + Math.sin(gate.angle) * i * 26,
        spot.y + Math.sin(gate.angle) * 80 - Math.cos(gate.angle) * i * 26);
      ctx.stroke();
    }
  }

  // The two rival towers outside the gate: the ones that ate the span. With the
  // span laid, the near one is shorter — its stones are the bridge.
  const face = { x: Math.cos(gate.angle), y: Math.sin(gate.angle) };
  const side = { x: -face.y, y: face.x };
  for (const which of [-1, 1]) {
    const bx = gate.x - face.x * 70 + side.x * 96 * which;
    const by = gate.y - face.y * 70 + side.y * 96 * which;
    const height = laid && which === 1 ? 34 : 62;
    ctx.fillStyle = dawn ? 'rgba(120,120,112,.5)' : 'rgba(48,50,48,.6)';
    ctx.beginPath();
    ctx.moveTo(bx - 26, by + 18);
    ctx.lineTo(bx - 20, by - height);
    ctx.lineTo(bx + 20, by - height);
    ctx.lineTo(bx + 26, by + 18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(178,178,164,.22)';
    ctx.lineWidth = 1.5;
    for (let i = 1; i <= 3; i++) {
      const y = by + 18 - (height + 18) * (i / 4);
      ctx.beginPath();
      ctx.moveTo(bx - 22, y);
      ctx.lineTo(bx + 22, y);
      ctx.stroke();
    }
  }
}

/**
 * The light garden (design §7, สวนแสงไม่เที่ยง): the hedge ring, the shadow at its
 * gate, the beam of light that lies over it only while the light is on — and the
 * beds inside, in flower, ripe, or already let go (a seedfall where a life released
 * one). The garden's own veil comes and goes with the light, because the light
 * path has an age.
 */
function drawGardenRooms(dawn) {
  const { center, ring } = gardenSite();
  const gate = gardenGatePoint();
  const lit = isLit();
  const level = lightLevel();
  const released = releasedBeds();

  // The garden's light, over the whole garden and nowhere else.
  const glow = 0.04 + level * 0.07;
  ctx.fillStyle = `rgba(240,238,196,${glow.toFixed(3)})`;
  ctx.beginPath();
  ctx.ellipse(center.x, center.y, ring + 60, (ring + 60) * 0.85, 0, 0, TAU);
  ctx.fill();

  // The beds and the floor inside the hedge.
  ctx.fillStyle = dawn ? 'rgba(96,116,72,.34)' : 'rgba(44,58,38,.4)';
  ctx.beginPath();
  ctx.ellipse(center.x, center.y, ring - 56, (ring - 56) * 0.85, 0, 0, TAU);
  ctx.fill();

  // The hedge ring: soft, dark, and continuous.
  for (const feature of dynamicFeatures()) {
    if (feature.type !== 'hedge') continue;
    ctx.fillStyle = dawn ? 'rgba(52,76,44,.6)' : 'rgba(24,38,22,.65)';
    ctx.beginPath();
    ctx.ellipse(feature.x, feature.y, feature.r, feature.r * 0.82, 0, 0, TAU);
    ctx.fill();
  }

  // The shadow at the gate, and the beam of light over it.
  for (const feature of dynamicFeatures()) {
    if (feature.type !== 'shadow') continue;
    ctx.fillStyle = dawn ? 'rgba(18,22,26,.66)' : 'rgba(4,6,8,.8)';
    ctx.beginPath();
    ctx.ellipse(feature.x, feature.y, feature.r, feature.r * 0.8, 0, 0, TAU);
    ctx.fill();
  }
  if (lit) {
    // The way in, while the light lasts: a shaft laid across the dark.
    const alpha = 0.16 + level * 0.28 + Math.sin(performance.now() * 0.004) * 0.05;
    ctx.save();
    ctx.translate(gate.x, gate.y);
    ctx.rotate(gate.angle);
    ctx.fillStyle = `rgba(244,240,196,${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 92, 26, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // The beds: in flower, ripe (bright, asking), or a seedfall where one was let go.
  for (const feature of dynamicFeatures()) {
    if (feature.type === 'seedfall') {
      ctx.strokeStyle = 'rgba(230,216,168,.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(feature.x - 10, feature.y + 6);
      ctx.quadraticCurveTo(feature.x, feature.y - 14, feature.x + 12, feature.y - 4);
      ctx.stroke();
      ctx.fillStyle = 'rgba(230,216,168,.6)';
      ctx.beginPath();
      ctx.ellipse(feature.x + 12, feature.y - 4, 4, 3, 0, 0, TAU);
      ctx.fill();
      continue;
    }
    if (feature.type !== 'bloombed') continue;
    const petals = feature.ripe === true ? 6 : 4;
    const reach = feature.ripe === true ? feature.r * 0.7 : feature.r * 0.42;
    const alpha = feature.ripe === true ? 0.5 + level * 0.35 : 0.3;
    ctx.fillStyle = `rgba(226,214,166,${alpha.toFixed(3)})`;
    for (let i = 0; i < petals; i++) {
      const angle = (i / petals) * TAU + feature.x * 0.01;
      ctx.beginPath();
      ctx.ellipse(
        feature.x + Math.cos(angle) * reach * 0.6,
        feature.y + Math.sin(angle) * reach * 0.45,
        reach * 0.5, reach * 0.34, angle, 0, TAU,
      );
      ctx.fill();
    }
    ctx.fillStyle = feature.ripe === true ? 'rgba(248,244,206,.75)' : 'rgba(180,176,140,.45)';
    ctx.beginPath();
    ctx.ellipse(feature.x, feature.y, reach * 0.3, reach * 0.22, 0, 0, TAU);
    ctx.fill();
  }

  // Where a released bed was: a bare bed and the seed's own line out of it.
  for (const spot of released) {
    if (dynamicFeatures().some((f) => f.type === 'seedfall' && f.x === spot.x && f.y === spot.y)) continue;
    ctx.fillStyle = dawn ? 'rgba(94,84,62,.4)' : 'rgba(42,36,24,.45)';
    ctx.beginPath();
    ctx.ellipse(spot.x, spot.y, 30, 21, 0, 0, TAU);
    ctx.fill();
  }
}

/**
 * The market alley (design §7, ตลาดความอยาก): the cut stone of its two walls, the
 * narrow gate — drawn with its bar lifted while the hands are empty, because that
 * is the rule — the curtains across the chambers, each parted as far as the hands
 * have filled, and the goods on offer, dimmed once a life has taken them.
 */
function drawMarketRooms(dawn) {
  const { length, halfWidth } = marketSite();
  const gate = marketGatePoint();
  const axis = marketAxis();
  const held = carriedCount();

  // The alley floor: a worn street between the walls.
  ctx.save();
  ctx.translate(gate.x + axis.x * (length / 2), gate.y + axis.y * (length / 2));
  ctx.rotate(Math.atan2(axis.y, axis.x));
  ctx.fillStyle = dawn ? 'rgba(126,118,96,.34)' : 'rgba(52,48,38,.4)';
  ctx.fillRect(-length / 2, -(halfWidth - 46), length, (halfWidth - 46) * 2);
  ctx.strokeStyle = 'rgba(180,168,132,.12)';
  ctx.lineWidth = 2;
  for (let i = -length / 2; i < length / 2; i += 44) {
    ctx.beginPath();
    ctx.moveTo(i, -(halfWidth - 46));
    ctx.lineTo(i + 16, halfWidth - 46);
    ctx.stroke();
  }
  ctx.restore();

  // The walls.
  for (const feature of dynamicFeatures()) {
    if (feature.type !== 'marketwall') continue;
    ctx.fillStyle = dawn ? 'rgba(140,132,112,.6)' : 'rgba(58,54,44,.66)';
    ctx.beginPath();
    ctx.ellipse(feature.x, feature.y, feature.r, feature.r * 0.82, 0, 0, TAU);
    ctx.fill();
  }

  // The gate: two posts and a bar. The bar is up while the hands are empty.
  for (const feature of dynamicFeatures()) {
    if (feature.type !== 'narrowgate') continue;
    ctx.fillStyle = dawn ? 'rgba(96,90,74,.6)' : 'rgba(38,36,30,.7)';
    ctx.beginPath();
    ctx.ellipse(feature.x, feature.y, feature.r * 0.34, feature.r * 0.34, 0, 0, TAU);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(gate.x, gate.y);
  ctx.rotate(Math.atan2(axis.y, axis.x));
  ctx.strokeStyle = held === 0 ? 'rgba(210,214,196,.25)' : 'rgba(226,196,120,.6)';
  ctx.lineWidth = 5;
  for (const across of [-46, 0, 46]) {
    ctx.beginPath();
    ctx.moveTo(0, across);
    ctx.lineTo(held === 0 ? 6 : 30, across);
    ctx.stroke();
  }
  ctx.restore();

  // The curtains: cloth, parted as far as the hands have filled.
  for (const feature of dynamicFeatures()) {
    if (feature.type !== 'curtain') continue;
    const need = feature.needs || 1;
    const open = held >= need;
    const fullness = 0.3 + need * 0.2;
    ctx.fillStyle = open
      ? `rgba(226,196,120,${(fullness * 0.5).toFixed(2)})`
      : `rgba(150,120,86,${fullness.toFixed(2)})`;
    ctx.save();
    ctx.translate(feature.x, feature.y);
    ctx.rotate(Math.atan2(axis.y, axis.x));
    // Parted curtains show a way; shut ones are one flat panel.
    const parts = open ? [-1, 1] : [0];
    for (const side of parts) {
      ctx.beginPath();
      ctx.moveTo(0, side * 6);
      ctx.lineTo(0, side * 46);
      ctx.lineTo(-10, side * (open ? 20 : 50));
      ctx.lineTo(-10, side * (open ? 0 : 6));
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // The goods on offer.
  for (const feature of dynamicFeatures()) {
    if (feature.type !== 'gift') continue;
    const taken = giftTaken(feature);
    ctx.fillStyle = taken
      ? 'rgba(120,110,88,.28)'
      : (dawn ? 'rgba(226,196,120,.6)' : 'rgba(198,160,74,.66)');
    ctx.beginPath();
    ctx.ellipse(feature.x, feature.y, feature.r * 0.62, feature.r * 0.5, 0, 0, TAU);
    ctx.fill();
    if (!taken) {
      ctx.strokeStyle = 'rgba(246,226,168,.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(feature.x - feature.r * 0.4, feature.y - feature.r * 0.2);
      ctx.lineTo(feature.x + feature.r * 0.4, feature.y - feature.r * 0.2);
      ctx.stroke();
    }
  }
}

/**
 * The spider's web (reserve table, แมงมุม): the ring of fissure around the hollow,
 * the two posts, and the thread a life spun between them — drawn as the thin bridge
 * it is, so the way it opens for small bodies can be seen.
 */
function drawWebSite(dawn) {
  const { hollow, ring, anchorOut, anchorIn } = webSite();
  const spun = webSpun() || threads().length > 0;

  // The hollow beyond the fissure.
  ctx.fillStyle = dawn ? 'rgba(96,104,84,.36)' : 'rgba(40,46,36,.42)';
  ctx.beginPath();
  ctx.ellipse(hollow.x, hollow.y, ring - 52, (ring - 52) * 0.86, 0, 0, TAU);
  ctx.fill();

  // The fissure: a broken ring, dark and cracked.
  for (const feature of dynamicFeatures()) {
    if (feature.type !== 'fissure') continue;
    ctx.fillStyle = dawn ? 'rgba(60,54,44,.5)' : 'rgba(18,16,12,.6)';
    ctx.beginPath();
    ctx.ellipse(feature.x, feature.y, feature.r, feature.r * 0.7, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,16,12,.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(feature.x - feature.r * 0.5, feature.y);
    ctx.lineTo(feature.x + feature.r * 0.5, feature.y + 4);
    ctx.stroke();
  }

  // The posts.
  for (const post of [anchorOut, anchorIn]) {
    ctx.fillStyle = dawn ? 'rgba(118,98,70,.6)' : 'rgba(54,44,32,.66)';
    ctx.beginPath();
    ctx.ellipse(post.x, post.y, 16, 13, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(180,160,120,.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(post.x - 6, post.y + 4);
    ctx.lineTo(post.x + 4, post.y - 12);
    ctx.stroke();
  }

  // The thread, old and strong, and a little silver with the light.
  if (spun) {
    ctx.strokeStyle = dawn ? 'rgba(220,228,240,.5)' : 'rgba(190,204,224,.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(anchorOut.x, anchorOut.y);
    ctx.lineTo(anchorIn.x, anchorIn.y);
    ctx.stroke();
    // The rungs a small body walks.
    const steps = 6;
    ctx.strokeStyle = 'rgba(220,228,240,.28)';
    ctx.lineWidth = 1.4;
    for (let i = 1; i <= steps; i++) {
      const t = i / (steps + 1);
      const x = anchorOut.x + (anchorIn.x - anchorOut.x) * t;
      const y = anchorOut.y + (anchorIn.y - anchorOut.y) * t;
      ctx.beginPath();
      ctx.moveTo(x - 10, y - 7);
      ctx.lineTo(x + 10, y - 7);
      ctx.stroke();
    }
  }
}

/**
 * The ford (story table ch.11, ควาย): the mud flat, the fallen log, the chasm that
 * rings the pasture, and the bridge a dragged log leaves standing. The bridge is
 * the one piece of the map a *life* draws: it is there in later lives because
 * someone hauled it there.
 */
function drawFord(dawn) {
  const { mud, log, pasture, ring, mudRadius } = fordSite();
  const bridge = bridgePoint();

  // The mud flat: darker, wetter ground.
  ctx.fillStyle = dawn ? 'rgba(58,48,34,.55)' : 'rgba(26,22,14,.6)';
  ctx.beginPath();
  ctx.ellipse(mud.x, mud.y, mudRadius, mudRadius * 0.72, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,104,72,.25)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const angle = i * 1.3;
    ctx.beginPath();
    ctx.ellipse(
      mud.x + Math.cos(angle) * mudRadius * 0.45,
      mud.y + Math.sin(angle) * mudRadius * 0.32,
      mudRadius * 0.22, mudRadius * 0.12, angle, 0, TAU,
    );
    ctx.stroke();
  }

  // The chasm ring, and the pasture inside it.
  ctx.fillStyle = dawn ? 'rgba(96,104,72,.3)' : 'rgba(44,54,36,.35)';
  ctx.beginPath();
  ctx.ellipse(pasture.x, pasture.y, ring - 44, (ring - 44) * 0.8, 0, 0, TAU);
  ctx.fill();
  for (const feature of dynamicFeatures()) {
    if (feature.type !== 'gully') continue;
    ctx.fillStyle = dawn ? 'rgba(34,30,22,.85)' : 'rgba(12,10,8,.9)';
    ctx.beginPath();
    ctx.ellipse(feature.x, feature.y, feature.r * 1.05, feature.r * 0.75, 0, 0, TAU);
    ctx.fill();
  }

  // The log on the near side, unless a life has hauled it across.
  if (!fordBridged() && !state.world.planks?.length) {
    ctx.save();
    ctx.translate(log.x, log.y);
    ctx.rotate(0.35);
    ctx.fillStyle = dawn ? 'rgba(140,112,72,.95)' : 'rgba(86,68,44,.95)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 46, 15, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // The bridge: what a life left over the chasm.
  if (state.world.planks?.length || fordBridged()) {
    ctx.save();
    ctx.translate(bridge.x, bridge.y);
    ctx.rotate(Math.atan2(log.y - pasture.y, log.x - pasture.x));
    ctx.fillStyle = dawn ? 'rgba(160,130,84,.95)' : 'rgba(96,76,48,.95)';
    ctx.fillRect(-14, -54, 28, 108);
    ctx.strokeStyle = 'rgba(40,30,18,.5)';
    ctx.lineWidth = 1.6;
    for (const dy of [-30, 0, 30]) {
      ctx.beginPath();
      ctx.moveTo(-14, dy);
      ctx.lineTo(14, dy);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/**
 * The cat's round (reserve table, แมว): the low wall beside each home, the homes
 * themselves, and the warm stone the life ends on. The walls are drawn as what
 * they are — a step up, not a barrier — because the point is that a cat stands on
 * them and looks in.
 */
function drawHomes(dawn) {
  if (getForm().lifeGoal !== 'wall' && !hearthsRespected()) return;
  const homes = homesSite();
  const stone = warmStone();

  for (const home of homes) {
    // the home itself
    ctx.fillStyle = dawn ? 'rgba(74,60,42,.9)' : 'rgba(32,26,18,.92)';
    ctx.beginPath();
    ctx.ellipse(home.x, home.y, 34, 24, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = dawn ? 'rgba(22,16,10,.9)' : 'rgba(10,8,5,.92)';
    ctx.beginPath();
    ctx.ellipse(home.x, home.y + 5, 14, 10, 0, 0, TAU);
    ctx.fill();

    // the wall a step away: a low ridge of stone
    ctx.save();
    ctx.translate(home.wall.x, home.wall.y);
    ctx.fillStyle = dawn ? 'rgba(120,116,104,.9)' : 'rgba(58,60,54,.92)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 46, 20, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = dawn ? 'rgba(168,164,150,.4)' : 'rgba(120,124,116,.35)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-34, -4);
    ctx.lineTo(34, -4);
    ctx.stroke();
    ctx.restore();

    if (homeVisited(home.id)) {
      ctx.strokeStyle = peekedAt(home.id)
        ? `rgba(216,200,168,${0.35 + Math.sin(performance.now() * 0.002) * 0.12})`
        : 'rgba(201,138,122,.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(home.wall.x, home.wall.y, 58, 0, TAU);
      ctx.stroke();
    }
    if (hearthsRespected()) {
      ctx.fillStyle = 'rgba(224,208,168,.1)';
      ctx.beginPath();
      ctx.arc(home.x, home.y, 86, 0, TAU);
      ctx.fill();
    }
  }

  // The warm stone the cat always comes back to.
  ctx.fillStyle = dawn ? 'rgba(126,110,84,.95)' : 'rgba(62,54,42,.95)';
  ctx.beginPath();
  ctx.ellipse(stone.x, stone.y, 40, 26, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = hearthsRespected()
    ? `rgba(224,208,168,${0.3 + Math.sin(performance.now() * 0.002) * 0.1})`
    : 'rgba(214,180,120,.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(stone.x, stone.y, 48, 32, 0, 0, TAU);
  ctx.stroke();
}

/**
 * The bee's chain (reserve table, ผึ้ง): the hive, the flowers that open as they
 * are worked, and the far meadow. Flowers a past life pollinated are dressing and
 * drawn with the rest of the world; these are the ones this life walks.
 */
function drawBlooms(dawn) {
  if (getForm().lifeGoal !== 'bloom') return;
  const { hive, flowers, meadow } = bloomsSite();

  // The far meadow: paler grass, and the place the pollen is decided at.
  ctx.fillStyle = dawn ? 'rgba(96,110,64,.35)' : 'rgba(44,56,34,.4)';
  ctx.beginPath();
  ctx.ellipse(meadow.x, meadow.y, 104, 70, 0, 0, TAU);
  ctx.fill();

  // The hive: a small striped dome on the branch of nothing — simply its own home.
  ctx.fillStyle = dawn ? 'rgba(190,150,80,.95)' : 'rgba(140,106,54,.95)';
  ctx.beginPath();
  ctx.ellipse(hive.x, hive.y, 34, 26, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,62,28,.5)';
  ctx.lineWidth = 1.6;
  for (const dy of [-10, 0, 10]) {
    ctx.beginPath();
    ctx.ellipse(hive.x, hive.y + dy, 30 - Math.abs(dy) * 0.5, 4, 0, 0, TAU);
    ctx.stroke();
  }
  if (forestPollinated()) {
    ctx.strokeStyle = `rgba(224,200,160,${0.2 + Math.sin(performance.now() * 0.002) * 0.07})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hive.x, hive.y, 54, 0, TAU);
    ctx.stroke();
  }

  for (const [index, flower] of flowers.entries()) {
    const worked = flowerVisited(index);
    // stem and leaves
    ctx.strokeStyle = dawn ? 'rgba(110,140,84,.8)' : 'rgba(84,112,70,.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(flower.x, flower.y + 16);
    ctx.lineTo(flower.x, flower.y - 6);
    ctx.stroke();
    // petals: open and pale once the bee has been, tight and dim before that
    const petals = worked ? 6 : 4;
    const spread = worked ? 15 : 9;
    ctx.fillStyle = worked
      ? (dawn ? 'rgba(236,214,168,.95)' : 'rgba(226,200,150,.95)')
      : (dawn ? 'rgba(150,132,104,.75)' : 'rgba(96,86,68,.8)');
    for (let i = 0; i < petals; i++) {
      const angle = (i / petals) * TAU;
      ctx.beginPath();
      ctx.ellipse(
        flower.x + Math.cos(angle) * spread * 0.6,
        flower.y - 8 + Math.sin(angle) * spread * 0.6,
        spread * 0.55, spread * 0.38, angle, 0, TAU,
      );
      ctx.fill();
    }
    ctx.fillStyle = worked ? '#e8c86a' : '#6b5a44';
    ctx.beginPath();
    ctx.arc(flower.x, flower.y - 8, 4.4, 0, TAU);
    ctx.fill();
    if (!worked && reachableFlower()?.index === index) {
      ctx.strokeStyle = `rgba(224,200,160,${0.35 + Math.sin(performance.now() * 0.003) * 0.15})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(flower.x, flower.y - 8, 30, 0, TAU);
      ctx.stroke();
    }
  }
}

/**
 * What the current carries (reserve table, นาก): the driftwood riding the river,
 * the holt it is brought to, and — if a life piled it by the water — the jam it
 * becomes in a later life. These are the only objects in the game that move on
 * their own (systems/drift.js).
 */
function drawDrift(dawn) {
  const driftWood = drifterPositions();
  for (const piece of driftWood) {
    const bob = Math.sin(performance.now() * 0.002 + piece.t * 40) * 2.4;
    ctx.save();
    ctx.translate(piece.x, piece.y + bob);
    ctx.rotate(0.5 + Math.sin(performance.now() * 0.0007 + piece.t * 20) * 0.12);
    ctx.fillStyle = dawn ? 'rgba(140,112,72,.95)' : 'rgba(86,68,44,.95)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 7, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(210,190,150,.25)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(18, 0);
    ctx.stroke();
    ctx.restore();
  }

  // Snags: the same wood, jammed across the channel in a later life.
  for (const feature of dynamicFeatures()) {
    if (feature.type !== 'snag') continue;
    ctx.save();
    ctx.translate(feature.x, feature.y);
    ctx.rotate(1.1);
    ctx.fillStyle = dawn ? 'rgba(120,96,62,.95)' : 'rgba(66,52,34,.95)';
    ctx.beginPath();
    ctx.ellipse(0, 0, feature.r, feature.r * 0.3, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(6, 8, feature.r * 0.7, feature.r * 0.24, 0.5, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

/** The otter's holt, when that life is in play. */
function drawHolt(dawn) {
  if (getForm().lifeGoal !== 'current') return;
  const { holt } = holtSite();
  ctx.fillStyle = dawn ? 'rgba(84,66,44,.9)' : 'rgba(38,30,20,.92)';
  ctx.beginPath();
  ctx.ellipse(holt.x, holt.y, 62, 42, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = dawn ? 'rgba(26,20,12,.9)' : 'rgba(12,9,5,.92)';
  ctx.beginPath();
  ctx.ellipse(holt.x, holt.y + 8, 24, 17, 0, 0, TAU);
  ctx.fill();
  if (riverTended()) {
    ctx.strokeStyle = `rgba(159,214,184,${0.2 + Math.sin(performance.now() * 0.002) * 0.08})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(holt.x, holt.y, 78, 0, TAU);
    ctx.stroke();
  }
}

/**
 * The flooded channel and the crab's pools (reserve table, ปู): the walled
 * spawning pool, the channel the river runs through, the sand bar, and the water
 * itself — which is why the river band is drawn wider when the tide is in
 * (systems/tide.js). Nothing else in the game changes the ground under a body.
 */
function drawTide(dawn) {
  const { farPool, home, ring, causeway } = tideSite();
  const level = waterLevel();
  const deep = isHighTideNow();

  // The river's own band, at the height the tide is at.
  ctx.strokeStyle = deep
    ? (dawn ? 'rgba(60,110,150,.5)' : 'rgba(24,60,92,.55)')
    : (dawn ? 'rgba(60,110,150,.35)' : 'rgba(24,60,92,.4)');
  ctx.lineWidth = RIVER_WIDTH * 2 * (1 + level * 0.18);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(RIVER[0][0], RIVER[0][1]);
  for (let i = 1; i < RIVER.length; i++) ctx.lineTo(RIVER[i][0], RIVER[i][1]);
  ctx.stroke();

  // The sand bar: pale at low water, nearly gone at high water.
  ctx.strokeStyle = `rgba(${dawn ? '190,176,140' : '150,140,112'},${0.55 - Math.max(0, level) * 0.4})`;
  ctx.lineWidth = tideSite().causewayRadius * 2;
  ctx.beginPath();
  ctx.moveTo(causeway[0][0], causeway[0][1]);
  ctx.lineTo(causeway[1][0], causeway[1][1]);
  ctx.stroke();

  // The walled pool, and the channel in it: bright when the water is out and a
  // body could wade, dark and deep when it is in.
  ctx.strokeStyle = dawn ? 'rgba(150,146,132,.3)' : 'rgba(110,112,104,.28)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(farPool.x, farPool.y, ring, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = deep
    ? (dawn ? 'rgba(70,130,175,.9)' : 'rgba(28,70,105,.9)')
    : (dawn ? 'rgba(200,190,150,.8)' : 'rgba(150,144,116,.75)');
  ctx.lineWidth = 10;
  const doorAngle = Math.atan2(causeway[1][1] - farPool.y, causeway[1][0] - farPool.x);
  ctx.beginPath();
  ctx.arc(farPool.x, farPool.y, ring, doorAngle - 0.2, doorAngle + 0.2);
  ctx.stroke();

  // The two pools.
  for (const pool of [home, farPool]) {
    ctx.fillStyle = dawn ? 'rgba(58,116,158,.85)' : 'rgba(22,56,84,.9)';
    ctx.beginPath();
    ctx.ellipse(pool.x, pool.y, 84, 58, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = channelKept() && pool === farPool
      ? `rgba(159,198,221,${0.5 + Math.sin(performance.now() * 0.002) * 0.15})`
      : 'rgba(159,198,221,.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(pool.x, pool.y, 90, 64, 0, 0, TAU);
    ctx.stroke();
  }
}

/**
 * The seed crowns and the cache (reserve table, กระรอก), plus the saplings of a
 * scattered seed — the one effect in the game you can see from the road: the
 * route the later lives walk grows trees because a squirrel let them go.
 */
function drawSquirrelSeeds(dawn) {
  const { canopies, cache } = seedsSite();

  // Saplings stand on every plane's road once the seeds were scattered.
  if (seedsScattered()) {
    for (const sapling of saplingsAlong(currentBiomeId())) {
      ctx.strokeStyle = dawn ? 'rgba(120,148,92,.85)' : 'rgba(96,128,80,.8)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(sapling.x, sapling.y);
      ctx.quadraticCurveTo(sapling.x - 4, sapling.y - 16, sapling.x - 2, sapling.y - 34);
      ctx.stroke();
      ctx.fillStyle = dawn ? 'rgba(126,156,96,.75)' : 'rgba(92,124,78,.75)';
      ctx.beginPath();
      ctx.ellipse(sapling.x - 8, sapling.y - 30, 10, 7, -0.4, 0, TAU);
      ctx.ellipse(sapling.x + 7, sapling.y - 36, 9, 6, 0.3, 0, TAU);
      ctx.fill();
    }
  }

  if (getForm().lifeGoal !== 'seeds') return;

  for (const [index, crown] of canopies.entries()) {
    const picked = crownPicked(index);
    ctx.fillStyle = dawn ? 'rgba(74,92,58,.9)' : 'rgba(34,46,30,.9)';
    ctx.beginPath();
    ctx.arc(crown.x, crown.y, 58, 0, TAU);
    ctx.fill();
    ctx.fillStyle = dawn ? 'rgba(96,116,72,.75)' : 'rgba(48,62,40,.8)';
    ctx.beginPath();
    ctx.arc(crown.x - 26, crown.y - 14, 34, 0, TAU);
    ctx.arc(crown.x + 28, crown.y - 10, 30, 0, TAU);
    ctx.fill();
    if (!picked) {
      // the seeds, waiting up in there where only a climbing body goes
      ctx.fillStyle = 'rgba(217,189,123,.9)';
      for (const [dx, dy] of [[0, 4], [13, -6], [-12, -2]]) {
        ctx.beginPath();
        ctx.ellipse(crown.x + dx, crown.y + dy, 5, 3.4, 0.6, 0, TAU);
        ctx.fill();
      }
    }
  }

  // The old cache at the road's side.
  ctx.fillStyle = dawn ? 'rgba(70,54,36,.9)' : 'rgba(30,24,16,.92)';
  ctx.beginPath();
  ctx.ellipse(cache.x, cache.y, 46, 30, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = dawn ? 'rgba(24,18,10,.9)' : 'rgba(10,8,4,.92)';
  ctx.beginPath();
  ctx.ellipse(cache.x, cache.y + 6, 20, 13, 0, 0, TAU);
  ctx.fill();
  if (seedsScattered()) {
    ctx.strokeStyle = `rgba(191,208,160,${0.2 + Math.sin(performance.now() * 0.002) * 0.07})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cache.x, cache.y, 62, 0, TAU);
    ctx.stroke();
  }
}

/**
 * The dark cave (reserve table, ค้างคาว): rock, the roost, and the pup — which is
 * only drawn when the body could actually perceive it, which in here means: only
 * while a pulse is in flight (systems/echo.js). Nothing else in the game is
 * hidden behind an *action* rather than a place.
 */
function drawCave(dawn) {
  const { center, radius, roost, pup } = caveSite();
  if (dist(center.x, center.y, player.x, player.y) > radius + 520) return;
  const lit = perceivesPup() && dist(pup.x, pup.y, player.x, player.y) < 460;

  // The chamber's rock, drawn faintly: inside the cave the darkness does the
  // hiding, so the walls can be drawn without giving the pup away.
  ctx.strokeStyle = dawn ? 'rgba(150,146,132,.22)' : 'rgba(120,118,108,.18)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, TAU);
  ctx.stroke();

  // The roost: a ledge the bat knows by heart, so it is always drawn.
  ctx.fillStyle = dawn ? 'rgba(84,70,52,.5)' : 'rgba(34,28,20,.55)';
  ctx.beginPath();
  ctx.ellipse(roost.x, roost.y, 54, 26, 0, 0, TAU);
  ctx.fill();

  if (!lit) return;
  // A small hunched body, and the ears that are about to learn.
  ctx.fillStyle = dawn ? '#6b6152' : '#2c281f';
  ctx.beginPath();
  ctx.ellipse(pup.x, pup.y, 20, 14, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(pup.x - 12, pup.y - 8);
  ctx.lineTo(pup.x - 18, pup.y - 22);
  ctx.lineTo(pup.x - 4, pup.y - 12);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(pup.x + 12, pup.y - 8);
  ctx.lineTo(pup.x + 18, pup.y - 22);
  ctx.lineTo(pup.x + 4, pup.y - 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(226,238,214,.8)';
  ctx.beginPath();
  ctx.arc(pup.x - 5, pup.y - 3, 2.2, 0, TAU);
  ctx.arc(pup.x + 6, pup.y - 3, 2.2, 0, TAU);
  ctx.fill();
}

/** A bridge built in an earlier life, and the debris its upkeep left behind. */
function drawWorldMemory(dawn) {
  if (!hasBridge()) return;
  const site = bridgeSite();

  // Planks across the water.
  ctx.fillStyle = dawn ? '#4a3520' : '#2a1d10';
  ctx.fillRect(site.x - 78, site.y - 12, 156, 24);
  ctx.strokeStyle = 'rgba(233,217,160,.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(site.x - 78, site.y - 12, 156, 24);
  for (let i = -3; i <= 3; i++) {
    ctx.strokeStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath();
    ctx.moveTo(site.x + i * 20, site.y - 12);
    ctx.lineTo(site.x + i * 20, site.y + 12);
    ctx.stroke();
  }

  if (!isWaterwayCleared()) {
    const now = performance.now() * 0.001;
    for (let i = 0; i < 5; i++) {
      const a = now + i * 1.7;
      const px = site.x - 60 + i * 30;
      const py = site.y + 30 + Math.sin(a) * 6;
      ctx.fillStyle = 'rgba(70,52,30,.9)';
      ctx.fillRect(px - 18, py - 4, 36, 8);
      ctx.fillStyle = 'rgba(110,80,45,.9)';
      ctx.fillRect(px - 14, py - 7, 28, 5);
    }
  }
}

/** The river: a dark band with a lighter core, crossed by the true path. */
function drawRiver(dawn) {
  const biome = currentBiome();
  drawPath(RIVER, RIVER_WIDTH * 2, dawn ? '#1b3550' : biome.water);
  drawPath(RIVER, RIVER_WIDTH * 1.1, dawn ? '#264f70' : biome.waterCore);
}

function drawPaths(dawn) {
  const plane = currentBiomeId();
  // The plane lays its own road, in its own material (design §7): the forest's
  // false branches and their light gates belong to the forest lesson alone.
  const look = routeLook(plane, dawn);
  drawPath(routeForPlane(plane), look.width, look.color);
  if (plane === 'memory-forest') {
    drawPath(FALSE_A, 60, dawn ? '#222015' : '#0d120c');
    drawPath(FALSE_B, 60, dawn ? '#222015' : '#0d120c');
  }
}

function drawFootprints(mind) {
  const { W, H } = viewport;
  const scent = getForm().scent ? 1.6 : 1;
  const alpha = clamp((state.story.released
    ? 0.85
    : clamp(0.5 - state.fear * 0.55 + (mind ? 0.55 : 0), 0, 0.95)) * scent, 0, 1);
  if (alpha <= 0.04) return;

  // Footprints follow whichever road this body is walking.
  const footmarks = currentBiomeId() === 'memory-forest' ? FOOT : footprintsAlong(routeForPlane(currentBiomeId()));
  for (const foot of footmarks) {
    if (Math.abs(foot.x - cam.x) > W * 0.6 || Math.abs(foot.y - cam.y) > H * 0.6) continue;
    ctx.save();
    ctx.translate(foot.x, foot.y);
    ctx.rotate(foot.ang);
    ctx.fillStyle = `rgba(255,214,150,${alpha * 0.14})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 7, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = `rgba(255,224,170,${alpha * 0.5})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 5, 3, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function drawLightGates(mind) {
  // The illusory gates belong to chapter one only.
  if (state.chapter !== 1 || state.story.released) return;
  const now = performance.now();

  for (const gate of GATES) {
    const visibility = clamp((state.fear - 0.42) * 2.2, 0, 1) * (mind ? 0.25 : 1);

    if (visibility > 0.03) {
      for (const part of gate.parts) {
        part.a += 0.016 * part.s * (mind ? -0.3 : 1);
        const px = gate.x + Math.cos(part.a) * part.r;
        const py = gate.y + Math.sin(part.a) * part.r * 0.72;
        ctx.fillStyle = `rgba(255,196,110,${visibility * 0.5})`;
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, TAU);
        ctx.fill();
      }
      const glow = ctx.createRadialGradient(gate.x, gate.y, 4, gate.x, gate.y, 72);
      glow.addColorStop(0, `rgba(255,210,140,${visibility * 0.5})`);
      glow.addColorStop(1, 'rgba(255,210,140,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(gate.x, gate.y, 72, 0, TAU);
      ctx.fill();

      ctx.strokeStyle = `rgba(255,224,170,${visibility * 0.8})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(gate.x, gate.y, 26 + Math.sin(now * 0.003) * 4, 0, TAU);
      ctx.stroke();
    } else {
      // With mindfulness the gate reads as a dark fog patch.
      ctx.fillStyle = 'rgba(4,8,6,.55)';
      ctx.beginPath();
      ctx.ellipse(gate.x, gate.y, 54, 34, 0, 0, TAU);
      ctx.fill();
    }
  }
}

/**
 * The light a life leaves when it ends (docs/rebirth-effects.md): one ring, opening
 * once and fading — no white flash, no face, no violence.
 */
function drawLifeLights() {
  for (const light of lifeLights) {
    const k = light.t / light.life;
    const alpha = clamp(1 - k, 0, 1) * 0.7;
    const radius = 12 + k * 74;
    ctx.strokeStyle = `rgba(246,232,186,${(alpha * 0.7).toFixed(3)})`;
    ctx.lineWidth = 3 - k * 2;
    ctx.beginPath();
    ctx.arc(light.x, light.y - 14, radius, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = `rgba(255,240,200,${(alpha * 0.25).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(light.x, light.y - 14, radius * 0.5, 0, TAU);
    ctx.fill();
  }
}

/**
 * The companion (systems/companion.js): the dog, drawn from the same code art as
 * every body, with its own small state — a raised head when it is waiting, a bark
 * mark when it answers, and a step back when it is afraid of the water ahead.
 */
function drawCompanion() {
  const dog = companionState();
  if (!dog.active) return;
  const moving = dog.mode === 'following';
  try {
    drawFormBody(ctx, 'dog', dog.x, dog.y, {
      face: dog.face, phase: performance.now() * 0.004, moving, bob: performance.now() * 0.004, act: 0,
    });
  } catch {
    ctx.fillStyle = 'rgba(120,102,82,.9)';
    ctx.beginPath();
    ctx.arc(dog.x, dog.y, 12, 0, TAU);
    ctx.fill();
  }
  if (dog.mode === 'waiting') {
    ctx.strokeStyle = 'rgba(233,217,160,.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(dog.x, dog.y, 30, 0, TAU);
    ctx.stroke();
  }
  if (dog.bark > 0) {
    ctx.fillStyle = `rgba(246,232,186,${Math.min(1, dog.bark).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(dog.x + 16 * dog.face, dog.y - 26, 4 + dog.bark * 6, 0, TAU);
    ctx.fill();
  }
}

/**
 * The mark that leads to a remembered place (systems/waypoint.js): a quiet ring and
 * a thread of light toward it, drawn only while a memory is being followed.
 */
function drawWaypoint(dawn) {
  const mark = waypoint();
  if (!mark) return;
  const pulse = 0.35 + Math.sin(performance.now() * 0.003) * 0.12;
  ctx.strokeStyle = `rgba(233,217,160,${pulse.toFixed(2)})`;
  ctx.lineWidth = 2.5;
  ctx.setLineDash?.([7, 7]);
  ctx.beginPath();
  ctx.arc(mark.x, mark.y, 26, 0, TAU);
  ctx.stroke();
  ctx.setLineDash?.([]);
  // A thread from the body to the place, so the mark can be followed from anywhere.
  const from = { x: player.x, y: player.y - 18 };
  const distance = Math.hypot(mark.x - from.x, mark.y - from.y);
  if (distance > 120) {
    const steps = 5;
    ctx.strokeStyle = `rgba(233,217,160,${(pulse * 0.5).toFixed(2)})`;
    ctx.lineWidth = 1.5;
    for (let i = 1; i <= steps; i++) {
      const t = i / (steps + 1);
      ctx.beginPath();
      ctx.arc(from.x + (mark.x - from.x) * t, from.y + (mark.y - from.y) * t, 3, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.fillStyle = `rgba(233,217,160,${(pulse * 0.7).toFixed(2)})`;
  ctx.beginPath();
  ctx.arc(mark.x, mark.y, 5, 0, TAU);
  ctx.fill();
  void dawn;
}

function drawSparks() {
  drawCompanion();
  drawWaypoint(false);
  drawLifeLights();
  for (const spark of sparks) {
    const alpha = clamp(1 - spark.t / spark.life, 0, 1);
    ctx.fillStyle = `rgba(255,224,160,${alpha * 0.8})`;
    ctx.beginPath();
    ctx.arc(spark.x, spark.y, 1.5 + alpha * 2, 0, TAU);
    ctx.fill();
  }
}

/** Treasure lures appear when a chapter enables them (3 and 6). */
function drawLures() {
  if (!state.luresVisible) return;
  for (const lure of getLures()) {
    if (!lure.taken) drawLure(lure);
  }
}

function drawEntities(dawn) {
  const { W, H } = viewport;
  const treesNear = TREES.filter(
    (tree) => Math.abs(tree.x - cam.x) < W * 0.62 && Math.abs(tree.y - cam.y) < H * 0.62,
  );

  for (const tree of treesNear) if (tree.y < player.y - 6) drawTree(tree, dawn);
  drawPlayer(dawn);
  for (const tree of treesNear) if (tree.y >= player.y - 6) drawTree(tree, dawn);

  if (!state.teacher) for (const spirit of ghosts) if (spirit.active) drawGhost(spirit);
}

/** Classroom mode: floating landmark names and the next tour stop. */
function drawTeacherOverlay() {
  if (!state.teacher) return;
  const scale = state.projector ? 1.45 : 1;
  for (const landmark of teacherLandmarks()) {
    drawTeacherLabel(landmark.x, landmark.y - 34, t(landmark.labelKey), scale);
  }
  const target = tourTarget();
  if (target) drawTourMarker(target.x, target.y);
}

/** A pulsing ring over this life's goal (a fish's river pool, for instance). */
function drawLifeGoal() {
  if (!state.lifeMode) return;
  const goal = goalFor();
  // A land life is guided by its chapter, not by a marker.
  if (goal.kind === 'land') return;
  drawTourMarker(goal.x, goal.y);
}

function drawInteractionPrompt() {
  if (state.interact && state.mode === MODE.WORLD && !state.dialogueOpen) {
    drawPrompt(t(state.interact.labelKey));
  }
}

function drawFog() {
  const { W, H } = viewport;
  const t0 = performance.now() * 0.0001;
  ctx.fillStyle = state.story.released ? 'rgba(210,220,200,.05)' : 'rgba(120,150,130,.05)';
  for (let i = 0; i < 3; i++) {
    const fx = ((t0 * (40 + i * 26) + i * 700) % (W + 800)) - 400;
    const fy = H * 0.3 + Math.sin(t0 * 3 + i) * H * 0.16;
    ctx.beginPath();
    ctx.ellipse(fx, fy, 340, 90, 0, 0, TAU);
    ctx.fill();
  }
}

function drawFloaters() {
  const { W, H } = viewport;
  ctx.textAlign = 'center';
  for (const floater of floaters) {
    const alpha = clamp(Math.min(floater.t * 2, (floater.life - floater.t) * 1.4), 0, 1);
    const sx = floater.x - cam.x + W / 2;
    const sy = floater.y - cam.y + H / 2;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = canvasFont(floater.size);
    ctx.fillStyle = floater.color;
    ctx.fillText(floater.text, sx, sy);
    ctx.restore();
  }
}

function drawScreenNotes() {
  const { W, H } = viewport;
  ctx.textAlign = 'center';
  for (const note of screenNotes) {
    const alpha = clamp(Math.min(note.t * 3, (note.life - note.t) * 1.2), 0, 1);
    ctx.globalAlpha = alpha;
    ctx.font = canvasFont(15);
    ctx.fillStyle = '#d9c58c';
    ctx.fillText(note.text, W / 2, H * 0.3);
    ctx.globalAlpha = 1;
  }
}

function drawFearVignette() {
  const { W, H } = viewport;
  if (state.story.released) return;

  const vignette = ctx.createRadialGradient(
    W / 2, H / 2, H * 0.32 * (1 - state.fear * 0.5),
    W / 2, H / 2, H * 0.75,
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, `rgba(2,3,2,${0.55 + state.fear * 0.4})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  if (state.fear > 0.75) {
    const pulse = 0.6 + 0.4 * Math.sin(performance.now() * 0.006);
    ctx.fillStyle = `rgba(60,10,10,${(state.fear - 0.75) * 0.5 * pulse})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawGrain() {
  const { W, H } = viewport;
  if (!textures.grain) return;
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.translate((rng() * 40) | 0, (rng() * 40) | 0);
  ctx.fillStyle = textures.grain;
  ctx.fillRect(-40, -40, W + 80, H + 80);
  ctx.restore();
}

/** A faint tint per plane: woeful planes redden, Brahmā planes grow pale. */
const REALM_VEILS = Object.freeze({
  apaya: 'rgba(120,20,20,.05)',
  kamasugati: null,
  rupa: 'rgba(210,220,255,.04)',
  arupa: 'rgba(200,225,255,.055)',
});

function drawRealmVeil() {
  const { W, H } = viewport;
  const veil = REALM_VEILS[getRealm().group];
  if (!veil) return;
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, W, H);
}
