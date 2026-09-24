'use strict';

import { inShelter } from '../game/rabbit.js';
import { inNestCover } from '../game/elephant.js';
import { inHollowRest } from '../game/tiger.js';

/**
 * Places a past life made safe (docs/animal-lives-story.md "สิ่งที่ส่งต่อ").
 *
 * Three of the world effects do not change what a body can *do*; they change
 * what the forest gives back: a warren whose shelter was shared, a nest kept
 * whole under the log, and a hollow where a fight was not picked. Standing in any
 * of them settles the mind faster than open ground — one rule, one number, so a
 * new resting place is added in one file and felt everywhere at once
 * (see game/world-update.js).
 */
const REST_RELIEF = 0.18;

export { REST_RELIEF };

/** Is this point one of the resting places the world has earned? */
export function isRestful(x, y) {
  return inShelter(x, y) || inNestCover(x, y) || inHollowRest(x, y);
}

/** Which resting place is this, or null? (Used by tests and future hinting.) */
export function restingPlaceAt(x, y) {
  if (inShelter(x, y)) return 'warren';
  if (inNestCover(x, y)) return 'nest';
  if (inHollowRest(x, y)) return 'hollow';
  return null;
}
