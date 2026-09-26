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
import { HOMES, WARM_STONE } from '../world/world-data.js';
import { animatePlayer, player } from '../entities/player.js';

/**
 * The cat's life: the homes and the walls (docs/animal-lives-story.md reserve
 * table, "แมว — ทรงตัวบนกำแพงและฟังเสียงเล็ก · ความอยากรู้อยากเห็นกับการเคารพพื้นที่
 * ผู้อื่น").
 *
 * Three homes stand in this forest — a warren, a hive, the marsh — each with a low
 * wall a step away. The cat is curious, and the wall is how a curious body behaves
 * well: it climbs up and looks in from above (`cling`), rather than walking in.
 * There are three small answers, not one big one, and they accumulate: look at all
 * three and the homes stay open to every life after (`hearths-respected`); rummage
 * in even one and the forest keeps its doors shut — no punishment, just what the
 * world ends up with.
 */
export function homesSite() {
  return HOMES;
}

export function warmStone() {
  return WARM_STONE;
}

export function hearthsRespected() {
  return hasEffect('hearths-respected');
}

export function homeVisited(id) {
  return (state.cat?.visited || []).includes(id);
}

export function visitedCount() {
  return state.cat?.visited?.length || 0;
}

export function allHomesVisited() {
  return visitedCount() === HOMES.length;
}

export function peekedAt(id) {
  return (state.cat?.peeked || []).includes(id);
}

export function rummagedAt(id) {
  return (state.cat?.rummaged || []).includes(id);
}

export function respectedAll() {
  return allHomesVisited() && (state.cat?.rummaged || []).length === 0;
}

export function hasDecided() {
  return state.cat?.decided === true;
}

/** Every life arrives with three doors it has not looked behind. */
export function resetCat() {
  state.cat = { visited: [], peeked: [], rummaged: [], decided: false };
}

/** Can this body be on a wall at all? (The same gate the wall itself enforces.) */
export function canCling() {
  return getForm().abilities?.cling === true || getForm().abilities?.flying === true;
}

function nextHome() {
  return HOMES.find((home) => !homeVisited(home.id)) || null;
}

/** The home wall this body is standing on, if any. */
export function homeAtWall() {
  if (!canCling()) return null;
  return HOMES.find((home) => dist(player.x, player.y, home.wall.x, home.wall.y) < 60) || null;
}

/**
 * Where a cat's life goes next: the home it has not peered at (a guide), then the
 * warm stone — the ledge it always comes back to, where the life ends.
 */
export function catGoal() {
  const home = nextHome();
  // not 'home': that is the crab's *ending* kind (game/crab.js), and a guide must
  // never end a life — hence the cat's own name for it.
  if (home) return { x: home.wall.x, y: home.wall.y, r: 80, kind: 'home-wall' };
  return { x: WARM_STONE.x, y: WARM_STONE.y, r: 92, kind: 'warm-stone' };
}

/** Peering over a wall — or overstepping it. */
export function updateCat() {
  if (state.mode !== MODE.WORLD) return;
  if (state.dialogueOpen || state.choiceOpen || state.interact) return;
  if (getForm().lifeGoal !== 'wall') return;
  if (hasDecided()) return;

  const home = homeAtWall();
  if (home) {
    state.interact = { fn: () => decideHome(home), labelKey: 'prompt.peekHome' };
  }
  // There is no question at the warm stone: the three answers were given at the
  // three walls, and arriving home settles them (systems/goals.js calls
  // settleHomes on the 'warm-stone' ending).
}

function decideHome(home) {
  choose(
    [
      { t: t('cat.choice.peek') },
      { t: t('cat.choice.rummage') },
    ],
    (index) => {
      const peek = index === 0;
      const visited = [...(state.cat.visited || []), home.id];
      state.cat.visited = visited;
      if (peek) {
        state.cat.peeked = [...(state.cat.peeked || []), home.id];
        recordKarma('mindful');
      } else {
        state.cat.rummaged = [...(state.cat.rummaged || []), home.id];
        recordKarma('harm');
      }
      saveRun();
      animatePlayer();
      playChime();
      addFloater(
        player.x,
        player.y - 110,
        t(peek ? 'cat.answer.peek' : 'cat.answer.rummage'),
        peek ? '#d8c8a8' : '#c98a7a',
        14.5,
      );
      // The effect is a summary of three answers, not one: it is settled at the
      // warm stone, so the cat can change its ways on the way round.
      if (visited.length === HOMES.length) {
        addFloater(WARM_STONE.x, WARM_STONE.y - 80, t('cat.roundDone'), '#d8c8a8', 14);
      }
    },
  );
}

/**
 * Home at the warm stone: whether the homes stay open to everyone is settled here,
 * from all three answers together — the one effect in the game that is a *summary*
 * of several small decisions rather than the outcome of a single one.
 */
export function settleHomes() {
  if (hasDecided()) return respectedAll();
  state.cat.decided = true;
  animatePlayer();
  playChime();
  const respected = respectedAll();
  if (respected) {
    recordEffect('hearths-respected');
    recordKarma('give');
  }
  saveRun();
  addFloater(
    WARM_STONE.x,
    WARM_STONE.y - 70,
    t(respected ? 'cat.answer.respected' : 'cat.answer.notRespected'),
    respected ? '#e0d0a8' : '#c9c0a8',
    15,
  );
  return respected;
}
