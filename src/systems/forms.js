'use strict';

import { FORMS } from '../content/forms.js';
import { emit, EVENTS } from '../core/events.js';
import { distToPoly } from '../core/math.js';
import { state } from '../core/state.js';
import { RIVER, RIVER_WIDTH } from '../world/world-data.js';
import { dynamicWaterAt } from './worldgen.js';

/** The form the player currently wears. */
export function getForm() {
  return FORMS.find((form) => form.id === state.formId) || FORMS[0];
}

export function setForm(id) {
  const next = FORMS.find((form) => form.id === id);
  if (!next) return false;
  state.formId = next.id;
  emit(EVENTS.FORM_CHANGED, next.id);
  return true;
}

/** Is this point water — the river band, or a pond placed by the world seed? */
export function inWater(x, y) {
  return distToPoly(RIVER, x, y) < RIVER_WIDTH || dynamicWaterAt(x, y);
}

/** Movement multiplier for the current form at this point. */
export function speedMultiplier(x, y) {
  const form = getForm();
  return inWater(x, y) ? form.waterSpeed : form.speed;
}

export function isWaterBound() {
  return getForm().waterBound === true;
}

export function formVision() {
  return getForm().vision || 0;
}

/**
 * The next form for a rebirth: rotate through the forms, avoiding the two most
 * recent ones so consecutive lives feel different (design §4 step 3).
 */
export function nextFormId() {
  const ids = FORMS.map((form) => form.id);
  const recent = state.formHistory.slice(-2);
  const fresh = ids.filter((id) => !recent.includes(id));
  const pool = fresh.length ? fresh : ids;
  return pool[state.lifeId % pool.length];
}
