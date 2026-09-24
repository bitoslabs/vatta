'use strict';

import { MODE, TEMPLE } from '../core/constants.js';
import { dist } from '../core/math.js';
import { state } from '../core/state.js';
import { emit, EVENTS } from '../core/events.js';
import { getForm, isWaterBound } from './forms.js';
import { player } from '../entities/player.js';
import { BURROW, GROVE, RIVER } from '../world/world-data.js';
import { waterRoot } from '../game/burrow.js';
import { antGoal, deliverSeed } from '../game/ant.js';
import { frogGoal, spawnAtBank } from '../game/frog.js';
import { linkWater, snakeGoal } from '../game/snake.js';
import { rabbitGoal, tendField } from '../game/rabbit.js';
import { owlGoal, settleRoost } from '../game/owl.js';
import { gatherInGrove } from '../game/elephant.js';
import { settleRange, tigerGoal } from '../game/tiger.js';
import { geckoGoal, settleRefuge } from '../game/gecko.js';
import { batGoal, settleRoost as settleBatRoost } from '../game/bat.js';

const WATER_GOAL_RADIUS = 150;
const LAND_GOAL_RADIUS = 340;
/** Goal kinds that end a life on their own; 'land', 'seed' and 'inlet' only guide. */
const ENDING_GOALS = new Set(['water', 'burrow', 'nest', 'spawn', 'link', 'storm', 'watch', 'grove', 'range', 'enclosure', 'dark-roost']);

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
 *   link   the snake's crevice: the sealed spring inside the stone first, then
 *          the outflow that links to the river (world/rooms.js#validateSnakeRoute
 *          proves only a slithering body fits through the slot)
 *   storm  the rabbit's field: join the warrens, leap the washed rim, answer for
 *          the shelter, then finish in the open field — a relay with no clock
 *          (world/rooms.js#validateRabbitRoute proves only the leap)
 *   watch  the owl's night: find the lost inside what the body can perceive,
 *          then answer for the watch at the roost — no wall at all, only the
 *          dark (systems/vision.js is the whole gate)
 *   grove  the elephant's strength: the gathering place behind the fallen log,
 *          which only strength opens (world/rooms.js#validateElephantRoute proves
 *          it is shut before the lift and open after it)
 *   range  the tiger's trail: the tracks of another animal, read one after the
 *          next, then the hollow where the fight is or is not picked — no wall at
 *          all, only attention (game/tiger.js#canTrack is the whole gate)
 *   enclosure the gecko's wall: climb the ring nothing walks over, lift the bar
 *          from the inside, and open the way for every body that cannot climb
 *          (world/rooms.js#validateGeckoRoute proves the last part)
 *   roost  the bat's night: find the pup in a chamber too dark to see, then
 *          answer for it at the roost — the gate is not a wall at all, it is a
 *          sound the body has to make (systems/echo.js#perceivesPoint)
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
  if (lifeGoal === 'crevice') return snakeGoal();
  if (lifeGoal === 'storm') return rabbitGoal();
  if (lifeGoal === 'watch') return owlGoal();
  if (lifeGoal === 'grove') {
    return { x: GROVE.grove.x, y: GROVE.grove.y, r: GROVE.groveRadius, kind: 'grove' };
  }
  if (lifeGoal === 'trail') return tigerGoal();
  if (lifeGoal === 'enclosure') return geckoGoal();
  if (lifeGoal === 'echo') return batGoal();
  return { x: TEMPLE.x, y: TEMPLE.y, r: LAND_GOAL_RADIUS, kind: 'land' };
}

/**
 * In life mode a water, burrow, nest or spawn life completes at its own goal. A
 * 'land' life is ended by its chapter, and a 'seed', 'inlet', 'spring', 'warren',
 * 'shelter', 'lost' or 'roost' marker only shows the body where its errand goes
 * next — standing there is not an ending.
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
    if (goal.kind === 'link') linkWater();
    if (goal.kind === 'storm') tendField();
    if (goal.kind === 'watch') settleRoost();
    if (goal.kind === 'grove') gatherInGrove();
    if (goal.kind === 'range') settleRange();
    if (goal.kind === 'enclosure') settleRefuge();
    if (goal.kind === 'dark-roost') settleBatRoost();
    emit(EVENTS.LIFE_COMPLETE, goal.kind);
  }
}
