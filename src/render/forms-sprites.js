'use strict';

import { TAU } from '../core/constants.js';
import { FORMS } from '../content/forms.js';
import { ANIMALS as ANIMAL_CATALOG } from '../prototypes/animal-catalog.js';
import { drawAnimalVector } from './animal-vectors.js';

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
  niraya: { robe: 'rgba(78,48,55,1)', skin: 'rgba(178,111,99,1)', trim: 'rgba(232,145,108,.8)' },
  peta: { robe: 'rgba(65,75,82,1)', skin: 'rgba(156,169,160,1)', trim: 'rgba(195,210,190,.6)' },
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

  niraya(ctx, x, y, o, C) {
    SHAPES.human(ctx, x, y, o, C);
    ctx.strokeStyle = C.trim;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y - 8, 17, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();
  },

  peta(ctx, x, y, o, C) {
    SHAPES.human(ctx, x, y, o, C);
    ctx.strokeStyle = C.trim;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y - 18, 14, 23, 0, 0, TAU);
    ctx.stroke();
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

/**
 * The reference sizes, read from the forms themselves (content/forms.js `width`), so
 * a shadow, a ring or a lean is the right size for the body it belongs to — the
 * design's "ขนาดอ้างอิง" without a second table to keep in step.
 */
const BODY_WIDTH = Object.fromEntries(FORMS.map((form) => [form.id, form.width || 64]));

function widthOf(formId) {
  return BODY_WIDTH[formId] || 64;
}

/**
 * Draw one form's silhouette, feet-anchored, in one of the six poses (design §10:
 * อยู่เฉย · เคลื่อนที่ · ใช้ความสามารถ · ปฏิสัมพันธ์ · ตั้งสติ · เปลี่ยนชาติ), with the
 * locomotion the body actually uses (walk, hop, slither, climb, glide, swim, burrow).
 *
 * Every deformation happens about the feet, because the design's other rule is that
 * the hitbox lives at the feet: wings, auras and flourishes may move, the ground
 * under the body may not.
 */
export function drawFormBody(ctx, formId, x, y, options = {}) {
  const phase = options.phase || 0;
  const moving = Boolean(options.moving);
  const kind = options.kind || 'walk';
  const pose = options.pose || (moving ? 'move' : 'idle');
  const arriving = pose === 'rebirth' ? Math.max(0, Math.min(1, Number(options.t) || 0)) : 0;
  const o = {
    face: options.toward === -1 || options.toward === 1 ? options.toward : (options.face >= 0 ? 1 : -1),
    bob: options.bob || 0,
    moving,
    walking: moving && kind === 'walk',
    acting: (options.act || 0) > 0 || pose === 'act',
    act: options.act || 0,
    kind,
    pose,
    phase,
  };
  const palette = PALETTES[formId] || DEFAULT_PALETTE;
  const scale = widthOf(formId) / 64; // one body's own size, as a factor

  // How this body leaves the ground, by how it moves.
  let lift = 0;
  if (kind === 'glide' || kind === 'fly') lift = 10 + Math.sin(phase * 2) * 1.6;
  else if (kind === 'hop' && moving) lift = Math.abs(Math.sin(phase)) * 9;
  else if (kind === 'climb') lift = 2 + Math.sin(phase) * 1.2;
  lift += Math.max(0, Number(options.lift) || 0);
  if (pose === 'rebirth') lift += 6 * (1 - arriving) + 2;
  if (pose === 'rest') lift -= 2;
  const sink = kind === 'swim' ? 4 : 0;

  ctx.save();
  // Deformations about the feet, so nothing moves the ground under the body.
  if (pose === 'rebirth') {
    const grow = 0.9 + arriving * 0.18;
    ctx.translate(x, y);
    ctx.scale(grow, grow);
    ctx.translate(-x, -y);
  } else if (pose === 'meditate') {
    ctx.translate(x, y);
    ctx.scale(1, 0.95);
    ctx.translate(-x, -y);
  } else if (pose === 'rest') {
    ctx.translate(x, y);
    ctx.scale(1.02, 0.92);
    ctx.translate(-x, -y);
  } else if (pose === 'interact') {
    ctx.translate(x, y);
    ctx.rotate(o.face * 0.05);
    ctx.translate(-x, -y);
  } else if (moving && kind === 'walk') {
    const squash = 1 + Math.sin(phase) * 0.03;
    ctx.translate(x, y);
    ctx.scale(1, squash);
    ctx.translate(-x, -y);
  } else if (pose === 'idle') {
    const breathe = 1 + Math.sin(phase * 0.6) * 0.012;
    ctx.translate(x, y);
    ctx.scale(1, breathe);
    ctx.translate(-x, -y);
  }
  if (moving && kind === 'slither') ctx.translate(Math.sin(phase * 1.4) * 2.2 * scale, 0);
  if (moving && kind === 'burrow') ctx.translate(0, 3);

  // The shadow: its size belongs to the body, not to a fixed number.
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.beginPath();
  if (kind === 'glide' || kind === 'fly') ctx.ellipse(x, y + 12, 8 * scale, 3 * scale, 0, 0, TAU);
  else if (kind === 'swim') ctx.ellipse(x, y + 10, 13 * scale, 4 * scale, 0, 0, TAU);
  else ctx.ellipse(x, y + 12, 12 * scale, 5 * scale, 0, 0, TAU);
  ctx.fill();

  // The poses that settle: a slow ring, as wide as the body is.
  if (pose === 'meditate') {
    ctx.strokeStyle = 'rgba(233,217,160,.35)';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.ellipse(x, y + 2, (14 + i * 9) * scale + Math.sin(phase * 0.7 + i) * 1.4, (5 + i * 3) * scale, 0, 0, TAU);
      ctx.stroke();
    }
  } else if (pose === 'rest') {
    ctx.strokeStyle = 'rgba(185,207,191,.3)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 15 * scale + Math.sin(phase * 0.5) * 1.2, 5 * scale, 0, 0, TAU);
    ctx.stroke();
  } else if (pose === 'interact') {
    // Speaking with someone: a small arc in front, and no ring around the self.
    ctx.strokeStyle = 'rgba(233,217,160,.4)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(x + o.face * 14 * scale, y - 6, 7 * scale, -0.9, 0.9);
    ctx.stroke();
  }

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

