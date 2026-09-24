'use strict';

import { MODE } from '../core/constants.js';
import { dist } from '../core/math.js';
import { state } from '../core/state.js';
import { playChime, playThud } from '../systems/audio.js';
import { addFloater } from '../systems/effects.js';
import { getForm } from '../systems/forms.js';
import { t } from '../systems/i18n.js';
import { recordKarma } from '../systems/karma.js';
import { hasEffect, recordEffect } from '../systems/world-effects.js';
import { dynamicFeatures, removeFeature } from '../systems/worldgen.js';
import { choose } from '../ui/choices.js';
import { FORD, fordBridge } from '../world/world-data.js';
import { animatePlayer, player } from '../entities/player.js';

/**
 * The buffalo's life: the mud and the log (docs/animal-lives-story.md story table
 * ch.11, "ควาย — ลุยโคลนและลากไม้ · ความร่วมมือและความอดทน").
 *
 * The mud costs every other body more than half its pace and costs the buffalo
 * nothing (systems/terrain.js), and the pasture is ringed by a chasm only a
 * leaping body clears. The buffalo hauls the fallen log over to the chasm and
 * *drags* it across — the first life that moves a thing to change the shape of the
 * map, and the first bridge that stands for every life after it (`ford-bridged`,
 * `state.world.planks`). At the far pasture the one question is the doc's own
 * pair: go back for the herd, or keep the grass to yourself.
 */
const LOG_RANGE = 130;

export function fordSite() {
  return FORD;
}

export function bridgePoint() {
  return fordBridge();
}

export function fordBridged() {
  return hasEffect('ford-bridged');
}

export function hasHauled() {
  return state.buffalo?.hauled === true;
}

export function hasDecided() {
  return state.buffalo?.decided === true;
}

export function didFetchHerd() {
  return state.buffalo?.fetched === true;
}

/** Every life arrives with the log still lying on the near side. */
export function resetBuffalo() {
  state.buffalo = { hauled: false, decided: false, fetched: false };
}

/**
 * Where a buffalo's life goes next: the log (a guide, and the life's work), then
 * the far pasture — where the question is and where the life ends.
 */
export function buffaloGoal() {
  if (!hasHauled()) return { x: FORD.log.x, y: FORD.log.y, r: FORD.logRadius, kind: 'log' };
  if (!hasDecided()) return { x: FORD.pasture.x, y: FORD.pasture.y, r: FORD.pastureRadius, kind: 'pasture-guide' };
  return { x: FORD.pasture.x, y: FORD.pasture.y, r: FORD.pastureRadius, kind: 'pasture' };
}

/** Hauling the log, and the one question asked at the far pasture. */
export function updateBuffalo() {
  if (state.mode !== MODE.WORLD) return;
  if (state.dialogueOpen || state.choiceOpen || state.interact) return;
  if (getForm().lifeGoal !== 'ford') return;

  if (!hasHauled()) {
    if (dist(player.x, player.y, FORD.log.x, FORD.log.y) <= LOG_RANGE) {
      state.interact = { fn: haulLog, labelKey: 'prompt.haulLog' };
    }
    return;
  }

  if (!hasDecided() && dist(player.x, player.y, FORD.pasture.x, FORD.pasture.y) < FORD.pastureRadius + 30) {
    state.interact = { fn: decideHerd, labelKey: 'prompt.fetchHerd' };
  }
}

/**
 * Drag the log across the chasm: the log leaves the near side, a plank appears
 * over the chasm, and the world remembers the bridge for every life to come.
 */
export function haulLog() {
  if (hasHauled()) return false;
  const log = dynamicFeatures().find((feature) => feature.type === 'log' && feature.site === 'ford');
  state.buffalo.hauled = true;
  if (log) removeFeature(log.i);
  // The bridge, recorded where the world keeps what it inherited.
  const bridge = fordBridge();
  state.world.planks = [{ x: bridge.x, y: bridge.y }];
  recordEffect('ford-bridged');
  recordKarma('give');
  animatePlayer();
  playThud();
  addFloater(player.x, player.y - 120, t('buffalo.answer.hauled'), '#c9a97a', 15);
  return true;
}

function decideHerd() {
  choose(
    [
      { t: t('buffalo.choice.fetch') },
      { t: t('buffalo.choice.stay') },
    ],
    (index) => {
      const fetch = index === 0;
      state.buffalo.decided = true;
      state.buffalo.fetched = fetch;
      // Coming back across a bridge you built is the cooperation the doc asks for:
      // the world already has the bridge either way; what differs is the life.
      recordKarma(fetch ? 'compassion' : 'cling');
      animatePlayer();
      playChime();
      addFloater(
        player.x,
        player.y - 120,
        t(fetch ? 'buffalo.answer.fetch' : 'buffalo.answer.stay'),
        fetch ? '#cfe0b4' : '#d7bd8c',
        15,
      );
    },
  );
}

/** Standing in the far pasture: the life closes where the bridge leads. */
export function settlePasture() {
  animatePlayer();
  playChime();
  addFloater(FORD.pasture.x, FORD.pasture.y - 80, t('buffalo.pasture'), '#c9a97a', 15);
  return fordBridged();
}
