'use strict';

import { MODE } from '../core/constants.js';
import { dist } from '../core/math.js';
import { state } from '../core/state.js';
import { playChime, playThud } from '../systems/audio.js';
import { currentBiomeId } from '../systems/biome.js';
import { addFloater } from '../systems/effects.js';
import { t } from '../systems/i18n.js';
import { recordKarma } from '../systems/karma.js';
import { saveRun } from '../systems/save.js';
import { hasEffect, recordEffect } from '../systems/world-effects.js';
import { choose } from '../ui/choices.js';
import { ASURA, asuraGate } from '../world/world-data.js';
import { animatePlayer, player } from '../entities/player.js';

/**
 * The asura city's plaza (design §7, "นครอสุร — หอคอยและสะพานเปลี่ยนเมื่อมีการแย่ง
 * หรือแบ่งทรัพยากร · หยุดสร้างหอแข่งกันแล้วสร้างสะพานร่วม").
 *
 * Two rival towers flank the plaza gate, and each has eaten the span that used to
 * lie over it: what is left is a drop no walker crosses. The city's one question
 * is here, at the stones — raise your own tower higher, or lay your stones back
 * down as a *shared* span. Laying them opens the plaza for every life after this
 * one (`span-built`, `state.world.spans`), and the shrine inside is a place to
 * rest only because of it (systems/rest.js).
 */
const STONE_RANGE = 170;

export function asuraSite() {
  return ASURA;
}

export function gatePoint() {
  return asuraGate();
}

export function spanBuilt() {
  return hasEffect('span-built');
}

/** Stones a past life laid back over the gate (state.world.spans). */
export function spans() {
  return Array.isArray(state.world.spans) ? state.world.spans : [];
}

export function hasDecided() {
  return state.asuraCity?.decided === true;
}

export function didSpan() {
  return state.asuraCity?.spanned === true;
}

/** Every life arrives at a broken gate, whatever earlier lives did with it. */
export function resetAsuraCity() {
  state.asuraCity = { decided: false, spanned: false };
}

/** The one question, asked at the stones of the broken gate. */
export function updateAsuraCity() {
  if (state.mode !== MODE.WORLD) return;
  if (state.dialogueOpen || state.choiceOpen || state.interact) return;
  if (currentBiomeId() !== 'asura-city') return;
  if (hasDecided()) return;

  const gate = gatePoint();
  if (dist(player.x, player.y, gate.x, gate.y) > STONE_RANGE) return;
  state.interact = { fn: decideSpan, labelKey: 'prompt.shareStones' };
}

function decideSpan() {
  choose(
    [
      { t: t('asura.choice.span') },
      { t: t('asura.choice.tower') },
    ],
    (index) => {
      const lay = index === 0;
      state.asuraCity.decided = true;
      state.asuraCity.spanned = lay;
      if (lay) {
        // The stones go back down, and they are everyone's way in from now on.
        state.world.spans = [{ x: gatePoint().x, y: gatePoint().y }];
        recordEffect('span-built');
        recordKarma('give');
        playThud();
      } else {
        // Your own tower is taller; the gate stays broken.
        recordKarma('cling');
        playChime();
      }
      saveRun();
      animatePlayer();
      addFloater(
        player.x,
        player.y - 130,
        t(lay ? 'asura.answer.span' : 'asura.answer.tower'),
        lay ? '#b9c3d0' : '#c8a2c8',
        15,
      );
    },
  );
}

/** The shrine the span leads to: restful once a life laid the stones back. */
export function shrineRestAt(x, y) {
  if (!spanBuilt()) return false;
  return dist(x, y, ASURA.shrine.x, ASURA.shrine.y) < ASURA.restRadius;
}
