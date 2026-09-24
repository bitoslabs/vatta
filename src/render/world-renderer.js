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
import { drawGhost, drawGuardian, drawLure, drawPlayer, drawPrompt, drawSala, drawTeacherLabel, drawTemple, drawTourMarker, drawTree } from './sprites.js';
import { getLures } from '../game/lures.js';
import { bridgeSite, hasBridge, isWaterwayCleared } from '../game/world-memory.js';
import { dynamicFeatures } from '../systems/worldgen.js';
import { GUARDIAN } from '../game/npc.js';

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
  drawFootprints(mind);
  drawTemple(dawn);
  drawSala(dawn);
  drawLightGates(mind);
  drawSparks();
  drawLures();
  drawGuardian(GUARDIAN.x, GUARDIAN.y);
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
  drawPath(RIVER, RIVER_WIDTH * 2, dawn ? '#1b3550' : '#0a1a2c');
  drawPath(RIVER, RIVER_WIDTH * 1.1, dawn ? '#264f70' : '#123049');
}

function drawPaths(dawn) {
  drawPath(PATH, 84, dawn ? '#2a2115' : '#10170d');
  drawPath(FALSE_A, 60, dawn ? '#222015' : '#0d120c');
  drawPath(FALSE_B, 60, dawn ? '#222015' : '#0d120c');
}

function drawFootprints(mind) {
  const { W, H } = viewport;
  const alpha = state.story.released
    ? 0.85
    : clamp(0.5 - state.fear * 0.55 + (mind ? 0.55 : 0), 0, 0.95);
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
