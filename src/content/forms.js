'use strict';

/**
 * Playable forms (ร่าง) for the multi-life prototype.
 *
 * Per the design: a form is a *set of tools*, not a rank. Each changes how the
 * same forest is traversed. Only three are implemented for the first slice —
 * human, deer, fish — chosen per docs/dynamic-samsara-design.md §12.
 *
 * speed      × movement on land
 * waterSpeed × movement in the river band
 * waterBound fish may not leave the river at all
 * vision     ± pixels of sight (deer hear far; fish see poorly on land)
 * canSpeak   flavour only for now: animals would use gestures for dialogue
 * abilities  fed to the route checker: a flying form ignores ground solids
 */
export const FORMS = Object.freeze([
  {
    id: 'human',
    speed: 1,
    waterSpeed: 0.85,
    vision: 0,
    waterBound: false,
    canSpeak: true,
    abilities: { flying: false, climbing: false },
  },
  {
    id: 'deer',
    speed: 1.18,
    waterSpeed: 0.6,
    vision: 60,
    waterBound: false,
    canSpeak: false,
    abilities: { flying: false, climbing: false },
  },
  {
    id: 'fish',
    speed: 0.4,
    waterSpeed: 1.35,
    vision: -30,
    waterBound: true,
    canSpeak: false,
    abilities: { flying: false, climbing: false },
  },
]);

export const formNameKey = (id) => `form.${id}.name`;
export const formAbilityKey = (id) => `form.${id}.ability`;
