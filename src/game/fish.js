'use strict';

import { MODE } from '../core/constants.js';
import { state } from '../core/state.js';
import { player } from '../entities/player.js';
import { playBird, playThud } from '../systems/audio.js';
import { playChime } from '../systems/audio.js';
import { addFloater } from '../systems/effects.js';
import { t } from '../systems/i18n.js';
import { recordKarma } from '../systems/karma.js';
import { saveRun } from '../systems/save.js';
import { hasEffect, inheritedEffect, recordEffect } from '../systems/world-effects.js';
import { choose } from '../ui/choices.js';
import { FISH } from '../world/world-data.js';

const STRIKE_RADIUS = 48;
const GUIDED_RADIUS = 32;
const bird = { phase: 'rest', time: 2.2, safe: null, hits: 0, struck: false, inherited: false };

function peckRadius() {
  return bird.inherited ? GUIDED_RADIUS : STRIKE_RADIUS;
}

export function fryGuided() {
  return hasEffect('fry-guided');
}

export function fishBirdState() {
  return { phase: bird.phase, time: bird.time, hits: bird.hits,
    x: FISH.shallows.x, y: FISH.shallows.y, radius: peckRadius(), guided: bird.inherited };
}

export function resetFish() {
  state.fish = { decided: false, guided: false };
}

export function resetFishBird() {
  bird.phase = 'rest';
  bird.time = 2.2;
  bird.safe = null;
  bird.hits = 0;
  bird.struck = false;
  bird.inherited = inheritedEffect('fry-guided');
}

function peck(distance) {
  if (bird.phase !== 'strike' || bird.struck || distance > peckRadius()) return;
  const safe = bird.safe || FISH.refuge;
  player.x = safe.x;
  player.y = safe.y;
  player.vx = 0;
  player.vy = 0;
  bird.hits++;
  bird.struck = true;
}

/** Bird at a shallow bend. It does not record karma or end a life. */
export function updateFishBird(dt) {
  const practising = state.explore?.active === true;
  if (!(state.lifeMode || practising) || state.formId !== 'fish' || (state.teacher && !practising)) {
    resetFishBird();
    return;
  }
  if (state.mode !== MODE.WORLD || document.hidden) return;
  const distance = Math.hypot(player.x - FISH.shallows.x, player.y - FISH.shallows.y);
  if (distance > 290) {
    bird.phase = 'rest';
    bird.time = 2.2;
    bird.safe = null;
    bird.struck = false;
    return;
  }
  if (distance > peckRadius() + 30) bird.safe = { x: player.x, y: player.y };
  if (state.dialogueOpen || state.choiceOpen) return;
  bird.time -= dt;
  if (bird.time > 0) {
    peck(distance);
    return;
  }
  if (bird.phase === 'rest') {
    bird.phase = 'warning';
    bird.time = 1.4;
    bird.struck = false;
    playBird();
  } else if (bird.phase === 'warning') {
    bird.phase = 'strike';
    bird.time = 0.4;
    playThud();
  } else {
    bird.phase = 'rest';
    bird.time = 2.4;
  }
  peck(distance);
}

/** An optional act at the upstream channel, before the shallow bend. */
export function updateFish() {
  if (state.mode !== MODE.WORLD || state.formId !== 'fish') return;
  if (state.dialogueOpen || state.choiceOpen || state.interact) return;
  if (hasEffect('fry-guided') || state.fish?.decided) return;
  if (Math.hypot(player.x - FISH.channel.x, player.y - FISH.channel.y) > 85) return;
  state.interact = { fn: chooseFryRoute, labelKey: 'prompt.fishChannel' };
}

function chooseFryRoute() {
  choose([
    { t: t('fish.choice.guide') },
    { t: t('fish.choice.swim') },
  ], (index) => {
    state.fish.decided = true;
    state.fish.guided = index === 0;
    if (index !== 0) { saveRun(); return; }
    recordKarma('give');
    recordEffect('fry-guided');
    playChime();
    addFloater(FISH.channel.x, FISH.channel.y - 60, t('effect.fryGuided'), '#a7d5d5', 15);
    saveRun();
  });
}
