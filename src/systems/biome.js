'use strict';

import { BIOMES } from '../content/biomes.js';
import { state } from '../core/state.js';
import { getForm } from './forms.js';
import { getKarma } from './karma.js';
import { realmById } from '../content/realms.js';

const DEFAULT_BIOME = 'memory-forest';

/**
 * Which map-skin this life is walking in (design §7).
 *
 * Bodies first (an asura life is the asura city; a deva life is the light
 * garden), then the plane you were born into, then your strongest tendency,
 * and otherwise the memory forest.
 */
export function currentBiomeId() {
  const form = getForm().id;
  if (form === 'asura') return 'asura-city';
  if (form === 'deva') return 'light-garden';
  // Tunnelers walk the soil under the great root (docs/animal-lives-story.md ch.2).
  if (getForm().abilities?.burrow === true) return 'under-root';

  const realm = realmById(state.realmId);
  if (realm) {
    // The asura realm has a city of its own (design §7): it is the one apāya plane
    // that is not the woeful one.
    if (realm.id === 'asurakaya') return 'asura-city';
    if (realm.group === 'apaya') return 'woeful';
    if (realm.group === 'arupa') return 'formless';
    if (realm.group === 'rupa') return 'light-garden';
  }

  const tendencies = getKarma().tendencies;
  const greed = Math.max(0, tendencies.greed || 0);
  if (greed >= 6 && greed > Math.max(0, tendencies.anger || 0, tendencies.delusion || 0, tendencies.clinging || 0)) {
    return 'craving-market';
  }

  return DEFAULT_BIOME;
}

export function currentBiome() {
  return BIOMES[currentBiomeId()] || BIOMES[DEFAULT_BIOME];
}
