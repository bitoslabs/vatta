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
 *              'grove' the gathering place an elephant opens by lifting the log
 *                      — one way for the large, one for the small
 *              'trail' the range a tiger returns to, once it has followed the
 *                      tracks and decided about the rival at the end of them
 *              'enclosure' the refuge a gecko ends in, after climbing the wall
 *                      and opening the gate from the inside for everyone
 *              'echo'  the roost a bat ends in, after finding its pup in a cave
 *                      that only sound maps
 *              'seeds' the cache a squirrel ends at, once it has climbed for
 *                      seeds and decided where they should go
 *              'tide'  the home pool a crab returns to, once it has crossed the
 *                      flooded channel and decided what the water should do
 *              'current' the holt an otter ends at, once it has brought in what
 *                      the river was carrying and decided what to do with it
 *              'bloom' the hive a bee ends at, once it has worked its way along
 *                      the flowers and decided where the pollen should go
 *              'wall'  the warm stone a cat ends on, once it has looked in on the
 *                      homes of the forest without walking into them
 *              'ford'  the far pasture a buffalo ends in, once it has dragged the
 *                      log across the chasm for every body that follows
 *              'damp'  the garden a snail ends in, once it has crossed the dry
 *                      ridge in the ground's own rhythm
 *              'push'  the far hollow a beetle reaches once the seed is seated
 *              'signal' the swarm stone a firefly ends at, once the swarm answers
 *              'web'   the hollow a spider ends in, past the fissure it bridged
 *              'soil'  the wallow a boar ends in, once it has rooted its food out
 *                      of the ground without crushing what lives under it
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
 *              climbing also reaches a canopy, where a squirrel's seeds are
 *              cling   climbs a sheer wall nothing else passes (the gecko)
 *              echo    maps the dark by sound: a pulse shows what eyes cannot
 *                      (the bat), and only what a pulse has shown can be found
 *              tracker reads the trail of another animal (the tiger)
 *              stealth / nightVision are the lab bodies' own tools,
 *              exercised in character-lab.html and reserved for their chapters
 */
