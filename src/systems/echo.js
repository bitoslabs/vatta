'use strict';

import { clamp } from '../core/math.js';
import { state } from '../core/state.js';
import { on, EVENTS } from '../core/events.js';
import { getForm } from './forms.js';
import { hasEffect } from './world-effects.js';
import { playChime } from './audio.js';
import { caveDarkness } from '../world/world-data.js';

/**
 * Echolocation (reserve table, "ค้างคาว — รับรู้โดยไม่พึ่งภาพเพียงอย่างเดียว").
 *
 * The owl's eyes are a bigger circle; the bat's ears are an *action*. Its own
 * sight is poor, and the dark cave it must cross cannot be read by looking at
 * all: pressing F (and any body the bat taught, once `echo-shared` is recorded)
 * sends a pulse that shows what lies within earshot for a moment. So this is the
 * first mechanic in the game where perceiving is something you *do* — and where
 * what you do not send for, you simply cannot find.
 */
const PULSE_TIME = 0.9;
const PULSE_RADIUS = 430;
const PULSE_COOLDOWN = 0.35;

export function canEcho() {
  return getForm().abilities?.echo === true || hasEffect('echo-shared');
}

export function isEchoing() {
  return (state.echo?.t || 0) > 0;
}

/** How far a pulse reaches right now (0 when none is in flight). */
export function echoRadius() {
  return isEchoing() ? PULSE_RADIUS : 0;
}

/** The pulse in flight, as a 0..1 wave for the renderer. */
export function echoWave() {
  if (!isEchoing()) return 0;
  return clamp(1 - (state.echo.t / PULSE_TIME), 0, 1);
}

/**
 * Can this body perceive that point? Poor eyes work close by — *where there is
 * light*. Inside the dark chamber sight counts for nothing at all, however close
 * the thing is, so a pulse is the only way to know anything in there; that is the
 * whole lesson of the cave, and it makes the darkness a fact rather than a tint
 * (world-data.js#caveDarkness).
 */
export function perceivesPoint(x, y, from, visionRadius) {
  const d = Math.hypot(x - from.x, y - from.y);
  if (caveDarkness(from.x, from.y) === null && d < visionRadius) return true;
  return isEchoing() && d < PULSE_RADIUS;
}

export function emitPulse() {
  if (!canEcho()) return false;
  if ((state.echo?.t || 0) > PULSE_COOLDOWN) return false; // already ringing
  state.echo = { t: PULSE_TIME };
  playChime();
  return true;
}

export function updateEcho(dt) {
  if (!state.echo) state.echo = { t: 0 };
  if (state.echo.t > 0) state.echo.t = Math.max(0, state.echo.t - dt);
}

/** A new life starts with its ears quiet. */
export function resetEcho() {
  state.echo = { t: 0 };
}

export function initEcho() {
  on(EVENTS.ECHO_PULSE, () => emitPulse());
  resetEcho();
}
