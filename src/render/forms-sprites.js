'use strict';

import { TAU } from '../core/constants.js';

/**
 * Form silhouettes and locomotion (design §10).
 *
 * Every body is drawn feet-anchored at (x, y) — the same point collision and the
 * camera use — so wings, halos and shells never move the hitbox. The minimum
 * action set lives here: idle, walk (limbs driven by `phase`), swim (bodies
 * settle with a ripple), fly (a lift with a smaller, offset shadow), ability /
 * interaction (`act`), and the shared chest light that marks the player in any
 * body. Everything is procedural: no image files.
 */

const CHEST_LIGHT = 'rgba(255,228,170,';

const PALETTES = {
  human: { robe: 'rgba(213,207,186,1)', skin: 'rgba(185,154,108,1)', trim: 'rgba(233,217,160,.6)' },
  deer: { robe: 'rgba(150,110,74,1)', skin: 'rgba(196,156,110,1)', trim: 'rgba(233,217,160,.6)' },
  dog: { robe: 'rgba(120,102,82,1)', skin: 'rgba(180,158,126,1)', trim: 'rgba(233,217,160,.6)' },
  crane: { robe: 'rgba(226,226,220,1)', skin: 'rgba(206,120,96,1)', trim: 'rgba(233,217,160,.6)' },
  turtle: {
    robe: 'rgba(96,118,92,1)',
    skin: 'rgba(150,160,120,1)',
    shell: 'rgba(74,102,78,1)',
    shellLine: 'rgba(210,225,200,.4)',
    trim: 'rgba(233,217,160,.6)',
  },
  monkey: { robe: 'rgba(160,104,62,1)', skin: 'rgba(206,158,112,1)', trim: 'rgba(233,217,160,.6)' },
  butterfly: {
    robe: 'rgba(60,60,80,1)',
    skin: 'rgba(150,150,180,1)',
    wing: 'rgba(90,110,190,.85)',
    trim: 'rgba(233,217,160,.6)',
  },
  fish: { robe: 'rgba(150,170,190,1)', skin: 'rgba(230,240,250,1)', trim: 'rgba(233,217,160,.6)' },
  asura: { robe: 'rgba(70,86,140,1)', skin: 'rgba(120,142,180,1)', trim: 'rgba(226,196,120,.85)' },
  deva: { robe: 'rgba(226,214,164,1)', skin: 'rgba(240,226,190,1)', trim: 'rgba(255,244,200,.8)' },
};

const DEFAULT_PALETTE = PALETTES.human;

/** A leg or limb: from (x, y) to (x + dx, y + dy), animated by `swing`. */
function limb(ctx, x, y, dx, dy, swing, width = 2) {
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dx + swing, y + dy);
  ctx.stroke();
}

