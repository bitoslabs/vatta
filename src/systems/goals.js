'use strict';

import { MODE, TEMPLE } from '../core/constants.js';
import { dist } from '../core/math.js';
import { state } from '../core/state.js';
import { emit, EVENTS } from '../core/events.js';
import { isWaterBound } from './forms.js';
import { player } from '../entities/player.js';
import { RIVER } from '../world/world-data.js';

const WATER_GOAL_RADIUS = 150;
const LAND_GOAL_RADIUS = 340;

function nearestRiverPoint(target) {
  let best = RIVER[0];
  let bestDist = Infinity;
  for (const point of RIVER) {
    const d = dist(point[0], point[1], target.x, target.y);
    if (d < bestDist) {
      bestDist = d;
      best = point;
    }
  }
  return { x: best[0], y: best[1] };
}

/**
 * Where this life can actually finish (design §12 acceptance: the route must be
 * completable *for the form in play*).
 *
 * Land forms end their chapter through the chapter's own story, as before. A
 * water-bound form cannot walk to the temple, so its goal is the river pool
 * nearest it — the water's own way home.
 */
export function goalFor() {
  if (isWaterBound()) {
    const point = nearestRiverPoint(TEMPLE);
    return { x: point.x, y: point.y, r: WATER_GOAL_RADIUS, kind: 'water' };
  }
  return { x: TEMPLE.x, y: TEMPLE.y, r: LAND_GOAL_RADIUS, kind: 'land' };
}

/** In life mode, a water-bound life completes at its water goal. */
export function updateLifeGoal() {
  if (state.mode !== MODE.WORLD) return;
  if (!state.lifeMode || !isWaterBound()) return;
  if (state.dialogueOpen || state.choiceOpen) return;

  const goal = goalFor();
  if (dist(player.x, player.y, goal.x, goal.y) < goal.r) {
    emit(EVENTS.LIFE_COMPLETE, goal.kind);
  }
}