/**
 * The companion (systems/companion.js), drawn as a body *and* a mark: the chest
 * light belongs to the player alone, so a companion carries a pale collar and a soft
 * halo instead. On dark ground — brambles, night, the mist at the swarm field — the
 * dog's own colours all but vanish, and the collar is what keeps it findable.
 */
export function drawCompanion(ctx, dog, { pose = 'idle' } = {}) {
  if (!dog || !dog.active) return false;
  const moving = dog.mode === 'following';
  const phase = performance.now() * 0.004;
  // A soft halo, under the body: presence rather than a lamp.
  ctx.fillStyle = 'rgba(233,217,160,.10)';
  ctx.beginPath();
  ctx.ellipse(dog.x, dog.y - 6, 22, 16, 0, 0, TAU);
  ctx.fill();

  drawFormBody(ctx, 'dog', dog.x, dog.y, {
    face: dog.face,
    phase,
    bob: Math.sin(phase) * 1.2,
    moving,
    pose,
  });

  // The collar: the one bright thing about a companion, and never brighter than a
  // person's own light.
  ctx.strokeStyle = 'rgba(233,217,160,.85)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(dog.x + dog.face * 4, dog.y - 12, 4.6, 0, TAU);
  ctx.stroke();
  return true;
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

/**
 * Form-specific signature effects (design §10: "เอฟเฟกต์เฉพาะร่างเพิ่ม (ฝุ่นอสุร,
 * พายุครุฑ)"). Drawn behind the body, feet-anchored like everything else, so a
 * signature never moves the ground the hitbox stands on.
 *
 * Each form's own mark:
 *   asura    — a gold ring and dust kicked up at the feet: power that carries weight
 *   deva     — a soft halo and light motes drifting up: a body that walks on light
 *   firefly  — a warm pulse: the one body the mist is nothing to (game/firefly.js)
 *
 * `phase` drives every mote, so the same body and phase draw the same thing (the
 * lab and the game share it, and tests can compare one pose to another). The
 * "ลดการเคลื่อนไหว" setting keeps the still part of each mark — the ring, the
 * halo, the pulse — and drops only the moving motes, so the story reads the same.
 */
export function drawFormAura(ctx, formId, x, y, phase = 0, options = {}) {
  const reduced = options.reduced === true;
  const moving = options.moving === true;
  const acting = options.acting === true;

  if (formId === 'deva') {
    ctx.fillStyle = `rgba(255,246,205,${0.1 + Math.sin(phase) * 0.03})`;
    ctx.beginPath();
    ctx.arc(x, y - 18, 22, 0, TAU);
    ctx.fill();
    if (!reduced) {
      // Light motes rising off the halo.
      for (let i = 0; i < 3; i++) {
        const t = (phase * 0.4 + i * 0.33) % 1;
        const angle = i * 2.1 + phase * 0.5;
        const radius = 13 + t * 9;
        ctx.fillStyle = `rgba(255,246,205,${(1 - t) * 0.28})`;
        ctx.beginPath();
        ctx.arc(x + Math.cos(angle) * radius, y - 18 - t * 16, 1.6, 0, TAU);
        ctx.fill();
      }
    }
  } else if (formId === 'asura') {
    ctx.strokeStyle = 'rgba(226,196,120,.28)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y - 12, 20 + Math.sin(phase * 0.8) * 1.4, 0, TAU);
    ctx.stroke();
    if (!reduced) {
      // Dust at the feet, raised hardest when lifting or heaving forward.
      const strength = (moving ? 1 : 0.5) + (acting ? 0.6 : 0);
      for (let i = 0; i < 4; i++) {
        const t = (phase * 0.35 + i * 0.25) % 1;
        const dx = Math.sin(i * 2.1 + phase) * (8 + i * 3);
        const alpha = (1 - t) * (0.16 + 0.1 * strength);
        ctx.fillStyle = `rgba(180,158,120,${alpha})`;
        ctx.beginPath();
        ctx.arc(x + dx, y + 10 - t * (12 + strength * 8), 1.4 + i * 0.3, 0, TAU);
        ctx.fill();
      }
    }
  } else if (formId === 'firefly') {
    const pulse = 0.5 + Math.sin(phase * 3) * 0.5;
    ctx.fillStyle = `rgba(240,224,168,${0.1 + pulse * 0.16})`;
    ctx.beginPath();
    ctx.arc(x, y - 10, 10 + pulse * 5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = `rgba(255,240,190,${0.5 + pulse * 0.5})`;
    ctx.beginPath();
    ctx.arc(x, y - 10, 1.8, 0, TAU);
    ctx.fill();
  }
}

export const FORM_PALETTES = PALETTES;

/**
 * The lab roster, drawn in the main game (docs/animal-lives-story.md,
 * character-lab.html).
 *
 * The eight animals added for the animal lives keep their one source of art:
 * src/render/animal-vectors.js, the same procedural paths the character lab
 * exercises. Nothing is re-drawn here, so a body looks identical in the lab and
 * on the road, and `drawFormBody` keeps owning the shadow, the lift and the
 * chest light for every form.
 */
const LAB_ANIMALS = new Map(ANIMAL_CATALOG.map((animal) => [animal.id, animal]));

const LAB_PALETTES = {
  worm: { robe: 'rgba(202,145,128,1)', skin: 'rgba(168,107,96,1)', trim: 'rgba(233,217,160,.6)' },
  ant: { robe: 'rgba(121,80,59,1)', skin: 'rgba(152,100,70,1)', trim: 'rgba(233,217,160,.6)' },
  frog: { robe: 'rgba(134,168,94,1)', skin: 'rgba(101,135,85,1)', trim: 'rgba(233,217,160,.6)' },
  snake: { robe: 'rgba(142,170,105,1)', skin: 'rgba(89,111,71,1)', trim: 'rgba(233,217,160,.6)' },
  rabbit: { robe: 'rgba(194,171,140,1)', skin: 'rgba(177,155,125,1)', trim: 'rgba(233,217,160,.6)' },
  elephant: { robe: 'rgba(142,158,152,1)', skin: 'rgba(122,145,138,1)', trim: 'rgba(233,217,160,.6)' },
  tiger: { robe: 'rgba(209,162,99,1)', skin: 'rgba(196,147,83,1)', trim: 'rgba(233,217,160,.6)' },
  owl: { robe: 'rgba(157,142,114,1)', skin: 'rgba(140,126,102,1)', trim: 'rgba(233,217,160,.6)' },
};

for (const [id, animal] of LAB_ANIMALS) {
  PALETTES[id] = LAB_PALETTES[id] || DEFAULT_PALETTE;
  SHAPES[id] = (ctx, x, y, o) => {
    ctx.save();
    ctx.translate(x, y);
    drawAnimalVector(ctx, { ...animal, duration: 1 }, {
      phase: o.phase,
      face: o.face,
      action: o.acting ? Math.max(0, Math.min(1, o.act)) : 0,
    }, o.moving, { shadow: false });
    ctx.restore();
  };
}
