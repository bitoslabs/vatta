'use strict';

import { MODE, TAU, WORLD } from '../core/constants.js';
import { clamp } from '../core/math.js';
import { rng } from '../core/rng.js';
import { state } from '../core/state.js';
import { isMindful } from '../systems/input.js';
import { t } from '../systems/i18n.js';
import { getRealm } from '../systems/samsara.js';
import { teacherLandmarks, tourTarget } from '../systems/teacher.js';
import { floaters, screenNotes, sparks } from '../systems/effects.js';
import { ctx, viewport } from '../systems/viewport.js';
import { textures } from '../world/textures.js';
import { FALSE_A, FALSE_B, FOOT, GATES, PATH, RIVER, RIVER_WIDTH, TREES } from '../world/world-data.js';
import { cam } from '../game/camera.js';
import { ghosts } from '../entities/ghost.js';
import { player } from '../entities/player.js';
import { updateHud } from '../ui/hud.js';
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
import { visionRadius } from '../systems/vision.js';
import { dynamicFeatures } from '../systems/worldgen.js';
import { currentBiome } from '../systems/biome.js';
import { getForm, isWaterBound } from '../systems/forms.js';
import { goalFor } from '../systems/goals.js';
import { GUARDIAN } from '../game/npc.js';
import { ENCOUNTERS } from '../content/encounters.js';

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
  drawFootprints(mind);
  drawTemple(dawn);
  drawSala(dawn);
  drawLightGates(mind);
  drawSparks();
  drawLures();
  drawLifeGoal();
  drawGuardian(GUARDIAN.x, GUARDIAN.y);
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
  drawPath(PATH, 84, dawn ? '#2a2115' : '#10170d');
  drawPath(FALSE_A, 60, dawn ? '#222015' : '#0d120c');
  drawPath(FALSE_B, 60, dawn ? '#222015' : '#0d120c');
}

function drawFootprints(mind) {
  const { W, H } = viewport;
  const scent = getForm().scent ? 1.6 : 1;
  const alpha = clamp((state.story.released
    ? 0.85
    : clamp(0.5 - state.fear * 0.55 + (mind ? 0.55 : 0), 0, 0.95)) * scent, 0, 1);
  if (alpha <= 0.04) return;

  for (const foot of FOOT) {
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

function drawSparks() {
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
    ctx.font = `300 ${floater.size}px 'Bai Jamjuree'`;
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
    ctx.font = "300 15px 'Bai Jamjuree'";
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
