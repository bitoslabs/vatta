'use strict';

import { MODE } from '../core/constants.js';
import { dist } from '../core/math.js';
import { state } from '../core/state.js';
import { playChime } from '../systems/audio.js';
import { currentBiomeId } from '../systems/biome.js';
import { addFloater } from '../systems/effects.js';
import { t } from '../systems/i18n.js';
import { recordKarma } from '../systems/karma.js';
import { saveRun } from '../systems/save.js';
import { hasEffect, recordEffect } from '../systems/world-effects.js';
import { dynamicFeatures } from '../systems/worldgen.js';
import { MARKET, marketAxis, marketGate } from '../world/world-data.js';
import { animatePlayer, player } from '../entities/player.js';
import { encountersHere } from './npc-encounters.js';
import { choose } from '../ui/choices.js';

/**
 * The market alley (design §7, "ตลาดความอยาก — ร้านแตกแขนงเมื่อรับข้อเสนอบ่อย ·
 * ผ่านช่องทางออกด้วยมือที่ว่าง").
 *
 * The alley's gate lets through only empty hands, and its curtains open on what
 * those hands are holding: take an offer and the next shop branches open; carry
 * nothing and the gate is the only way on. A life can always put down what it
 * picked up (`prompt.putDown`), so the way is always there — and a life that
 * passes the gate empty-handed *after* having filled its hands is the one the
 * market remembers: the first curtain does not stand in the next world
 * (`hands-emptied`).
 */
const GATE_RANGE = 90;

function market() {
  if (!state.market) state.market = { carried: [], takenAt: [], touched: false, passed: false };
  return state.market;
}

export function marketSite() {
  return MARKET;
}

export function gatePoint() {
  return marketGate();
}

export function carriedThings() {
  return [...market().carried];
}

export function carriedCount() {
  return market().carried.length;
}

/** Has this life filled its hands at all? */
export function hasTouched() {
  return market().touched === true;
}

/** Has this life passed the gate with empty hands after filling them? */
export function hasPassedEmpty() {
  return market().passed === true;
}

export function handsEmptied() {
  return hasEffect('hands-emptied');
}

/** Every life arrives with its own hands, and an alley that is still curtained. */
export function resetMarket() {
  state.market = { carried: [], takenAt: [], touched: false, passed: false };
}

/** The two acts: take what a stall offers, or put it all down. */
export function updateMarket() {
  if (state.mode !== MODE.WORLD) return;
  if (currentBiomeId() !== 'craving-market') return;

  // Passing the gate empty-handed, after having carried something: the let-go the
  // market remembers. Checked before the prompts, because nothing should hide it.
  const gate = gatePoint();
  const life = market();
  if (life.touched && life.carried.length === 0 && life.passed !== true
    && dist(player.x, player.y, gate.x, gate.y) <= GATE_RANGE) {
    life.passed = true;
    recordEffect('hands-emptied');
    recordKarma('precept');
    saveRun();
    addFloater(player.x, player.y - 120, t('market.answer.passed'), '#bfd9cd', 15);
  }

  if (state.dialogueOpen || state.choiceOpen || state.interact) return;

  const gift = dynamicFeatures().find((feature) => (
    feature.type === 'gift' && !life.takenAt.includes(spotKey(feature))
    && dist(player.x, player.y, feature.x, feature.y) <= MARKET.offerRange
  ));
  if (gift) {
    state.interact = { fn: () => takeOffer(gift), labelKey: 'prompt.takeOffer' };
    return;
  }
  const receiver = encountersHere().find((entry) => entry.id === 'market-stall');
  if (carriedCount() > 0 && receiver
    && dist(player.x, player.y, receiver.x, receiver.y) <= receiver.r) {
    state.interact = { fn: offerToShare, labelKey: 'prompt.shareOffer' };
    return;
  }
  if (carriedCount() > 0) {
    state.interact = { fn: putDown, labelKey: 'prompt.putDown' };
  }
}

function spotKey(feature) {
  return `${Math.round(feature.x)},${Math.round(feature.y)}`;
}

/** Take what a stall is offering: the hands get heavier, and a curtain opens. */
export function takeOffer(gift) {
  if (!gift || gift.type !== 'gift') return false;
  const life = market();
  const key = spotKey(gift);
  if (life.takenAt.includes(key)) return false;
  life.takenAt.push(key);
  life.carried.push(key);
  life.touched = true;
  recordKarma('cling');
  saveRun();
  animatePlayer();
  playChime();
  addFloater(player.x, player.y - 120, t('market.answer.taken', { n: life.carried.length }), '#e9c46a', 15);
  return true;
}

/** Has this life already taken what stands there? (For the drawing and the reading.) */
export function giftTaken(feature) {
  if (!feature) return false;
  return market().takenAt.includes(spotKey(feature));
}

/** Put everything down. Always possible, so the way through is always there. */
export function putDown() {
  const life = market();
  const had = life.carried.length;
  if (had === 0) return false;
  life.carried = [];
  saveRun();
  animatePlayer();
  addFloater(player.x, player.y - 120, t('market.answer.putDown', { n: had }), '#bfd9cd', 14);
  return true;
}

/** Give one held offer to the hungry being in the next chamber. */
export function shareOffer() {
  const life = market();
  if (life.carried.length === 0) return false;
  life.carried.pop();
  if (recordEffect('offer-shared')) recordKarma('give');
  animatePlayer();
  playChime();
  addFloater(player.x, player.y - 120, t('market.answer.shared'), '#bfd9cd', 15);
  saveRun();
  return true;
}

function offerToShare() {
  choose([
    { t: t('market.choice.share') },
    { t: t('market.choice.keep') },
  ], (index) => {
    if (index === 0) shareOffer();
  });
}
