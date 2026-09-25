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
import { dynamicFeatures, nextFeatureIndex } from '../systems/worldgen.js';
import { assembleWebSite } from '../world/rooms.js';
import { WEB } from '../world/world-data.js';
import { animatePlayer, player } from '../entities/player.js';

/**
 * The spider's web (docs/animal-lives-story.md reserve table, "แมงมุม — ขึงใยเชื่อม
 * จุดยึด · สร้างสะพานให้ตัวเล็กโดยไม่ปิดทางผู้อื่น").
 *
 * A ring of fissure surrounds a hollow, and nothing without leap or flight crosses
 * it. Two posts stand either side, and this life's one act is to spin a thread
 * between them: the thread is a *bridge for small bodies* — a crossing that did not
 * exist before — and it takes nothing from anyone (a leaping body crossed before and
 * still does; `validateSpiderRoute` proves both halves).
 *
 * The life itself finishes by using what it made: with the thread spun, the spider
 * walks it into the hollow. A later life finds the thread old and strong, and any
 * small body may cross by it (systems/world-effects.js `web-spun`).
 */
const ANCHOR_RANGE = 120;

export function webSite() {
  return WEB;
}

export function webSpun() {
  return hasEffect('web-spun');
}

/** Threads earlier lives spun (state.world.webs), for the world's assembly. */
export function threads() {
  return Array.isArray(state.world.webs) ? state.world.webs : [];
}

export function hasSpun() {
  return state.spider?.spun === true;
}

/** Every life arrives with the anchors bare, whatever earlier lives spun. */
export function resetSpider() {
  state.spider = { spun: false };
}

export function spiderGoal() {
  if (!hasSpun() && !webSpun()) {
    return { x: WEB.anchorOut.x, y: WEB.anchorOut.y, r: ANCHOR_RANGE, kind: 'web-post' };
  }
  return { x: WEB.hollow.x, y: WEB.hollow.y, r: WEB.hollowRadius, kind: 'web-hollow' };
}

/** The one act: tie a thread between the posts. */
export function updateSpider() {
  if (state.mode !== MODE.WORLD) return;
  if (state.dialogueOpen || state.choiceOpen || state.interact) return;
  if (getForm().lifeGoal !== 'web') return;
  if (hasSpun() || webSpun()) return;
  if (dist(player.x, player.y, WEB.anchorOut.x, WEB.anchorOut.y) > ANCHOR_RANGE) return;
  state.interact = { fn: spinWeb, labelKey: 'prompt.spinWeb' };
}

export function spinWeb() {
  if (hasSpun()) return false;
  state.spider.spun = true;
  state.world.webs = [...threads(), { from: 'out' }];
  // The thread is there at once, in this life's own world: the bridge exists the
  // moment it is spun, not only for the lives that come after.
  if (state.dynamic && Array.isArray(state.dynamic.features)) {
    for (const bead of assembleWebSite({ webs: [{ from: 'out' }] })) {
      if (bead.type !== 'webline') continue;
      state.dynamic.features.push({ ...bead, i: nextFeatureIndex() });
    }
  }
  recordEffect('web-spun');
  recordKarma('give');
  animatePlayer();
  playChime();
  addFloater(player.x, player.y - 110, t('spider.answer.spun'), '#cfd8e6', 15);
  return true;
}

/** In the hollow: the life closes on the far side of what it made. */
export function settleHollow() {
  animatePlayer();
  playChime();
  addFloater(WEB.hollow.x, WEB.hollow.y - 60, t('spider.answer.hollow'), '#cfd8e6', 15);
  return webSpun();
}

/** Only a small body needs the thread, and a spider knows it. */
export function crossesByThread() {
  const abilities = getForm().abilities || {};
  return abilities.small === true || abilities.climbing === true;
}

export function anchorNear() {
  return dynamicFeatures().some((feature) => (
    feature.type === 'anchor' && dist(player.x, player.y, feature.x, feature.y) <= ANCHOR_RANGE
  ));
}
