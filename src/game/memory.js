'use strict';

import { MODE } from '../core/constants.js';
import { rng } from '../core/rng.js';
import { state } from '../core/state.js';
import { tList } from '../systems/i18n.js';
import { $ } from '../ui/dom.js';
import { choose } from '../ui/choices.js';
import { say } from '../ui/dialogue.js';
import { startRelease } from './release.js';

/** Memory scene state. */
export const mem = {
  phase: 'cool',
  t: 0,
  warm: 0,
  particles: [],
};

export function startMemory() {
  state.mode = MODE.MEMORY;
  mem.phase = 'cool';
  mem.t = 0;
  mem.warm = 0;
  mem.particles = Array.from({ length: 26 }, () => ({
    x: rng(),
    y: rng(),
    v: 0.02 + rng() * 0.05,
    s: rng(),
  }));
  $('#memOverlay').classList.remove('hidden');
  say('memory1', askQuestion);
}

/**
 * The world answers choices instead of grading them:
 * 0 — clinging (cold), 1 — letting go (warm), 2 — honest not-knowing (cool).
 */
function askQuestion() {
  const options = tList('memory.question').map((text) => ({ t: text }));
  choose(options, (index) => {
    if (index === 0) {
      mem.phase = 'cold';
      say('memoryCold', askQuestion);
    } else if (index === 2) {
      mem.phase = 'cool';
      say('memoryCool', askQuestion);
    } else {
      mem.phase = 'warm';
      say('memoryWarm', () => {
        $('#memOverlay').classList.add('hidden');
        startRelease();
      });
    }
  });
}
