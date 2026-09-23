'use strict';

import { MODE } from '../core/constants.js';
import { dist } from '../core/math.js';
import { state } from '../core/state.js';
import { pickGreeting } from '../systems/greetings.js';
import { player } from '../entities/player.js';
import { say } from '../ui/dialogue.js';

/** A still figure on the road: the Dharma guardian (ธรรมบาล). */
export const GUARDIAN = Object.freeze({ x: 2560, y: 1240, r: 95 });

/**
 * Offer the guardian's conversation, but never override a chapter's own
 * interaction (loot, retaliation, embrace, ...).
 */
export function updateGuardian() {
  if (state.mode !== MODE.WORLD) return;
  if (state.dialogueOpen || state.choiceOpen) return;
  if (state.interact) return;
  if (dist(player.x, player.y, GUARDIAN.x, GUARDIAN.y) >= GUARDIAN.r) return;

  state.interact = { fn: talkToGuardian, labelKey: 'prompt.talkGuardian' };
}

function talkToGuardian() {
  say(pickGreeting());
}
