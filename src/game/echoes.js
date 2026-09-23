'use strict';

import { MODE } from '../core/constants.js';
import { clamp } from '../core/math.js';
import { state } from '../core/state.js';
import { addFloater } from '../systems/effects.js';
import { t } from '../systems/i18n.js';
import { getKarmaMemory, hasEchoFired, markEchoFired } from '../systems/karma-memory.js';
import { ghost } from '../entities/ghost.js';
import { player } from '../entities/player.js';

/**
 * Kamma as memory: past conduct returns as events on the road.
 *
 * Each echo fires once per run, when the player passes its spot in (or after)
 * its chapter. Wholesome echoes calm the mind; unwholesome ones stir it —
 * the world answering what the player actually did, not a score.
 */
const PROXIMITY = 180;

const ECHOES = [
  { id: 'took', atX: 1520, chapter: 2, color: '#e9c46a', fear: 0.06, when: (m) => m.took > 0 },
  { id: 'harmed', atX: 1900, chapter: 3, color: '#c98a7a', fear: 0.06, enrage: 2, when: (m) => m.harmed > 0 },
  { id: 'clung', atX: 2300, chapter: 4, color: '#b0a0c0', fear: 0.05, when: (m) => m.clung > 0 },
  { id: 'gave', atX: 1900, chapter: 3, color: '#bfd9cd', fear: -0.12, when: (m) => m.gave > 0 },
  { id: 'released', atX: 2560, chapter: 5, color: '#e9d9a8', fear: -0.12, when: (m) => m.released > 0 },
];

export function updateEchoes() {
  if (state.mode !== MODE.WORLD) return;
  const memory = getKarmaMemory();

  for (const echo of ECHOES) {
    if (hasEchoFired(echo.id)) continue;
    if (state.chapter < echo.chapter) continue;
    if (!echo.when(memory)) continue;
    if (Math.abs(player.x - echo.atX) > PROXIMITY) continue;

    markEchoFired(echo.id);
    addFloater(player.x, player.y - 150, t(`echo.${echo.id}`), echo.color, 15);
    if (echo.fear) state.fear = clamp(state.fear + echo.fear, 0, 1);
    if (echo.enrage && ghost.active) ghost.enraged = Math.max(ghost.enraged, echo.enrage);
  }
}
