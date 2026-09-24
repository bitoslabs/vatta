'use strict';

/**
 * Playable forms (ร่าง) for the multi-life prototype.
 *
 * Per the design: a form is a *set of tools*, not a rank. Each changes how the
 * same forest is traversed. All eight forms from docs/dynamic-samsara-design.md
 * §5 are listed here; the slice currently playable in the life cycle is chosen
 * by `systems/forms.js#nextFormId`.
 *
 * speed      × movement on land
 * waterSpeed × movement in the river band
 * waterBound may not leave the water at all
 * vision     ± pixels of sight
 * fearGain   × how fast fear builds (fragile forms fear sooner)
 * fearGuard  × how firmly the mind holds (turtle)
 * scent      reveals the glowing footprints strongly
 * strong     lifts boulders out of the way, opening the road for later lives
 * (for the beings of §6: อสุร uses strong, เทวดา walks over thickets)
 * canSpeak   flavour only for now: animals would use gestures for dialogue
 * abilities  fed to the route checker and to collision:
 *              flying  ignores ground solids (trees, thickets, boulders)
 *              climbing passes thickets, but not boulders
 *              small   slips through boulders, but not thickets
 */
export const FORMS = Object.freeze([
  {
    id: 'human',
    speed: 1,
    waterSpeed: 0.85,
    vision: 0,
    waterBound: false,
    canSpeak: true,
    abilities: { flying: false, climbing: false, small: false },
  },
  {
    id: 'deer',
    speed: 1.18,
    waterSpeed: 0.6,
    vision: 60,
    waterBound: false,
    canSpeak: false,
    abilities: { flying: false, climbing: false, small: false },
  },
  {
    id: 'dog',
    speed: 1.05,
    waterSpeed: 0.8,
    vision: 30,
    waterBound: false,
    canSpeak: false,
    scent: true,
    abilities: { flying: false, climbing: false, small: false },
  },
  {
    id: 'crane',
    speed: 1.12,
    waterSpeed: 1.05,
    vision: 90,
    waterBound: false,
    canSpeak: false,
    abilities: { flying: true, climbing: false, small: false },
  },
  {
    id: 'turtle',
    speed: 0.7,
    waterSpeed: 1,
    vision: -10,
    waterBound: false,
    canSpeak: false,
    fearGain: 0.6,
    fearGuard: 1.2,
    abilities: { flying: false, climbing: false, small: false },
  },
  {
    id: 'monkey',
    speed: 1.05,
    waterSpeed: 0.85,
    vision: 20,
    waterBound: false,
    canSpeak: false,
    abilities: { flying: false, climbing: true, small: false },
  },
  {
    id: 'butterfly',
    speed: 1.25,
    waterSpeed: 0.8,
    vision: -40,
    waterBound: false,
    canSpeak: false,
    fearGain: 1.3,
    abilities: { flying: false, climbing: false, small: true },
  },
  {
    id: 'asura',
    speed: 0.85,
    waterSpeed: 0.7,
    vision: -20,
    waterBound: false,
    canSpeak: true,
    strong: true,
    fearGain: 0.85,
    fearGuard: 1.3,
    abilities: { flying: false, climbing: false, small: false },
  },
  {
    id: 'deva',
    speed: 1.22,
    waterSpeed: 1.1,
    vision: 80,
    waterBound: false,
    canSpeak: true,
    fearGain: 0.7,
    fearGuard: 1.15,
    abilities: { flying: false, climbing: true, small: false },
  },
  {
    id: 'fish',
    speed: 0.4,
    waterSpeed: 1.35,
    vision: -30,
    waterBound: true,
    canSpeak: false,
    abilities: { flying: false, climbing: false, small: false },
  },
]);

export const formNameKey = (id) => `form.${id}.name`;
export const formAbilityKey = (id) => `form.${id}.ability`;
