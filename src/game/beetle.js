'use strict';

import { MODE } from '../core/constants.js';
import { dist } from '../core/math.js';
import { state } from '../core/state.js';
import { playChime, playThud } from '../systems/audio.js';
import { addFloater } from '../systems/effects.js';
import { getForm } from '../systems/forms.js';
import { t } from '../systems/i18n.js';
import { recordKarma } from '../systems/karma.js';
import { saveRun } from '../systems/save.js';
import { hasEffect, recordEffect } from '../systems/world-effects.js';
import { dynamicFeatures, nextFeatureIndex } from '../systems/worldgen.js';
import { assemblePushSite } from '../world/rooms.js';
import { PUSH, seedPoint } from '../world/world-data.js';
import { animatePlayer, player } from '../entities/player.js';

/**
 * The beetle's groove (docs/animal-lives-story.md reserve table, "ด้วง — ผลักวัตถุ
 * ด้วยแรงและทิศ · ร่วมกับมดขนเมล็ดใหญ่ข้ามร่อง").
 *
 * A big seed on a worn groove, and a trench ring around a far hollow. The life is one
 * verb done carefully: **push** — one step at a time, and the direction is where the
 * body stands (push from behind the seed and it rolls on; stand past it and it comes
 * back). Five steps reach the socket on the ring, and a seed seated there is a
 * crossing for every body (`trench-bridged`), which is the reserve table's force and
 * direction turned into something a life does rather than watches.
 */
const SEED_RANGE = 130;

function beetle() {
  if (!state.beetle) state.beetle = { pushed: false, seated: false };
  return state.beetle;
}

export function pushSite() {
  return PUSH;
}

/** How far the world's pushes have taken the seed. */
export function pushedSteps() {
  return Number.isFinite(state.world?.pushes) ? state.world.pushes : 0;
}

export function hasSeated() {
  return pushedSteps() >= PUSH.steps;
}

export function trenchBridged() {
  return hasEffect('trench-bridged');
}

export function hasPushed() {
  return beetle().pushed === true;
}

/** Every life arrives to a seed wherever the last pushes left it. */
export function resetBeetle() {
  state.beetle = { pushed: false, seated: hasSeated() };
}

/** The seed before it is seated, the hollow after. */
export function beetleGoal() {
  const seed = seedPoint(pushedSteps());
  if (!hasSeated()) return { x: seed.x, y: seed.y, r: PUSH.seedRadius + 40, kind: 'push-seed' };
  return { x: PUSH.hollow.x, y: PUSH.hollow.y, r: PUSH.hollowRadius, kind: 'push-crossed' };
}

/** The one verb, offered while the life stands at the seed. */
export function updateBeetle() {
  if (state.mode !== MODE.WORLD) return;
  if (state.dialogueOpen || state.choiceOpen || state.interact) return;
  if (getForm().lifeGoal !== 'push') return;
  if (hasSeated()) return;
  const seed = seedPoint(pushedSteps());
  if (dist(player.x, player.y, seed.x, seed.y) > SEED_RANGE) return;
  state.interact = { fn: pushSeed, labelKey: 'prompt.pushSeed' };
}

/**
 * Push the seed one step: forward if the body stands behind it, back if it stands
 * past it. Nothing is decided for the player — standing on the wrong side simply
 * pushes the seed the other way.
 */
export function pushSeed() {
  if (hasSeated()) return false;
  const step = pushedSteps();
  const seed = seedPoint(step);
  // Which side of the seed the body is on, measured along the groove's direction.
  const along = (player.x - seed.x) * PUSH.dir.x + (player.y - seed.y) * PUSH.dir.y;
  const direction = along <= 0 ? 1 : -1;
  const next = Math.max(0, Math.min(PUSH.steps, step + direction));
  if (next === step) return false;
  state.world.pushes = next;
  beetle().pushed = true;
  // The world changes at once, in this life: the seed moves (and seats) now.
  rebuildSite(next);
  animatePlayer();
  if (next >= PUSH.steps) {
    beetle().seated = true;
    recordEffect('trench-bridged');
    recordKarma('give');
    playChime();
    addFloater(player.x, player.y - 110, t('beetle.answer.seated'), '#c9b78f', 16);
  } else {
    playThud();
    addFloater(player.x, player.y - 110, t('beetle.answer.pushed'), '#d8c8a4', 13);
  }
  saveRun();
  return true;
}

/** Replace this site's features in the live world with the ones this push makes. */
function rebuildSite(step) {
  if (!state.dynamic || !Array.isArray(state.dynamic.features)) return;
  state.dynamic.features = state.dynamic.features.filter((feature) => feature.site !== 'push');
  for (const feature of assemblePushSite(step)) {
    state.dynamic.features.push({ ...feature, i: nextFeatureIndex() });
  }
}

/** In the hollow: the life closes on the far side of what it moved. */
export function settleTrench() {
  animatePlayer();
  playChime();
  addFloater(PUSH.hollow.x, PUSH.hollow.y - 60, t('beetle.answer.crossed'), '#c9b78f', 15);
  return trenchBridged();
}
