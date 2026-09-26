'use strict';

import { MODE } from '../core/constants.js';
import { dist } from '../core/math.js';
import { state } from '../core/state.js';
import { playChime } from '../systems/audio.js';
import { addFloater } from '../systems/effects.js';
import { t } from '../systems/i18n.js';
import { getForm } from '../systems/forms.js';
import { recordKarma } from '../systems/karma.js';
import { saveRun } from '../systems/save.js';
import { animatePlayer, player } from '../entities/player.js';

/**
 * The world remembers (design §3, §12 step 4).
 *
 * A bridge built in a human life is still there in the next one — and its
 * care is now the river's problem: silted debris blocks the waterway until a
 * fish clears it. One act of help carries across lives, and asks for upkeep.
 */
const BRIDGE = Object.freeze({ x: 1620, y: 1930, r: 120 });
const DEBRIS = Object.freeze({ x: 1620, y: 1930, r: 95 });
const DEBRIS_REACH = 140;

export function bridgeSite() {
  return BRIDGE;
}

export function hasBridge() {
  return state.world.bridge === true;
}

export function isWaterwayCleared() {
  return state.world.cleared === true;
}

/** Debris blocks a fish until it is cleared. */
export function debrisBlocked(x, y) {
  return hasBridge() && !isWaterwayCleared() && dist(x, y, DEBRIS.x, DEBRIS.y) < DEBRIS.r;
}

export function updateWorldMemory() {
  if (state.mode !== MODE.WORLD) return;
  if (state.dialogueOpen || state.choiceOpen) return;
  if (state.interact) return; // chapters and the guardian take priority

  const form = getForm().id;

  if (!hasBridge() && form === 'human' && dist(player.x, player.y, BRIDGE.x, BRIDGE.y) < BRIDGE.r) {
    state.interact = { fn: buildBridge, labelKey: 'prompt.buildBridge' };
    return;
  }

  if (hasBridge() && !isWaterwayCleared() && form === 'fish'
    && dist(player.x, player.y, DEBRIS.x, DEBRIS.y) < DEBRIS_REACH) {
    state.interact = { fn: clearDebris, labelKey: 'prompt.clearDebris' };
  }
}

function buildBridge() {
  state.world.bridge = true;
  animatePlayer();
  recordKarma('give');
  saveRun();
  playChime();
  addFloater(player.x, player.y - 130, t('memory.bridgeBuilt'), '#bfd9cd', 15);
}

function clearDebris() {
  state.world.cleared = true;
  animatePlayer();
  recordKarma('give');
  saveRun();
  playChime();
  addFloater(player.x, player.y - 130, t('memory.debrisCleared'), '#bfd9cd', 15);
}
