'use strict';

import { state } from '../core/state.js';
import { getPathModifiers } from './path.js';
import { getRealmModifier } from './samsara.js';
import { getForm } from './forms.js';
import { hasEffect } from './world-effects.js';

/**
 * How far this body can see right now (design §10: "real" night vision, not a
 * scene tint).
 *
 * The radius is one value used by **two** things: the darkness layer punches a
 * hole of exactly this size around the player (render/lighting.js), and things
 * hidden in the dark are only perceived inside it (game/owl.js). That is what
 * makes a body's eyes a rule rather than an effect.
 *
 * The number is made of what the run has done, not only of the body: fear closes
 * the sight, mindfulness and the factors of the path open it, a bright or a
 * formless plane changes it, and a body with night eyes (the owl) sees further
 * than any other — while the `night-watched` effect of a past life leaves a
 * little light for everyone (systems/world-effects.js).
 */
const BASE = 380;
const FEAR_COST = 160;
const MINDFUL_BONUS = 90;
const NIGHT_VISION_BONUS = 150;
const WATCHED_BONUS = 60;
const MIN_RADIUS = 90;
const MAX_RADIUS = 900;

export const visionConstants = Object.freeze({
  base: BASE,
  fearCost: FEAR_COST,
  mindfulBonus: MINDFUL_BONUS,
  nightVisionBonus: NIGHT_VISION_BONUS,
  watchedBonus: WATCHED_BONUS,
  min: MIN_RADIUS,
  max: MAX_RADIUS,
});

/** Is the night watched by an earlier life? Then everyone sees a little more. */
export function nightWatched() {
  return hasEffect('night-watched');
}

/** Does this body have night eyes of its own? */
export function hasNightVision() {
  return getForm().abilities?.nightVision === true;
}

export function visionRadius(mind = false) {
  const form = getForm();
  const radius = BASE
    - state.fear * FEAR_COST
    + (mind ? MINDFUL_BONUS : 0)
    + getRealmModifier().vision
    + getPathModifiers().vision
    + (form.vision || 0)
    + (form.abilities?.nightVision ? NIGHT_VISION_BONUS : 0)
    + (nightWatched() ? WATCHED_BONUS : 0);
  return Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, radius));
}
