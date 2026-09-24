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
  /** Classroom mode: no spirits, free-roam commentary. */
  teacher: false,
  /** Projector mode: larger type and labels for a classroom screen. */
  projector: false,
  /** Player-chosen name for the current run (shown in slots and the recap). */
  runName: '',
  /** Multi-life prototype: which life we are on, and in which form. */
  lifeMode: false,
  lifeId: 1,
  formId: 'human',
  formHistory: [],
  /** Chosen log of past lives, read by the mirror courtyard. */
  lifeLog: [],
  /** Set when the main journey is finished; unlocks the exploration mode. */
  journeyComplete: false,
  /** Things the world remembers across lives (design §3, §12 step 4). */
  world: { bridge: false, cleared: false, removed: [], crushed: [], snags: [], planks: [], effects: {} },

  /** The tide (systems/tide.js): a world rhythm, not a run's business. */
  tide: { phase: 0.25 },

  /** How damp the ground is (systems/moisture.js): the world's other slow rhythm. */
  moisture: { phase: 0.5 },
  /** The assembled world for this life/chapter (see systems/worldgen.js). */
  dynamic: { seed: 0, features: [], validation: null, attempts: 0 },
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
    reps: 0,
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
