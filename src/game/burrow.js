'use strict';

import { playChime } from '../systems/audio.js';
import { addFloater } from '../systems/effects.js';
import { t } from '../systems/i18n.js';
import { recordKarma } from '../systems/karma.js';
import { hasEffect, recordEffect } from '../systems/world-effects.js';
import { BURROW } from '../world/world-data.js';

/**
 * The earthworm's life under the great root (docs/animal-lives-story.md ch.2).
 *
 * The map itself lives in world/rooms.js (`assembleBurrow`) where it can be
 * proven walkable — or, for a walking body, provably *not* walkable. Here sits
 * the consequence: reaching the seed inside records the `root-watered` effect,
 * which every later life then inherits (systems/worldgen.js#worldAbilities).
 */
export function burrowSite() {
  return BURROW;
}

export function rootWatered() {
  return hasEffect('root-watered');
}

/** Reaching the seed waters the root. Returns true when this life did it. */
export function waterRoot() {
  const first = recordEffect('root-watered');
  if (!first) return false;
  recordKarma('give');
  playChime();
  addFloater(BURROW.chamber.x, BURROW.chamber.y - 70, t('effect.rootWatered'), '#bfd9cd', 15);
  return true;
}
