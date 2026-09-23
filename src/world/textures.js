'use strict';

import { TAU } from '../core/constants.js';
import { rng } from '../core/rng.js';
import { ctx } from '../systems/viewport.js';

/** Repeating canvas patterns, built once at startup. */
export const textures = {
  grain: null,
  groundNight: null,
  groundDawn: null,
};

function makeGrain() {
  const tile = document.createElement('canvas');
  tile.width = 140;
  tile.height = 140;
  const gc = tile.getContext('2d');
  const image = gc.createImageData(140, 140);
  for (let i = 0; i < image.data.length; i += 4) {
    const v = (rng() * 255) | 0;
    image.data[i] = v;
    image.data[i + 1] = v;
    image.data[i + 2] = v;
    image.data[i + 3] = 14;
  }
  gc.putImageData(image, 0, 0);
  textures.grain = ctx.createPattern(tile, 'repeat');
}

function makeGround(dawn) {
  const tile = document.createElement('canvas');
  tile.width = 256;
  tile.height = 256;
  const gc = tile.getContext('2d');
  gc.fillStyle = dawn ? '#233018' : '#0a120c';
  gc.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 420; i++) {
    const x = rng() * 256;
    const y = rng() * 256;
    const r = 0.6 + rng() * 1.8;
    gc.fillStyle = dawn
      ? `rgba(${(60 + rng() * 40) | 0},${(80 + rng() * 40) | 0},40,.28)`
      : `rgba(${(18 + rng() * 20) | 0},${(34 + rng() * 22) | 0},${(22 + rng() * 14) | 0},.4)`;
    gc.beginPath();
    gc.arc(x, y, r, 0, TAU);
    gc.fill();
  }
  return ctx.createPattern(tile, 'repeat');
}

export function initTextures() {
  makeGrain();
  textures.groundNight = makeGround(false);
  textures.groundDawn = makeGround(true);
}
