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
import { choose } from '../ui/choices.js';
import { SEEDS, saplingsAlong } from '../world/world-data.js';
import { currentBiomeId } from '../systems/biome.js';
import { animatePlayer, player } from '../entities/player.js';

/**
 * The squirrel's life: the seed crowns and the cache
 * (docs/animal-lives-story.md reserve table, "กระรอก — ปีนและกระจายเมล็ด ·
 * การสะสมกับการแบ่งปัน").
 *
 * The seeds are inside the crowns, where only a climbing body goes — so the
 * gathering is a climb, and the life is the first one that *accumulates*: pick
 * from three crowns, then carry what you have to the old cache at the road's side
 * and decide there. Bury it all in one place, and nothing comes of it beyond a
 * full cache; scatter it along the road, and the road the later lives walk
 * carries saplings because of it (`saplingsAlong`).
 */
export function seedsSite() {
  return SEEDS;
}

export function seedsScattered() {
  return hasEffect('seeds-scattered');
}

export function seedsHeld() {
  return state.squirrel?.seeds || 0;
}

export function pickedCrowns() {
  return state.squirrel?.picked || [];
}

export function crownPicked(index) {
  return pickedCrowns().includes(index);
}

export function allPicked() {
  return pickedCrowns().length === SEEDS.canopies.length;
}

export function hasDecided() {
  return state.squirrel?.decided === true;
}

export function didScatter() {
  return state.squirrel?.scattered === true;
}

/** Every life arrives with empty paws and no crowns picked. */
export function resetSquirrel() {
  state.squirrel = { picked: [], seeds: 0, decided: false, scattered: false };
}

/**
 * Can this body be up in a crown at all? Collision already keeps a walker out of
 * one, but the offer is gated on the tool too, so the rule is explicit rather than
 * an accident of where a body happens to be standing.
 */
export function canBeInCanopy() {
  const abilities = getForm().abilities || {};
  return abilities.climbing === true || abilities.flying === true;
}

/** Is the body up in that crown? (Only a climbing body gets there.) */
export function inCrown(x, y, index) {
  const crown = SEEDS.canopies[index];
  if (!crown) return false;
  return dist(x, y, crown.x, crown.y) < SEEDS.canopyRadius;
}

function nextCrown() {
  for (let i = 0; i < SEEDS.canopies.length; i++) if (!crownPicked(i)) return i;
  return -1;
}

/**
 * Where a squirrel's life goes next: the crowns it has not climbed (a guide),
 * then the cache — where the life ends and the question is asked.
 */
export function squirrelGoal() {
  const index = nextCrown();
  if (index >= 0) {
    const crown = SEEDS.canopies[index];
    return { x: crown.x, y: crown.y, r: SEEDS.canopyRadius, kind: 'crown' };
  }
  // At the cache the question is asked first: 'bury' only *guides* there, and the
  // life ends on 'cache' — after the answer, never before it (systems/goals.js).
  if (!hasDecided()) return { x: SEEDS.cache.x, y: SEEDS.cache.y, r: SEEDS.cacheRadius, kind: 'bury' };
  return { x: SEEDS.cache.x, y: SEEDS.cache.y, r: SEEDS.cacheRadius, kind: 'cache' };
}

/** Picking in the crowns, and the one question asked at the cache. */
export function updateSquirrel() {
  if (state.mode !== MODE.WORLD) return;
  if (state.dialogueOpen || state.choiceOpen || state.interact) return;
  if (getForm().lifeGoal !== 'seeds') return;
  if (hasDecided()) return;

  if (!canBeInCanopy()) return;
  for (let i = 0; i < SEEDS.canopies.length; i++) {
    if (crownPicked(i)) continue;
    if (!inCrown(player.x, player.y, i)) continue;
    state.interact = { fn: () => pickCrown(i), labelKey: 'prompt.gatherSeed' };
    return;
  }

  if (!allPicked()) return; // nothing to decide until the crowns are emptied
  if (dist(player.x, player.y, SEEDS.cache.x, SEEDS.cache.y) < SEEDS.cacheRadius + 40) {
    state.interact = { fn: decideSeeds, labelKey: 'prompt.burySeeds' };
  }
}

function pickCrown(index) {
  if (crownPicked(index)) return;
  state.squirrel.picked = [...pickedCrowns(), index];
  state.squirrel.seeds = seedsHeld() + 1;
  animatePlayer();
  playChime();
  addFloater(
    player.x,
    player.y - 110,
    t('squirrel.seedCount', { count: seedsHeld(), total: SEEDS.canopies.length }),
    '#bfd0a0',
    14,
  );
}

function decideSeeds() {
  choose(
    [
      { t: t('squirrel.choice.scatter') },
      { t: t('squirrel.choice.hoard') },
    ],
    (index) => {
      const scatter = index === 0;
      state.squirrel.decided = true;
      state.squirrel.scattered = scatter;
      if (scatter) {
        recordEffect('seeds-scattered');
        recordKarma('give');
      } else {
        recordKarma('cling');
      }
      animatePlayer();
      playChime();
      addFloater(
        player.x,
        player.y - 120,
        t(scatter ? 'squirrel.answer.scatter' : 'squirrel.answer.hoard'),
        scatter ? '#bfd0a0' : '#d7bd8c',
        15,
      );
    },
  );
}

/** The cache: the life ends where the seeds were decided about. */
export function settleCache() {
  animatePlayer();
  playChime();
  addFloater(SEEDS.cache.x, SEEDS.cache.y - 80, t('squirrel.cache'), '#bfd0a0', 15);
  return seedsScattered();
}

/**
 * Shade from a sapling a scattered seed grew into: a resting place for every
 * body, on whichever road it stands (systems/rest.js).
 */
export function inSaplingShade(x, y) {
  if (!seedsScattered()) return false;
  return saplingsAlong(currentBiomeId()).some((sapling) => dist(x, y, sapling.x, sapling.y) < 60);
}
