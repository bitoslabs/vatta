'use strict';

import { getKarmaMemory } from './karma-memory.js';
import { unlockedCount } from './path.js';

/**
 * The guardian's greeting is chosen from what the run has actually done —
 * heaviest conduct first, so the world answers truthfully rather than kindly.
 * Returns a dialogue key.
 */
export function pickGreeting() {
  const memory = getKarmaMemory();

  if (unlockedCount() >= 8) return 'greet.full';
  // A single misdeed is named specifically; an accumulated weight is named as such.
  if (memory.demerit > memory.merit + 24) return 'greet.heavy';
  if (memory.harmed > 0) return 'greet.harmed';
  if (memory.took > 0) return 'greet.took';
  if (memory.clung > 0) return 'greet.clung';
  if (memory.gave > 0 && memory.released > 0) return 'greet.practice';
  if (memory.gave > 0) return 'greet.gave';
  if (memory.released > 0) return 'greet.released';
  return 'greet.empty';
}