const SHAPES = {
  human(ctx, x, y, o, C) {
    const swing = o.walking ? Math.sin(o.phase) * 3.2 : 0;
    ctx.strokeStyle = C.robe;
    limb(ctx, x - 4, y + 4, -2, 8, swing, 2.2);
    limb(ctx, x + 4, y + 4, 2, 8, -swing, 2.2);
    ctx.fillStyle = C.robe;
    ctx.beginPath();
    ctx.ellipse(x, y + 1 + o.bob * 0.4, 11, 9, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = C.skin;
    ctx.beginPath();
    ctx.arc(x, y - 10 + o.bob, 7, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#141210';
    ctx.beginPath();
    ctx.arc(x, y - 12 + o.bob, 6.4, Math.PI, TAU);
    ctx.fill();
  },

  deer(ctx, x, y, o, C) {
    const swing = o.walking ? Math.sin(o.phase) * 4 : 0;
    ctx.strokeStyle = C.robe;
    limb(ctx, x - 7, y - 4, 0, 14, swing, 2);
    limb(ctx, x + 6, y - 4, 0, 14, -swing, 2);
    ctx.fillStyle = C.robe;
    ctx.beginPath();
    ctx.ellipse(x, y - 8 + o.bob * 0.4, 13, 6, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = C.skin;
    ctx.beginPath();
    ctx.arc(x + o.face * 11, y - 17 + o.bob, 4.2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = C.skin;
    ctx.lineWidth = 1.2;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + o.face * 11 + side * 2, y - 20 + o.bob);
      ctx.lineTo(x + o.face * 11 + side * 5, y - 29 + o.bob);
      ctx.lineTo(x + o.face * 11 + side * 8, y - 25 + o.bob);
      ctx.stroke();
    }
  },

  dog(ctx, x, y, o, C) {
    const swing = o.walking ? Math.sin(o.phase) * 3 : 0;
    ctx.strokeStyle = C.robe;
    limb(ctx, x - 5, y - 2, 0, 10, swing, 2);
    limb(ctx, x + 5, y - 2, 0, 10, -swing, 2);
    ctx.fillStyle = C.robe;
    ctx.beginPath();
    ctx.ellipse(x, y - 8 + o.bob * 0.5, 11, 6, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + o.face * 9, y - 15 + o.bob, 5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = C.robe;
    const wag = o.acting ? Math.sin(o.phase * 3) * 5 : Math.sin(o.phase) * 2;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(x - o.face * 10, y - 10);
    ctx.quadraticCurveTo(x - o.face * 18, y - 18, x - o.face * 13 + wag, y - 24);
    ctx.stroke();
  },

  crane(ctx, x, y, o, C) {
    const swing = o.walking && o.kind !== 'fly' ? Math.sin(o.phase) * 3.5 : 0;
    ctx.strokeStyle = C.robe;
    limb(ctx, x - 3, y - 2, 0, 12, swing, 1.6);
    limb(ctx, x + 3, y - 2, 0, 12, -swing, 1.6);
    ctx.fillStyle = C.robe;
    ctx.beginPath();
    ctx.ellipse(x, y - 10 + o.bob * 0.4, 8, 6, 0, 0, TAU);
    ctx.fill();
    // Wings beat hardest in flight.
    const flap = o.kind === 'fly'
      ? Math.sin(o.phase * 2.4) * 0.6 + 0.6
      : (o.acting ? 0.6 : 0);
    ctx.beginPath();
    ctx.ellipse(x - 10, y - 14 - flap * 9, 10, 4, -0.5, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 10, y - 14 - flap * 9, 10, 4, 0.5, 0, TAU);
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
    const paddle = o.walking || o.kind === 'swim' ? Math.sin(o.phase) * 3 : 0;
    ctx.strokeStyle = C.skin;
    limb(ctx, x - 12, y - 4, -3, 6, paddle, 2.4);
    limb(ctx, x + 12, y - 4, 3, 6, -paddle, 2.4);
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
    ctx.arc(x + o.face * 13, y - 6 + o.bob * 0.3, 3.6, 0, TAU);
    ctx.fill();
  },

  monkey(ctx, x, y, o, C) {
    const swing = o.walking ? Math.sin(o.phase) * 5 : 0;
    ctx.strokeStyle = C.robe;
    limb(ctx, x - 4, y - 12, -2, 12, -swing, 2);
    limb(ctx, x + 4, y - 12, 2, 12, swing, 2);
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
  },

  butterfly(ctx, x, y, o, C) {
    const flap = Math.sin(o.phase * 3.2) * 0.5 + 0.5;
    ctx.fillStyle = C.wing;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + side * 9, y - 11, 9 * (0.35 + flap * 0.65), 7, side * 0.3, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + side * 7, y - 2, 6 * (0.35 + flap * 0.65), 5, side * -0.2, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = C.robe;
    ctx.beginPath();
    ctx.ellipse(x, y - 7 + o.bob * 0.6, 2.4, 8, 0, 0, TAU);
    ctx.fill();
  },

  fish(ctx, x, y, o, C) {
    const wiggle = o.kind === 'swim' ? Math.sin(o.phase * 2.6) * 0.35 : Math.sin(o.phase * 4) * 0.2;
    ctx.save();
    ctx.translate(x, y - 5 + o.bob * 0.6);
    ctx.rotate(o.kind === 'swim' ? wiggle * 0.5 : wiggle * 0.25);
    ctx.fillStyle = C.robe;
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 6, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-o.face * 10, 0);
    ctx.lineTo(-o.face * 18, -6 + wiggle * 8);
    ctx.lineTo(-o.face * 18, 6 + wiggle * 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C.skin;
    ctx.beginPath();
    ctx.arc(o.face * 6, -2, 1.6, 0, TAU);
    ctx.fill();
    ctx.restore();
  },

  asura(ctx, x, y, o, C) {
    const swing = o.walking ? Math.sin(o.phase) * 3 : 0;
    ctx.fillStyle = C.robe;
    ctx.beginPath();
    ctx.moveTo(x - 15, y + 12);
    ctx.lineTo(x - 17, y - 20);
    ctx.lineTo(x + 17, y - 20);
    ctx.lineTo(x + 15, y + 12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = C.robe;
    limb(ctx, x - 15, y - 14, -7, 16, -swing, 5);
    limb(ctx, x + 15, y - 14, 7, 16, swing, 5);
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
    const sway = o.walking ? Math.sin(o.phase) * 2.4 : Math.sin(o.phase * 0.6) * 0.8;
    ctx.fillStyle = C.robe;
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 12);
    ctx.quadraticCurveTo(x - 6 + sway, y - 22, x, y - 26);
    ctx.quadraticCurveTo(x + 6 + sway, y - 22, x + 10, y + 12);
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

/** Draw one form's silhouette, feet-anchored, with idle/walk/swim/fly/act. */
export function drawFormBody(ctx, formId, x, y, options = {}) {
  const phase = options.phase || 0;
  const o = {
    face: options.face >= 0 ? 1 : -1,
    bob: options.bob || 0,
    moving: Boolean(options.moving),
    walking: Boolean(options.moving) && (options.kind || 'walk') === 'walk',
    acting: (options.act || 0) > 0,
    act: options.act || 0,
    kind: options.kind || 'walk',
    phase,
  };
  const palette = PALETTES[formId] || DEFAULT_PALETTE;

  // Flyers lift off the ground and cast a smaller, offset shadow.
  const lift = o.kind === 'fly' ? 10 + Math.sin(phase * 2) * 1.6 : 0;
  const sink = o.kind === 'swim' ? 4 : 0;

  ctx.save();
  if (o.moving && o.kind === 'walk') {
    const squash = 1 + Math.sin(phase) * 0.03;
    ctx.translate(x, y);
    ctx.scale(1, squash);
    ctx.translate(-x, -y);
  }

  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.beginPath();
  if (o.kind === 'fly') ctx.ellipse(x, y + 12, 8, 3, 0, 0, TAU);
  else if (o.kind === 'swim') ctx.ellipse(x, y + 10, 13, 4, 0, 0, TAU);
  else ctx.ellipse(x, y + 12, 12, 5, 0, 0, TAU);
  ctx.fill();

  // Water ripples around a body that is in the river.
  if (o.kind === 'swim') {
    ctx.strokeStyle = 'rgba(180,215,235,.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.ellipse(x, y + 8, 16 + i * 7 + Math.sin(phase * 2 + i) * 1.5, 5 + i * 2, 0, 0, TAU);
      ctx.stroke();
    }
  }

  ctx.translate(0, -lift + sink);
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

/** Form-specific aura: a deva's light, an asura's weight, a fish's wake. */
export function drawFormAura(ctx, formId, x, y, phase) {
  if (formId === 'deva') {
    ctx.fillStyle = `rgba(255,246,205,${0.1 + Math.sin(phase) * 0.03})`;
    ctx.beginPath();
    ctx.arc(x, y - 18, 22, 0, TAU);
    ctx.fill();
  } else if (formId === 'asura') {
    ctx.strokeStyle = 'rgba(226,196,120,.28)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y - 12, 20 + Math.sin(phase * 0.8) * 1.4, 0, TAU);
    ctx.stroke();
  }
}

export const FORM_PALETTES = PALETTES;