export const FORMS = Object.freeze([
  {
    id: 'human',
    width: 23,
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
    width: 34,
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
    width: 34,
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
    width: 42,
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
    width: 34,
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
    width: 29,
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
    width: 32,
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
    width: 46,
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
    width: 25,
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
    width: 30,
    speed: 0.4,
    waterSpeed: 1.35,
    vision: -30,
    waterBound: true,
    canSpeak: false,
    rebirth: true,
    lifeGoal: 'water',
    maps: ['water'],
    // A fish goes through the deepest water there is, at any tide.
    abilities: { flying: false, climbing: false, small: false, swimDeep: true },
  },

  /*
   * The lab roster (docs/animal-lives-story.md, character-lab.html). They share
   * the same ids as src/prototypes/animal-catalog.js, so the main game and the
   * lab draw one body from one source. The earthworm (its burrow, game/burrow.js),
   * the ant (its nest, game/ant.js), the frog (the marsh, game/frog.js), the
   * snake (the crevice, game/snake.js), the rabbit (the field, game/rabbit.js)
   * the owl (the roost, game/owl.js), the elephant (the grove,
   * game/elephant.js), the tiger (the trail, game/tiger.js) and now the reserve
   * roster: the gecko (game/gecko.js), the bat (game/bat.js), the squirrel
   * (game/squirrel.js), the crab (game/crab.js), the otter (game/otter.js), the bee
   * (game/bee.js) and the cat (game/cat.js) are born into the life cycle — the
   * whole reserve table is playable now — and the last animals of the story table
   * arrive as their own systems are built: the buffalo (`wade`, terrain and the
   * ford) and the snail (`needsDamp`, the ground's own dampness).
   */
  {
    id: 'worm',
    width: 52,
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
    width: 40,
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
    width: 36,
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
    width: 57,
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
    width: 37,
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
    width: 72,
    speed: 0.65,
    waterSpeed: 0.7,
    vision: 40,
    waterBound: false,
    canSpeak: false,
    strong: true,
    fearGuard: 1.2,
    rebirth: true,
    lifeGoal: 'grove',
    maps: ['land'],
    abilities: { flying: false, climbing: false, small: false },
  },
  {
    id: 'tiger',
    width: 65,
    speed: 1.15,
    waterSpeed: 0.8,
    vision: 50,
    waterBound: false,
    canSpeak: false,
    fearGuard: 1.25,
    rebirth: true,
    lifeGoal: 'trail',
    maps: ['land'],
    abilities: { flying: false, climbing: false, small: false, stealth: true, tracker: true },
  },
  {
    id: 'snail',
    width: 43,
    speed: 0.45,
    waterSpeed: 0.6,
    vision: -20,
    waterBound: false,
    canSpeak: false,
    fearGain: 0.8,
    rebirth: true,
    lifeGoal: 'damp',
    maps: ['land', 'water'],
    abilities: { flying: false, climbing: false, small: true, needsDamp: true },
  },
  {
    id: 'buffalo',
    width: 66,
    speed: 0.7,
    waterSpeed: 0.85,
    vision: 10,
    waterBound: false,
    canSpeak: false,
    strong: true,
    fearGuard: 1.2,
    rebirth: true,
    lifeGoal: 'ford',
    maps: ['land', 'water'],
    abilities: { flying: false, climbing: false, small: false, wade: true },
  },
  {
    id: 'beetle',
    // measured from the art, as tests/poses.test.mjs insists (drawn 36)
    width: 38,
    speed: 0.85,
    waterSpeed: 0.6,
    vision: 30,
    waterBound: false,
    canSpeak: false,
    fearGain: 1.0,
    rebirth: true,
    lifeGoal: 'push',
    maps: ['land'],
    // Heavy for its size, and it pushes: the one body that can move the big seed.
    abilities: { flying: false, climbing: false, small: true, push: true },
  },
  {
    id: 'firefly',
    width: 24,
    speed: 1.15,
    waterSpeed: 0.9,
    vision: 30,
    waterBound: false,
    canSpeak: false,
    fearGain: 0.9,
    rebirth: true,
    lifeGoal: 'signal',
    maps: ['land', 'air'],
    // It glows: the only body the mist at the swarm field is nothing to.
    abilities: { flying: true, climbing: false, small: true, glow: true },
  },
  {
    id: 'spider',
    width: 46,
    speed: 1.0,
    waterSpeed: 0.7,
    vision: 40,
    waterBound: false,
    canSpeak: false,
    fearGain: 0.9,
    rebirth: true,
    lifeGoal: 'web',
    maps: ['land'],
    // Small and climbing: it walks the threads it spins, and only such bodies can.
    abilities: { flying: false, climbing: true, small: true },
  },
  {
    id: 'boar',
    width: 62,
    speed: 0.95,
    waterSpeed: 0.75,
    vision: 20,
    waterBound: false,
    canSpeak: false,
    strong: true,
    fearGain: 0.95,
    rebirth: true,
    lifeGoal: 'soil',
    maps: ['land', 'water'],
    abilities: { flying: false, climbing: false, small: false },
  },
  {
    id: 'cat',
    width: 49,
    speed: 1.25,
    waterSpeed: 0.7,
    vision: 40,
    waterBound: false,
    canSpeak: false,
    fearGain: 1.15,
    rebirth: true,
    lifeGoal: 'wall',
    maps: ['land'],
    abilities: { flying: false, climbing: true, small: false, cling: true, leap: true },
  },
  {
    id: 'bee',
    width: 37,
    speed: 1.2,
    waterSpeed: 0.8,
    vision: 30,
    waterBound: false,
    canSpeak: false,
    fearGain: 1.15,
    rebirth: true,
    lifeGoal: 'bloom',
    maps: ['land', 'air'],
    abilities: { flying: true, climbing: false, small: true },
  },
  {
    id: 'otter',
    width: 49,
    speed: 1.05,
    waterSpeed: 1.25,
    vision: 20,
    waterBound: false,
    canSpeak: false,
    fearGain: 1.05,
    rebirth: true,
    lifeGoal: 'current',
    maps: ['water', 'land'],
    abilities: { flying: false, climbing: false, small: false, swimDeep: true },
  },
  {
    id: 'crab',
    width: 50,
    speed: 0.9,
    waterSpeed: 1.15,
    vision: -10,
    waterBound: false,
    canSpeak: false,
    fearGain: 1.05,
    rebirth: true,
    lifeGoal: 'tide',
    maps: ['water', 'land'],
    abilities: { flying: false, climbing: false, small: true, swimDeep: true },
  },
  {
    id: 'squirrel',
    width: 28,
    speed: 1.15,
    waterSpeed: 0.7,
    vision: 30,
    waterBound: false,
    canSpeak: false,
    fearGain: 1.15,
    rebirth: true,
    lifeGoal: 'seeds',
    maps: ['land'],
    abilities: { flying: false, climbing: true, small: false },
  },
  {
    id: 'bat',
    width: 63,
    speed: 1,
    waterSpeed: 0.8,
    vision: -70,
    waterBound: false,
    canSpeak: false,
    fearGain: 1.05,
    rebirth: true,
    lifeGoal: 'echo',
    maps: ['land', 'air'],
    abilities: { flying: true, climbing: false, small: false, echo: true },
  },
  {
    id: 'gecko',
    width: 43,
    speed: 0.9,
    waterSpeed: 0.7,
    vision: 10,
    waterBound: false,
    canSpeak: false,
    fearGain: 1.1,
    rebirth: true,
    lifeGoal: 'enclosure',
    maps: ['land'],
    abilities: { flying: false, climbing: true, small: false, cling: true },
  },
  {
    id: 'owl',
    width: 23,
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
