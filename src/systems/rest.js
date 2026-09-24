'use strict';

import { inShelter } from '../game/rabbit.js';
import { inNestCover } from '../game/elephant.js';
import { inHollowRest } from '../game/tiger.js';
import { inEnclosureRefuge } from '../game/gecko.js';
import { inSaplingShade } from '../game/squirrel.js';

/**
 * Places a past life made safe (docs/animal-lives-story.md "สิ่งที่ส่งต่อ").
 *
 * Five of the world effects change what the forest gives back rather than what a
 * body can do: a warren whose shelter was shared, a nest kept whole under the
 * log, a hollow where a fight was not picked, an enclosure whose gate was opened
 * from the inside, and saplings grown from scattered seeds. Standing in any of them settles the mind faster than
 * open ground — one rule, one number, so a new resting place is added in one file
 * and felt everywhere at once (see game/world-update.js).
 */
const REST_RELIEF = 0.18;

export { REST_RELIEF };

/** Is this point one of the resting places the world has earned? */
export function isRestful(x, y) {
  return inShelter(x, y)
    || inNestCover(x, y)
    || inHollowRest(x, y)
    || inEnclosureRefuge(x, y)
    || inSaplingShade(x, y);
}

/** Which resting place is this, or null? (Used by tests and future hinting.) */
export function restingPlaceAt(x, y) {
  if (inShelter(x, y)) return 'warren';
  if (inNestCover(x, y)) return 'nest';
  if (inHollowRest(x, y)) return 'hollow';
  if (inEnclosureRefuge(x, y)) return 'enclosure';
  if (inSaplingShade(x, y)) return 'sapling';
  return null;
}
