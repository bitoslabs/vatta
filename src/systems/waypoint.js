'use strict';

import { state } from '../core/state.js';

/**
 * Following a memory (docs/player-interactions.md "สมุดความทรงจำ").
 *
 * The world book (ui/codex.js) lets the player tap a place a past life changed; this
 * is the mark that leads there. It is deliberately *not* saved: a waypoint is where
 * the player is looking, not part of the world — and a reload must never leave a
 * ghost errand running.
 */
const ARRIVED = 90;

export function waypoint() {
  return state.waypoint || null;
}

/** Set the mark. Passing nothing, or a place without real numbers, clears it. */
export function setWaypoint(mark) {
  if (!mark || !Number.isFinite(mark.x) || !Number.isFinite(mark.y)) {
    state.waypoint = null;
    return null;
  }
  state.waypoint = {
    x: mark.x,
    y: mark.y,
    key: typeof mark.key === 'string' ? mark.key : null,
    site: typeof mark.site === 'string' ? mark.site : null,
    label: typeof mark.label === 'string' ? mark.label : null,
  };
  return state.waypoint;
}

export function clearWaypoint() {
  state.waypoint = null;
}

/** Walked there? Then the mark has done its work and goes. */
export function reachedWaypoint(x, y) {
  const mark = waypoint();
  if (!mark) return false;
  if (Math.hypot(x - mark.x, y - mark.y) > ARRIVED) return false;
  clearWaypoint();
  return true;
}

export const WAYPOINT_RANGE = ARRIVED;
