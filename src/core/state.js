'use strict';

import { MODE } from './constants.js';

/**
 * Single source of truth for cross-scene mutable state.
 * Scene-local state (dialogue cursor, meditation ring, ...) stays in its own module.
 */
export const state = {
  mode: MODE.TITLE,
  fear: 0,
  dialogueOpen: false,
  choiceOpen: false,
  /** Current interaction prompt, or null. Shape: { labelKey, fn }. */
  interact: null,
  story: {
    talked: false,
    left: false,
    call: false,
    salaReached: false,
    meditated: false,
    released: false,
    releaseDone: false,
    ended: false,
    hintLoop: false,
    hintSati: false,
  },
  stats: {
    caught: 0,
    lost: 0,
    time: 0,
  },
};
