'use strict';

import { MODE, TEMPLE } from '../core/constants.js';
import { dist } from '../core/math.js';
import { state } from '../core/state.js';
import { emit, EVENTS } from '../core/events.js';
import { getForm, isWaterBound } from './forms.js';
import { player } from '../entities/player.js';
import { BURROW, GROVE, nearestRiverPoint } from '../world/world-data.js';
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
import { settleCache, squirrelGoal } from '../game/squirrel.js';
import { crabGoal, settleHome } from '../game/crab.js';
import { otterGoal, settleHolt } from '../game/otter.js';
import { beeGoal, settleHive } from '../game/bee.js';
import { catGoal, settleHomes } from '../game/cat.js';
import { buffaloGoal, settlePasture } from '../game/buffalo.js';
import { settleGarden, snailGoal } from '../game/snail.js';
import { boarGoal, settleWallow } from '../game/boar.js';
import { settleHollow, spiderGoal } from '../game/spider.js';
import { fireflyGoal, settleSwarm } from '../game/firefly.js';
import { beetleGoal, settleTrench } from '../game/beetle.js';

const WATER_GOAL_RADIUS = 150;
const LAND_GOAL_RADIUS = 340;
/** Goal kinds that end a life on their own; 'land', 'seed' and 'inlet' only guide. */
export const ENDING_GOALS = new Set(['water', 'burrow', 'nest', 'spawn', 'link', 'storm', 'watch', 'grove', 'range', 'enclosure', 'dark-roost', 'cache', 'home', 'holt', 'hive', 'warm-stone', 'pasture', 'damp-garden', 'wallow', 'web-hollow', 'swarm-answered', 'push-crossed']);

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
 *   cache  the squirrel's gathering: climb into three crowns for seeds, then
 *          decide at the old cache whether to keep them or scatter them — the
 *          only life that accumulates before it answers (game/squirrel.js)
 *   home   the crab's tide: cross the flooded channel to the spawning pool, decide
 *          what the water should do, and come home through the place you changed —
 *          the only passage in the game that opens with the hour (game/crab.js)
 *   holt   the otter's current: swim down three things the river is carrying, then
 *          decide at the holt whether the water is left clear for those who come
 *          after — the only life whose objects move on their own (game/otter.js)
 *   hive   the bee's flowers: work a chain of hops to the far meadow, then decide
 *          whether the pollen is left there for the forest or carried home — the
 *          only route in the game that is about reach rather than tools (game/bee.js)
 *   warm-stone the cat's round: peer over the wall beside three homes of the
 *          forest, and the homes stay open to everyone only if all three were
 *          looked at and none walked into (game/cat.js)
 *   pasture the buffalo's ford: drag the fallen log over the chasm and the way to
 *          the far pasture stands for everyone — the first life that changes the
 *          shape of the map rather than finding a way through it (game/buffalo.js)
 *   damp-garden the snail's ridge: cross the dry ground while the ground itself is
 *          damp, then decide whether the crossing stays damp behind you — the only
 *          barrier in the game that exists for one body (game/snail.js)
 *   push-crossed the beetle's hollow: push the big seed five steps along its groove
 *          into the socket, and the trench rings a way for every body (game/beetle.js)
 *   swarm-answered the firefly's stone: signal in the swarm's rhythm and the mist
 *          that only a glowing body crossed becomes a way for every body after it
 *          (game/firefly.js)
 *   web-hollow the spider's hollow: spin a thread between the posts and cross the
 *          fissure on it — a bridge for small bodies that closes nothing for anyone
 *          else (game/spider.js)
 *   wallow  the boar's feeding ground: root three of four root patches out of the
 *          sealed ground, seeing which one is alive underneath before breaking it,
 *          then decide what the soil you opened should give (game/boar.js)
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
  if (lifeGoal === 'seeds') return squirrelGoal();
  if (lifeGoal === 'tide') return crabGoal();
  if (lifeGoal === 'current') return otterGoal();
  if (lifeGoal === 'bloom') return beeGoal();
  if (lifeGoal === 'wall') return catGoal();
  if (lifeGoal === 'ford') return buffaloGoal();
  if (lifeGoal === 'damp') return snailGoal();
  if (lifeGoal === 'soil') return boarGoal();
  if (lifeGoal === 'web') return spiderGoal();
  if (lifeGoal === 'signal') return fireflyGoal();
  if (lifeGoal === 'push') return beetleGoal();
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
    if (goal.kind === 'cache') settleCache();
    if (goal.kind === 'home') settleHome();
    if (goal.kind === 'holt') settleHolt();
    if (goal.kind === 'hive') settleHive();
    if (goal.kind === 'warm-stone') settleHomes();
    if (goal.kind === 'pasture') settlePasture();
    if (goal.kind === 'damp-garden') settleGarden();
    if (goal.kind === 'wallow') settleWallow();
    if (goal.kind === 'web-hollow') settleHollow();
    if (goal.kind === 'swarm-answered') settleSwarm();
    if (goal.kind === 'push-crossed') settleTrench();
    emit(EVENTS.LIFE_COMPLETE, goal.kind);
  }
}
