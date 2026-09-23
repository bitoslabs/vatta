'use strict';

import { MODE } from './constants.js';

/**
 * Single source of truth for cross-scene mutable state.
 * Scene-local state (dialogue cursor, meditation ring, ...) stays in its own module.
 */
export const state = {
  mode: MODE.TITLE,
  /** Active chapter id (see game/chapters.js). */
  chapter: 1,
  /** Realm the player is currently born into (see content/realms.js). */
  realmId: 'manussa',
  /** Whether treasure lures are currently placed/visible in the world. */
  luresVisible: false,
  /** Set on the final chapter when the run leaves the cycle (nibbāna). */
  liberated: false,
  /** Locale key for the HUD meter label and the mindfulness hints. */
  meterKey: 'hud.fear',
  mindHintKey: 'hud.mind',
  /** Respawn point used when fear swallows the player. */
  checkpoint: { x: 1120, y: 1560 },
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
    retaliations: 0,
    looted: 0,
    clung: 0,
    selfish: 0,
  },
};

/** Reset the chapter-1 story flags (called when a chapter loads). */
export function resetStoryFlags() {
  Object.assign(state.story, {
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
  });
}
