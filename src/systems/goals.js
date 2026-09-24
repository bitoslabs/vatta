'use strict';

import { MODE, TEMPLE } from '../core/constants.js';
import { dist } from '../core/math.js';
import { state } from '../core/state.js';
import { emit, EVENTS } from '../core/events.js';
import { getForm, isWaterBound } from './forms.js';
import { player } from '../entities/player.js';
import { BURROW, RIVER } from '../world/world-data.js';
import { waterRoot } from '../game/burrow.js';
import { antGoal, deliverSeed } from '../game/ant.js';
import { frogGoal, spawnAtBank } from '../game/frog.js';

const WATER_GOAL_RADIUS = 150;
const LAND_GOAL_RADIUS = 340;
/** Goal kinds that end a life on their own; 'land', 'seed' and 'inlet' only guide. */
const ENDING_GOALS = new Set(['water', 'burrow', 'nest', 'spawn']);

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
 * completable *for the form in play*). The body itself decides (content/forms.js
 * `lifeGoal`):
 *
 *   land   the temple, through the chapter's own story (the default)
 *   water  the river pool nearest home — a fish cannot walk out of the water
 *   seed   the seed chamber under the great root, which only a tunnelling body
 *          can enter (world/rooms.js#validateBurrowExit proves the others cannot)
 *   nest   the ant's errand: the fallen seed first, then home through the crack
 *          (world/rooms.js#validateNestRoute proves only a small body fits)
 *   spawn  the frog's marsh: the blocked channel inside the mire first, then the
 *          bank its eggs are laid on (world/rooms.js#validateFrogRoute proves
 *          only a leaping body crosses the mire)
 */
export function goalFor() {
  if (isWaterBound() || getForm().lifeGoal === 'water') {
    const point = nearestRiverPoint(TEMPLE);
    return { x: point.x, y: point.y, r: WATER_GOAL_RADIUS, kind: 'water' };
  }
  const lifeGoal = getForm().lifeGoal || 'land';
  if (lifeGoal === 'seed') {
    return { x: BURROW.chamber.x, y: BURROW.chamber.y, r: BURROW.exitRadius, kind: 'burrow' };
  }
  if (lifeGoal === 'nest') return antGoal();
  if (lifeGoal === 'spawn') return frogGoal();
  return { x: TEMPLE.x, y: TEMPLE.y, r: LAND_GOAL_RADIUS, kind: 'land' };
}

/**
 * In life mode a water, burrow, nest or spawn life completes at its own goal. A
 * 'land' life is ended by its chapter, and a 'seed' or 'inlet' marker only shows
 * the body where its errand begins — standing there is not an ending.
 */
export function updateLifeGoal() {
  if (state.mode !== MODE.WORLD) return;
  if (!state.lifeMode || state.liberated) return;
  if (state.dialogueOpen || state.choiceOpen) return;

  const goal = goalFor();
  if (!ENDING_GOALS.has(goal.kind)) return;
  if (dist(player.x, player.y, goal.x, goal.y) < goal.r) {
    if (goal.kind === 'burrow') waterRoot();
    if (goal.kind === 'nest') deliverSeed();
    if (goal.kind === 'spawn') spawnAtBank();
    emit(EVENTS.LIFE_COMPLETE, goal.kind);
  }
}
