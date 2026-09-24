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
 * rebirth    whether the life cycle may be born into this body at all
 * lifeGoal   how this body's life ends (systems/goals.js):
 *              'land'  the temple, through the chapter's own story (default)
 *              'water' the river pool nearest home (a fish cannot walk out)
 *              'seed'  the seed chamber under the great root (a tunnelling body)
 *              'nest'  the ant's own nest, after carrying a seed home
 *              'spawn' the marsh bank a frog lays its eggs on, once it has
 *                      decided what to do about the blocked channel
 *              'crevice' the linked outflow a snake leaves by, once it has
 *                      decided what to do about the slot in the stone
 *              'storm' the open field a rabbit finishes in, once the warrens
 *                      are joined and it has decided about the storm shelter
 *              'watch' the roost an owl settles in, once the lost are home and
 *                      it has decided whether to keep the night watch
 * maps       the maps that can carry this body (see systems/life-route.js):
 *              'land' the forest road · 'water' the river · 'burrow' the soil
 *              under the great root · 'air' anywhere above the ground
 * abilities  fed to the route checker and to collision:
 *              flying  ignores ground solids (trees, thickets, boulders)
 *              climbing passes thickets, but not boulders
 *              small   slips through boulders, but not thickets
 *              burrow  tunnels through soft soil (`burrow`), but not hard root
 *              leap    crosses deep mire, but not a slot in stone
 *              slither flattens through a crevice, but not through soil
 *              stealth / nightVision are the lab bodies' own tools,
 *              exercised in character-lab.html and reserved for their chapters
 */
export const FORMS = Object.freeze([
  {
    id: 'human',
    speed: 1,
    waterSpeed: 0.85,
    vision: 0,
    waterBound: false,
    canSpeak: true,
    rebirth: true,
    maps: ['land', 'water'],
    abilities: { flying: false, climbing: false, small: false },
  },
  {
    id: 'deer',
    speed: 1.18,
    waterSpeed: 0.6,
    vision: 60,
    waterBound: false,
    canSpeak: false,
    rebirth: true,
    maps: ['land'],
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
    rebirth: true,
    maps: ['land'],
    abilities: { flying: false, climbing: false, small: false },
  },
  {
    id: 'crane',
    speed: 1.12,
    waterSpeed: 1.05,
    vision: 90,
    waterBound: false,
    canSpeak: false,
    rebirth: true,
    maps: ['land', 'water', 'air'],
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
    rebirth: true,
    maps: ['land', 'water'],
    abilities: { flying: false, climbing: false, small: false },
  },
  {
    id: 'monkey',
    speed: 1.05,
    waterSpeed: 0.85,
    vision: 20,
    waterBound: false,
    canSpeak: false,
    rebirth: true,
    maps: ['land'],
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
    rebirth: true,
    maps: ['land', 'air'],
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
    rebirth: true,
    maps: ['land'],
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
    rebirth: true,
    maps: ['land', 'air'],
    abilities: { flying: false, climbing: true, small: false },
  },
  {
    id: 'fish',
    speed: 0.4,
    waterSpeed: 1.35,
    vision: -30,
    waterBound: true,
    canSpeak: false,
    rebirth: true,
    lifeGoal: 'water',
    maps: ['water'],
    abilities: { flying: false, climbing: false, small: false },
  },

  /*
   * The lab roster (docs/animal-lives-story.md, character-lab.html). They share
   * the same ids as src/prototypes/animal-catalog.js, so the main game and the
   * lab draw one body from one source. The earthworm (its burrow, game/burrow.js),
   * the ant (its nest, game/ant.js), the frog (the marsh, game/frog.js), the
   * snake (the crevice, game/snake.js), the rabbit (the field, game/rabbit.js)
   * and the owl (the roost, game/owl.js) are born into the life cycle so far;
   * the elephant and the tiger still stay `rebirth: false` until a chapter
   * carries their body — the design's rule that no one is reborn somewhere their
   * map cannot take them.
   */
  {
    id: 'worm',
    speed: 0.45,
    waterSpeed: 0.5,
    vision: -35,
    waterBound: false,
    canSpeak: false,
    fearGain: 1.2,
    rebirth: true,
    lifeGoal: 'seed',
    maps: ['burrow'],
    abilities: { flying: false, climbing: false, small: false, burrow: true },
  },
  {
    id: 'ant',
    speed: 0.85,
    waterSpeed: 0.6,
    vision: 10,
    waterBound: false,
    canSpeak: false,
    rebirth: true,
    lifeGoal: 'nest',
    maps: ['burrow', 'land'],
    abilities: { flying: false, climbing: true, small: true, burrow: true },
  },
  {
    id: 'frog',
    speed: 0.7,
    waterSpeed: 1.1,
    vision: 20,
    waterBound: false,
    canSpeak: false,
    rebirth: true,
    lifeGoal: 'spawn',
    maps: ['water', 'land'],
    abilities: { flying: false, climbing: false, small: false, leap: true },
  },
  {
    id: 'snake',
    speed: 0.85,
    waterSpeed: 0.8,
    vision: 0,
    waterBound: false,
    canSpeak: false,
    rebirth: true,
    lifeGoal: 'crevice',
    maps: ['land', 'burrow'],
    abilities: { flying: false, climbing: false, small: true, slither: true },
  },
  {
    id: 'rabbit',
    speed: 1.15,
    waterSpeed: 0.7,
    vision: 30,
    waterBound: false,
    canSpeak: false,
    fearGain: 1.15,
    rebirth: true,
    lifeGoal: 'storm',
    maps: ['land'],
    abilities: { flying: false, climbing: false, small: false, leap: true },
  },
  {
    id: 'elephant',
    speed: 0.65,
    waterSpeed: 0.7,
    vision: 40,
    waterBound: false,
    canSpeak: false,
    strong: true,
    fearGuard: 1.2,
    rebirth: false,
    maps: ['land'],
    abilities: { flying: false, climbing: false, small: false },
  },
  {
    id: 'tiger',
    speed: 1.15,
    waterSpeed: 0.8,
    vision: 50,
    waterBound: false,
    canSpeak: false,
    fearGuard: 1.25,
    rebirth: false,
    maps: ['land'],
    abilities: { flying: false, climbing: false, small: false, stealth: true },
  },
  {
    id: 'owl',
    speed: 1,
    waterSpeed: 0.9,
    vision: 120,
    waterBound: false,
    canSpeak: false,
    rebirth: true,
    lifeGoal: 'watch',
    maps: ['land', 'air'],
    abilities: { flying: true, climbing: false, small: false, nightVision: true },
  },
]);

/** May the life cycle be born into this body at all? */
export function isRebirthForm(form) {
  return Boolean(form) && form.rebirth === true;
}

/** The maps this body can be given without stranding it. */
export function mapsFor(formId) {
  const form = FORMS.find((entry) => entry.id === formId);
  return (form && form.maps) || [];
}

export const formNameKey = (id) => `form.${id}.name`;
export const formAbilityKey = (id) => `form.${id}.ability`;
