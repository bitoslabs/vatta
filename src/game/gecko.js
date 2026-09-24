'use strict';

import { MODE } from '../core/constants.js';
import { dist } from '../core/math.js';
import { state } from '../core/state.js';
import { playChime } from '../systems/audio.js';
import { addFloater } from '../systems/effects.js';
import { getForm } from '../systems/forms.js';
import { t } from '../systems/i18n.js';
import { recordKarma } from '../systems/karma.js';
import { hasEffect, recordEffect } from '../systems/world-effects.js';
import { dynamicFeatures, removeFeature } from '../systems/worldgen.js';
import { ENCLOSURE } from '../world/world-data.js';
import { animatePlayer, player } from '../entities/player.js';

/**
 * The gecko's life: the walled enclosure and the gate that opens from inside
 * (docs/animal-lives-story.md reserve table, "มองปัญหาจากมุมใหม่").
 *
 * The wall cannot be walked over — but it can be climbed by a body that clings,
 * and *inside* is where the gate's bar can be lifted. So this life does not open
 * a way for itself (the gecko is already through); it opens a way for everyone
 * who cannot climb at all. `gate-opened` is that act, and it never shuts again.
 */
export function enclosureSite() {
  return ENCLOSURE;
}

export function gateOpened() {
  return hasEffect('gate-opened');
}

export function isOpened() {
  return state.gecko?.opened === true;
}

/** Every life arrives at a gate that is still barred. */
export function resetGecko() {
  state.gecko = { opened: false };
}

/** The gate in the ring, wherever it was built this seed. */
export function gateFeature() {
  return dynamicFeatures().find((feature) => feature.gate === true) || null;
}

/** Is the body properly inside the wall (not merely touching it)? */
export function isInside(x = player.x, y = player.y) {
  return dist(x, y, ENCLOSURE.center.x, ENCLOSURE.center.y) < ENCLOSURE.ring - ENCLOSURE.wallRadius;
}

/**
 * Where a gecko's life goes next: the gate (a guide — and the one thing this
 * life is for), then the refuge it opened.
 */
export function geckoGoal() {
  if (!isOpened()) {
    return { x: ENCLOSURE.center.x, y: ENCLOSURE.center.y + ENCLOSURE.ring - 10, r: ENCLOSURE.refugeRadius, kind: 'gate' };
  }
  return { x: ENCLOSURE.center.x, y: ENCLOSURE.center.y, r: ENCLOSURE.refugeRadius, kind: 'enclosure' };
}

/** The bar of the gate: offered only from the inside. */
export function updateGecko() {
  if (state.mode !== MODE.WORLD) return;
  if (state.dialogueOpen || state.choiceOpen || state.interact) return;
  if (getForm().lifeGoal !== 'enclosure') return;
  if (isOpened()) return;
  const gate = gateFeature();
  if (!gate) return;
  if (!isInside()) return;
  if (dist(player.x, player.y, gate.x, gate.y) > 140) return;
  state.interact = { fn: openGate, labelKey: 'prompt.openGate' };
}

/**
 * Lift the bar. The gate leaves the world for good, and the way it opens is not
 * for the gecko — it is for every body that cannot climb.
 */
export function openGate() {
  if (isOpened()) return false;
  const gate = gateFeature();
  if (!gate) return false;
  state.gecko.opened = true;
  removeFeature(gate.i);
  recordEffect('gate-opened');
  recordKarma('give');
  animatePlayer();
  playChime();
  addFloater(gate.x, gate.y - 70, t('gecko.answer.open'), '#b9c9a8', 15);
  return true;
}

/** A refuge once the gate is open: the inside is rest for every body now. */
export function inEnclosureRefuge(x, y) {
  if (!gateOpened()) return false;
  return dist(x, y, ENCLOSURE.center.x, ENCLOSURE.center.y) < ENCLOSURE.refugeRadius + 40;
}

/** Settled inside the way it opened: the life closes. */
export function settleRefuge() {
  animatePlayer();
  playChime();
  addFloater(ENCLOSURE.center.x, ENCLOSURE.center.y - 80, t('gecko.refuge'), '#b9c9a8', 15);
  return gateOpened();
}
