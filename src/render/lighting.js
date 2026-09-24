'use strict';

import { SALA, TAU, TEMPLE } from '../core/constants.js';
import { clamp } from '../core/math.js';
import { rng } from '../core/rng.js';
import { state } from '../core/state.js';
import { ctx, lightCanvas, lightCtx, viewport } from '../systems/viewport.js';
import { currentBiome, currentBiomeId } from '../systems/biome.js';
import { visionRadius } from '../systems/vision.js';
import { GATES } from '../world/world-data.js';
import { player } from '../entities/player.js';
import { cam } from '../game/camera.js';

/**
 * Composite the darkness layer: an ambient fill with radial "punches" removed
 * around the player, safe zones and illusory light gates.
 *
 * The player's hole is exactly `visionRadius()` — the same number the game uses
 * to decide what a body can perceive in the dark (systems/vision.js), so the
 * light a form casts and the light it can actually use are never two opinions.
 */
export function renderLighting(mind) {
  const { W, H } = viewport;
  const dawn = state.story.released;

  lightCtx.clearRect(0, 0, W, H);
  // A bright plane like a deva garden is far less dark than the woeful ones.
  const ambient = dawn ? 0.34 : currentBiome().ambient;
  lightCtx.fillStyle = dawn ? `rgba(10,20,12,${ambient})` : `rgba(1,4,6,${ambient})`;
  lightCtx.fillRect(0, 0, W, H);
  lightCtx.globalCompositeOperation = 'destination-out';

  const punch = (x, y, radius, strength) => {
    const sx = x - cam.x + W / 2;
    const sy = y - cam.y + H / 2;
    if (sx < -radius || sx > W + radius || sy < -radius || sy > H + radius) return;
    const gradient = lightCtx.createRadialGradient(sx, sy, radius * 0.1, sx, sy, radius);
    gradient.addColorStop(0, `rgba(0,0,0,${strength})`);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    lightCtx.fillStyle = gradient;
    lightCtx.beginPath();
    lightCtx.arc(sx, sy, radius, 0, TAU);
    lightCtx.fill();
  };

  const vision = visionRadius(mind);
  punch(player.x, player.y, dawn ? 520 : vision, 0.98);
  punch(TEMPLE.x, TEMPLE.y, TEMPLE.r + 120, 0.96);
  punch(SALA.x, SALA.y, 340, 0.9);

  // The forest's light gates only shine in the forest (see story-chapter1.js).
  if (!dawn && state.chapter === 1 && currentBiomeId() === 'memory-forest') {
    for (const gate of GATES) {
      punch(gate.x, gate.y, clamp((state.fear - 0.42) * 260, 0, 150), clamp((state.fear - 0.42) * 2, 0, 0.7));
    }
  }

  lightCtx.globalCompositeOperation = 'source-over';
  ctx.drawImage(lightCanvas, 0, 0, W, H);
}

/** Screen shake offset derived from the current shake impulse. */
export function shakeOffset() {
  return {
    x: (rng() - 0.5) * cam.shake * 10,
    y: (rng() - 0.5) * cam.shake * 10,
  };
}
