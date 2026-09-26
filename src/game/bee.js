'use strict';

import { MODE } from '../core/constants.js';
import { dist } from '../core/math.js';
import { state } from '../core/state.js';
import { playChime } from '../systems/audio.js';
import { addFloater } from '../systems/effects.js';
import { getForm } from '../systems/forms.js';
import { t } from '../systems/i18n.js';
import { recordKarma } from '../systems/karma.js';
import { saveRun } from '../systems/save.js';
import { hasEffect, recordEffect } from '../systems/world-effects.js';
import { choose } from '../ui/choices.js';
import { BLOOMS } from '../world/world-data.js';
import { animatePlayer, player } from '../entities/player.js';

/**
 * The bee's life: the flowers and the far meadow (docs/animal-lives-story.md
 * reserve table, "ผึ้ง — เชื่อมดอกไม้หลายจุด · งานเล็กของแต่ละตัวส่งผลต่อทั้งป่า").
 *
 * The way to the far field is a *chain of hops*, not a wall: each flower sits
 * within a comfortable flight of the last, so the life is worked through in order
 * — and if the bee drifts too far, it simply flies back to where it left off (no
 * hop is ever lost, no one is ever late). At the meadow the question is what the
 * pollen is for: leave a share in the far field, and the forest the later lives
 * walk carries flowers because of it (`forest-pollinated`), or carry every grain
 * home to the hive.
 */
export function bloomsSite() {
  return BLOOMS;
}

export function forestPollinated() {
  return hasEffect('forest-pollinated');
}

export function visitedCount() {
  return state.bee?.visited?.length || 0;
}

export function flowerVisited(index) {
  return (state.bee?.visited || []).includes(index);
}

export function allFlowersVisited() {
  return visitedCount() === BLOOMS.flowers.length;
}

export function hasDecided() {
  return state.bee?.decided === true;
}

export function didShare() {
  return state.bee?.shared === true;
}

/** Every life arrives with the whole chain waiting. */
export function resetBee() {
  state.bee = { visited: [], decided: false, shared: false };
}

/** The next flower in the chain, or −1 when the row is behind it. */
export function nextFlowerIndex() {
  for (let i = 0; i < BLOOMS.flowers.length; i++) if (!flowerVisited(i)) return i;
  return -1;
}

/**
 * The flower this body can work on next: the next one it has not visited, and only
 * while it is within a flight of the flower before it — the chain rule that makes
 * this life a series of hops rather than a straight line.
 */
export function reachableFlower() {
  const index = nextFlowerIndex();
  if (index < 0) return null;
  const flower = BLOOMS.flowers[index];
  const from = index === 0 ? BLOOMS.hive : BLOOMS.flowers[index - 1];
  if (dist(from.x, from.y, player.x, player.y) > BLOOMS.flightRange) return null;
  return { index, x: flower.x, y: flower.y };
}

/** Is that point inside a flower of the chain? */
export function atFlower(x, y, index) {
  const flower = BLOOMS.flowers[index];
  if (!flower) return false;
  return dist(x, y, flower.x, flower.y) < BLOOMS.bloomRadius;
}

/**
 * Where a bee's life goes next: the next flower it can reach (a guide), then the
 * meadow — where the question is — then the hive, where the life ends.
 */
export function beeGoal() {
  const next = nextFlowerIndex();
  if (next >= 0) {
    const flower = BLOOMS.flowers[next];
    return { x: flower.x, y: flower.y, r: BLOOMS.bloomRadius, kind: 'flower' };
  }
  if (!hasDecided()) return { x: BLOOMS.meadow.x, y: BLOOMS.meadow.y, r: BLOOMS.meadowRadius, kind: 'meadow' };
  return { x: BLOOMS.hive.x, y: BLOOMS.hive.y, r: BLOOMS.hiveRadius, kind: 'hive' };
}

/** Working the flowers, and the one question asked at the meadow. */
export function updateBee() {
  if (state.mode !== MODE.WORLD) return;
  if (state.dialogueOpen || state.choiceOpen || state.interact) return;
  if (getForm().lifeGoal !== 'bloom') return;
  if (hasDecided()) return;

  const flower = reachableFlower();
  if (flower && atFlower(player.x, player.y, flower.index)) {
    state.interact = { fn: () => visitFlower(flower.index), labelKey: 'prompt.pollinate' };
    return;
  }

  if (!allFlowersVisited()) return;
  if (dist(player.x, player.y, BLOOMS.meadow.x, BLOOMS.meadow.y) < BLOOMS.meadowRadius + 30) {
    state.interact = { fn: decidePollen, labelKey: 'prompt.sharePollen' };
  }
}

function visitFlower(index) {
  if (flowerVisited(index)) return;
  state.bee.visited = [...(state.bee.visited || []), index];
  saveRun();
  animatePlayer();
  playChime();
  addFloater(
    player.x,
    player.y - 100,
    t('bee.visited', { count: visitedCount(), total: BLOOMS.flowers.length }),
    '#e0c8a0',
    13.5,
  );
}

function decidePollen() {
  choose(
    [
      { t: t('bee.choice.share') },
      { t: t('bee.choice.keep') },
    ],
    (index) => {
      const share = index === 0;
      state.bee.decided = true;
      state.bee.shared = share;
      if (share) {
        recordEffect('forest-pollinated');
        recordKarma('give');
      } else {
        recordKarma('cling');
      }
      saveRun();
      animatePlayer();
      playChime();
      addFloater(
        player.x,
        player.y - 120,
        t(share ? 'bee.answer.share' : 'bee.answer.keep'),
        share ? '#e0c8a0' : '#d7bd8c',
        15,
      );
    },
  );
}

/** Back at the hive: the life closes where it began. */
export function settleHive() {
  animatePlayer();
  playChime();
  addFloater(BLOOMS.hive.x, BLOOMS.hive.y - 80, t('bee.hive'), '#e0c8a0', 15);
  return forestPollinated();
}
