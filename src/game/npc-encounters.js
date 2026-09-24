'use strict';

import { MODE } from '../core/constants.js';
import { dist } from '../core/math.js';
import { state } from '../core/state.js';
import { ENCOUNTERS } from '../content/encounters.js';
import { addFloater } from '../systems/effects.js';
import { t } from '../systems/i18n.js';
import { recordKarma } from '../systems/karma.js';
import { player } from '../entities/player.js';
import { choose } from '../ui/choices.js';

/** The encounter the walker is standing beside, or null. */
export function encounterAt(x, y) {
  let best = null;
  let bestDist = Infinity;
  for (const encounter of ENCOUNTERS) {
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
    recordKarma(choice.karma);
    addFloater(player.x, player.y - 130, t(choice.answer), choice.color || '#bfd9cd', 15);
  });
}
