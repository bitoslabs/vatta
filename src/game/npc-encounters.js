'use strict';

import { MODE } from '../core/constants.js';
import { dist } from '../core/math.js';
import { state } from '../core/state.js';
import { ENCOUNTERS } from '../content/encounters.js';
import { addFloater } from '../systems/effects.js';
import { t } from '../systems/i18n.js';
import { recordKarma } from '../systems/karma.js';
import { currentBiomeId } from '../systems/biome.js';
import { anchoredPoint } from '../world/world-data.js';

/**
 * Beings that stand at a place of their own plane (design §7's signature sites)
 * keep their coordinates; the rest belong to the road and are carried onto
 * whichever road this life walks (world-data.js#anchoredPoint).
 */
const SITE_BEINGS = new Set(['asura-bridge', 'garden-bloom', 'market-stall', 'river-weir']);
import { animatePlayer, player } from '../entities/player.js';
import { choose } from '../ui/choices.js';

/** Only the beings whose plane this is, standing beside this plane's road. */
export function encountersHere() {
  const biome = currentBiomeId();
  return ENCOUNTERS
    .filter((encounter) => !encounter.biome || encounter.biome === biome)
    .map((encounter) => {
      if (SITE_BEINGS.has(encounter.id)) return encounter;
      const spot = anchoredPoint(biome, encounter.x, encounter.y);
      return { ...encounter, x: spot.x, y: spot.y };
    });
}

/** The encounter the walker is standing beside, or null. */
export function encounterAt(x, y) {
  let best = null;
  let bestDist = Infinity;
  for (const encounter of encountersHere()) {
    const d = dist(x, y, encounter.x, encounter.y);
    if (d < encounter.r && d < bestDist) {
      bestDist = d;
      best = encounter;
    }
  }
  return best;
}

export function updateEncounters() {
  if (state.mode !== MODE.WORLD) return;
  if (state.dialogueOpen || state.choiceOpen) return;
  if (state.interact) return; // chapters, the guardian and the bridge come first

  const encounter = encounterAt(player.x, player.y);
  if (!encounter) return;
  state.interact = { fn: () => talk(encounter), labelKey: encounter.promptKey };
}

function talk(encounter) {
  const options = encounter.choices.map((choice) => ({ t: t(choice.key) }));
  choose(options, (index) => {
    const choice = encounter.choices[index];
    if (!choice) return;
    animatePlayer();
    recordKarma(choice.karma);
    addFloater(player.x, player.y - 130, t(choice.answer), choice.color || '#bfd9cd', 15);
  });
}
