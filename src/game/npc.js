'use strict';

import { MODE } from '../core/constants.js';
import { dist } from '../core/math.js';
import { state } from '../core/state.js';
import { pickGreeting } from '../systems/greetings.js';
import { player } from '../entities/player.js';
import { say } from '../ui/dialogue.js';
import { anchoredPoint } from '../world/world-data.js';
import { currentMapId } from '../systems/biome.js';

/** A still figure on the road: the Dharma guardian (ธรรมบาล). */
export const GUARDIAN = Object.freeze({ x: 2560, y: 1240, r: 95 });

/**
 * The guardian stands on the road, so it stands on *this* life's road: in the
 * forest that is the same spot it always was, and in another plane it is carried
 * to the nearest place on that plane's road (world-data.js#anchoredPoint).
 */
export function guardianSpot() {
  return { ...anchoredPoint(currentMapId(), GUARDIAN.x, GUARDIAN.y), r: GUARDIAN.r };
}

/**
 * Offer the guardian's conversation, but never override a chapter's own
 * interaction (loot, retaliation, embrace, ...).
 */
export function updateGuardian() {
  if (state.mode !== MODE.WORLD) return;
  if (state.dialogueOpen || state.choiceOpen) return;
  if (state.interact) return;
  const spot = guardianSpot();
  if (dist(player.x, player.y, spot.x, spot.y) >= spot.r) return;

  state.interact = { fn: talkToGuardian, labelKey: 'prompt.talkGuardian' };
}

function talkToGuardian() {
  say(pickGreeting());
}
