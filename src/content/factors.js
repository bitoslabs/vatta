'use strict';

/**
 * The Noble Eightfold Path (มรรค 8) as *ways of seeing*, not stat boosts.
 *
 * Each factor unlocks from how the run has actually been played (derived from
 * the kamma ledger), and each changes perception rather than power:
 *   effect.vision        + pixels of sight (Right View)
 *   effect.fearRelief    × how quickly the mind settles (several factors)
 *   effect.mindDissolve  × how long mindfulness needs to still a ghost
 */
export const FACTORS = Object.freeze([
  { id: 'ditthi', effect: { vision: 30 }, condition: (m) => m.mindful >= 1 },
  { id: 'sankappa', effect: { fearRelief: 0.15 }, condition: (m) => m.gave >= 1 },
  { id: 'vaca', effect: { fearRelief: 0.1 }, condition: (m) => m.gave >= 1 && m.lied === 0 },
  { id: 'kammanta', effect: { fearRelief: 0.1 }, condition: (m) => m.released >= 1 },
  { id: 'ajiva', effect: { fearRelief: 0.1 }, condition: (m) => m.took === 0 && m.sat >= 1 },
  { id: 'vayama', effect: { mindDissolve: 0.9 }, condition: (m) => m.mindful >= 3 },
  { id: 'sati', effect: { fearRelief: 0.1 }, condition: (m) => m.sat >= 1 },
  { id: 'samadhi', effect: { mindDissolve: 0.8 }, condition: (m) => m.sat >= 2 },
]);

export const factorNameKey = (id) => `path.${id}.name`;
export const factorDescKey = (id) => `path.${id}.desc`;
