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
import { isDamp, moistureLevel, moistureTrend } from '../systems/moisture.js';
import { choose } from '../ui/choices.js';
import { DAMP } from '../world/world-data.js';
import { animatePlayer, player } from '../entities/player.js';

/**
 * The snail's life: the dry ridge and the garden (docs/animal-lives-story.md story
 * table, "หอยทาก — ผ่านพื้นที่ชื้นและพักเมื่อแห้ง · รู้ข้อจำกัดและจังหวะของตัวเอง").
 *
 * The ridge rings the garden, and it is a wall to exactly one body in the forest:
 * a snail, which may cross dry ground only while the ground is damp
 * (systems/moisture.js). So the life moves at the world's pace rather than the
 * player's — wait for the damp, cross, wait again — and nothing is lost by
 * waiting, which is the doc's "knowing your limits and pace". At the garden the
 * one question is whether to leave the crossing damp behind it: `damp-trail` keeps
 * the ridge crossable at any hour for every snail that follows.
 */
export function dampSite() {
  return DAMP;
}

export function trailKept() {
  return hasEffect('damp-trail');
}

export function hasDecided() {
  return state.snail?.decided === true;
}

export function didLeaveTrail() {
  return state.snail?.leftTrail === true;
}

/** Every life arrives on ground whose dampness it must wait for. */
export function resetSnail() {
  state.snail = { decided: false, leftTrail: false };
}

/** Can this body cross dry ground right now? (The rule the ridge enforces.) */
export function canCrossDry() {
  const abilities = getForm().abilities || {};
  if (abilities.needsDamp !== true) return true;
  return isDamp() || trailKept();
}

/**
 * Where a snail's life goes next: the garden across the ridge (a guide), then the
 * garden again as the ending, once the trail has been decided about.
 */
export function snailGoal() {
  if (!hasDecided()) return { x: DAMP.garden.x, y: DAMP.garden.y, r: DAMP.gardenRadius, kind: 'garden-guide' };
  return { x: DAMP.garden.x, y: DAMP.garden.y, r: DAMP.gardenRadius, kind: 'damp-garden' };
}

/** The one question the garden asks. */
export function updateSnail() {
  if (state.mode !== MODE.WORLD) return;
  if (state.dialogueOpen || state.choiceOpen || state.interact) return;
  if (getForm().lifeGoal !== 'damp') return;
  if (hasDecided()) return;

  if (dist(player.x, player.y, DAMP.garden.x, DAMP.garden.y) < DAMP.gardenRadius + 30) {
    state.interact = { fn: decideTrail, labelKey: 'prompt.leaveTrail' };
  }
}

function decideTrail() {
  choose(
    [
      { t: t('snail.choice.trail') },
      { t: t('snail.choice.own') },
    ],
    (index) => {
      const leave = index === 0;
      state.snail.decided = true;
      state.snail.leftTrail = leave;
      if (leave) {
        recordEffect('damp-trail');
        recordKarma('give');
      }
      saveRun();
      animatePlayer();
      playChime();
      addFloater(
        player.x,
        player.y - 110,
        t(leave ? 'snail.answer.trail' : 'snail.answer.own'),
        leave ? '#a8c6b4' : '#c9c0a8',
        15,
      );
    },
  );
}

/** In the garden: the life closes at its own pace. */
export function settleGarden() {
  animatePlayer();
  playChime();
  addFloater(DAMP.garden.x, DAMP.garden.y - 70, t('snail.garden'), '#a8c6b4', 15);
  return trailKept();
}

/**
 * What the ground is doing, for the readout: a body that needs the damp can tell
 * whether it may set out, and which way the weather is going.
 */
export function groundReadout() {
  const level = moistureLevel();
  const trend = moistureTrend();
  if (isDamp()) return { key: 'hud.ground.damp', trend: trend === 'wetting' ? 'hud.ground.wetting' : 'hud.ground.drying', level };
  return { key: 'hud.ground.dry', trend: trend === 'wetting' ? 'hud.ground.wetting' : 'hud.ground.drying', level };
}

/** Only a body that lives by the damp reads it. */
export function readsGround() {
  return getForm().abilities?.needsDamp === true;
}
