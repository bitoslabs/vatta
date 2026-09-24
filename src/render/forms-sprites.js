'use strict';

import { TAU } from '../core/constants.js';

/**
 * Form silhouettes (design §10).
 *
 * Every body is drawn feet-anchored at (x, y) — the same point the collision
 * and camera use — so wings, halos and shells never move the hitbox. The
 * minimum action set is expressed here: idle, movement (a bob and squash),
 * ability/interact (an act flourish) and the shared chest light that marks the
 * player in any body.
 */

const CHEST_LIGHT = 'rgba(255,228,170,';

const SHAPES = {
  human(ctx, x, y, o, C) {
    ctx.fillStyle = C.robe;
    ctx.beginPath();
    ctx.ellipse(x, y + 3 + o.bob * 0.4, 11, 9, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = C.skin;
    ctx.beginPath();
    ctx.arc(x, y - 8 + o.bob, 7, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#141210';
    ctx.beginPath();
    ctx.arc(x, y - 10 + o.bob, 6.4, Math.PI, TAU);
    ctx.fill();
  },

  deer(ctx, x, y, o, C) {
    ctx.strokeStyle = C.robe;
    ctx.lineWidth = 2;
    for (const leg of [-6, 6]) {
      ctx.beginPath();
      ctx.moveTo(x + leg, y);
      ctx.lineTo(x + leg + o.face * 1.5, y + 12);
      ctx.stroke();
    }
    ctx.fillStyle = C.robe;
    ctx.beginPath();
    ctx.ellipse(x, y - 6 + o.bob * 0.4, 12, 6, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = C.skin;
    ctx.beginPath();
    ctx.arc(x + o.face * 10, y - 16 + o.bob, 4.2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = C.skin;
    ctx.lineWidth = 1.2;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + o.face * 10 + side * 2, y - 19 + o.bob);
      ctx.lineTo(x + o.face * 10 + side * 5, y - 28 + o.bob);
      ctx.lineTo(x + o.face * 10 + side * 7, y - 24 + o.bob);
      ctx.stroke();
    }
  },

  dog(ctx, x, y, o, C) {
    ctx.strokeStyle = C.robe;
    ctx.lineWidth = 2;
    for (const leg of [-5, 5]) {
      ctx.beginPath();
      ctx.moveTo(x + leg, y - 2);
      ctx.lineTo(x + leg + o.face * 2, y + 10);
      ctx.stroke();
    }
    ctx.fillStyle = C.robe;
    ctx.beginPath();
    ctx.ellipse(x, y - 8 + o.bob * 0.5, 11, 6, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + o.face * 9, y - 15 + o.bob, 5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = C.robe;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(x - o.face * 10, y - 10);
    ctx.quadraticCurveTo(x - o.face * 18, y - 18, x - o.face * 13, y - 24);
    ctx.stroke();
  },

  crane(ctx, x, y, o, C) {
    ctx.strokeStyle = C.robe;
    ctx.lineWidth = 1.6;
    for (const leg of [-3, 3]) {
      ctx.beginPath();
      ctx.moveTo(x + leg, y - 2);
      ctx.lineTo(x + leg, y + 12);
      ctx.stroke();
    }
    ctx.fillStyle = C.robe;
    ctx.beginPath();
    ctx.ellipse(x, y - 10 + o.bob * 0.4, 8, 6, 0, 0, TAU);
    ctx.fill();
    const flap = o.act > 0 ? Math.sin(o.act * 22) * 0.5 + 0.5 : 0;
    ctx.beginPath();
    ctx.ellipse(x - 9, y - 14 - flap * 6, 9, 4, -0.5, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 9, y - 14 - flap * 6, 9, 4, 0.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = C.skin;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - 14);
    ctx.quadraticCurveTo(x + o.face * 4, y - 26, x + o.face * 1, y - 30 + o.bob);
    ctx.stroke();
    ctx.fillStyle = C.skin;
    ctx.beginPath();
    ctx.arc(x + o.face * 1, y - 32 + o.bob, 3.4, 0, TAU);
    ctx.fill();
  },

  turtle(ctx, x, y, o, C) {
    ctx.fillStyle = C.robe;
    ctx.beginPath();
    ctx.ellipse(x, y - 4, 14, 8, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = C.shell;
    ctx.beginPath();
    ctx.ellipse(x, y - 8, 12, 7, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = C.shellLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y - 8, 7, 4, 0, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = C.skin;
    ctx.beginPath();
    ctx.arc(x + o.face * 12, y - 6 + o.bob * 0.3, 3.6, 0, TAU);
    ctx.fill();
  },

  monkey(ctx, x, y, o, C) {
    ctx.strokeStyle = C.robe;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x - o.face * 8, y - 6);
    ctx.quadraticCurveTo(x - o.face * 20, y - 12, x - o.face * 14, y - 26);
    ctx.stroke();
    ctx.fillStyle = C.robe;
    ctx.beginPath();
    ctx.ellipse(x, y - 6 + o.bob * 0.5, 8, 7, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = C.skin;
    ctx.beginPath();
    ctx.arc(x, y - 15 + o.bob, 5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = C.robe;
    ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x - 4, y - 10);
      ctx.lineTo(x - 10 + side * 3, y + 2);
      ctx.stroke();
    }
  },

  butterfly(ctx, x, y, o, C) {
    const flap = Math.sin(performance.now() * 0.012) * 0.5 + 0.5;
    ctx.fillStyle = C.wing;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + side * 9, y - 10, 9 * (0.4 + flap * 0.6), 7, side * 0.3, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + side * 7, y - 2, 6 * (0.4 + flap * 0.6), 5, side * -0.2, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = C.robe;
    ctx.beginPath();
    ctx.ellipse(x, y - 7 + o.bob * 0.6, 2.4, 8, 0, 0, TAU);
    ctx.fill();
  },

  fish(ctx, x, y, o, C) {
    ctx.fillStyle = C.robe;
    ctx.beginPath();
    ctx.ellipse(x, y - 5 + o.bob * 0.6, 11, 6, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - o.face * 10, y - 5 + o.bob * 0.6);
    ctx.lineTo(x - o.face * 18, y - 11 + o.bob * 0.6);
    ctx.lineTo(x - o.face * 18, y + 1 + o.bob * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C.skin;
    ctx.beginPath();
    ctx.arc(x + o.face * 6, y - 7 + o.bob * 0.6, 1.6, 0, TAU);
    ctx.fill();
  },

  asura(ctx, x, y, o, C) {
    ctx.fillStyle = C.robe;
    ctx.beginPath();
    ctx.moveTo(x - 15, y + 12);
    ctx.lineTo(x - 17, y - 20);
    ctx.lineTo(x + 17, y - 20);
    ctx.lineTo(x + 15, y + 12);
    ctx.closePath();
    ctx.fill();
    // Thick arms and the cracked gold trim of the tower-bearer.
    ctx.strokeStyle = C.robe;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x - 15, y - 14);
    ctx.lineTo(x - 22, y + 4);
    ctx.moveTo(x + 15, y - 14);
    ctx.lineTo(x + 22, y + 4);
    ctx.stroke();
    ctx.strokeStyle = C.trim;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x - 12, y - 6);
    ctx.lineTo(x + 12, y - 6);
    ctx.stroke();
    ctx.fillStyle = C.skin;
    ctx.beginPath();
    ctx.arc(x, y - 27 + o.bob, 7.5, 0, TAU);
    ctx.fill();
  },

  deva(ctx, x, y, o, C) {
    ctx.fillStyle = C.robe;
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 12);
    ctx.quadraticCurveTo(x - 6, y - 22, x, y - 26);
    ctx.quadraticCurveTo(x + 6, y - 22, x + 10, y + 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C.skin;
    ctx.beginPath();
    ctx.arc(x, y - 32 + o.bob, 5.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = C.trim;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(x, y - 34 + o.bob, 12, 0, TAU);
    ctx.stroke();
  },
};

const PALETTES = {
  human: { robe: 'rgba(213,207,186,1)', skin: 'rgba(185,154,108,1)', trim: 'rgba(233,217,160,.6)' },
  deer: { robe: 'rgba(150,110,74,1)', skin: 'rgba(196,156,110,1)', trim: 'rgba(233,217,160,.6)' },
  dog: { robe: 'rgba(120,102,82,1)', skin: 'rgba(180,158,126,1)', trim: 'rgba(233,217,160,.6)' },
  crane: { robe: 'rgba(226,226,220,1)', skin: 'rgba(206,120,96,1)', trim: 'rgba(233,217,160,.6)' },
  turtle: { robe: 'rgba(96,118,92,1)', skin: 'rgba(150,160,120,1)', shell: 'rgba(74,102,78,1)', shellLine: 'rgba(210,225,200,.4)', trim: 'rgba(233,217,160,.6)' },
  monkey: { robe: 'rgba(160,104,62,1)', skin: 'rgba(206,158,112,1)', trim: 'rgba(233,217,160,.6)' },
  butterfly: { robe: 'rgba(60,60,80,1)', skin: 'rgba(150,150,180,1)', wing: 'rgba(90,110,190,.85)', trim: 'rgba(233,217,160,.6)' },
  fish: { robe: 'rgba(150,170,190,1)', skin: 'rgba(230,240,250,1)', trim: 'rgba(233,217,160,.6)' },
  asura: { robe: 'rgba(70,86,140,1)', skin: 'rgba(120,142,180,1)', trim: 'rgba(226,196,120,.85)' },
  deva: { robe: 'rgba(226,214,164,1)', skin: 'rgba(240,226,190,1)', trim: 'rgba(255,244,200,.8)' },
};

const DEFAULT_PALETTE = PALETTES.human;

/** Draw one form's silhouette, feet-anchored, with idle/move/act animation. */
export function drawFormBody(ctx, formId, x, y, options = {}) {
  const o = {
    face: options.face >= 0 ? 1 : -1,
    bob: options.bob || 0,
    moving: Boolean(options.moving),
    act: options.act || 0,
    dawn: Boolean(options.dawn),
  };
  const palette = { ...(PALETTES[formId] || DEFAULT_PALETTE) };

  ctx.save();
  const squash = o.moving ? 1 + Math.sin(o.bob) * 0.03 : 1;
  ctx.translate(x, y);
  ctx.scale(1, squash);
  ctx.translate(-x, -y);

  // Shadow and feet stay put; bodies breathe above them.
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.beginPath();
  ctx.ellipse(x, y + 12, 12, 5, 0, 0, TAU);
  ctx.fill();

  const shape = SHAPES[formId] || SHAPES.human;
  shape(ctx, x, y, o, palette);
  ctx.restore();
}

/** The shared chest light: the one thing that marks the player in any body. */
export function drawChestLight(ctx, x, y, strength = 1) {
  const pulse = 0.7 + Math.sin(performance.now() * 0.006) * 0.3;
  const alpha = 0.35 + Math.min(0.6, strength) * 0.5;
  ctx.fillStyle = `${CHEST_LIGHT}${alpha * 0.22})`;
  ctx.beginPath();
  ctx.arc(x, y, 13, 0, TAU);
  ctx.fill();
  ctx.fillStyle = `${CHEST_LIGHT}${alpha * pulse})`;
  ctx.beginPath();
  ctx.arc(x, y, 3.4, 0, TAU);
  ctx.fill();
}

/** A quick ring that reads as "an action just happened" (design §10). */
export function drawActFlourish(ctx, x, y, t) {
  const progress = 1 - Math.max(0, Math.min(1, t / 0.55));
  const radius = 12 + progress * 22;
  ctx.strokeStyle = `rgba(233,217,160,${(1 - progress) * 0.6})`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.stroke();
}

export const FORM_PALETTES = PALETTES;
