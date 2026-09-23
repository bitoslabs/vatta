'use strict';

import { MODE } from '../core/constants.js';
import { clamp } from '../core/math.js';
import { pick } from '../core/rng.js';
import { state } from '../core/state.js';
import { on, EVENTS } from '../core/events.js';
import { playBell, playChime, playThud } from '../systems/audio.js';
import { addScreenNote, ageScreenNotes } from '../systems/effects.js';
import { t, tList } from '../systems/i18n.js';
import { $ } from '../ui/dom.js';
import { fade } from '../ui/feedback.js';
import { cam } from './camera.js';
import { startMemory } from './memory.js';

const TUNING = Object.freeze({
  radiusMin: 40,
  radiusMax: 228,
  inhaleRate: 92,
  exhaleRate: 46,
  passiveDecay: 0.55,
  goodInhaleMin: 148,
  goodInhaleMax: 178,
  goodExhaleMin: 50,
  goodExhaleMax: 80,
  breatheReward: 13,
  disturbPenalty: 14,
  disturbRelief: 6.5,
  targetMind: 100,
});

/** Meditation minigame state. */
export const med = {
  phase: 'in',
  r: 60,
  mind: 32,
  breaths: 0,
  holding: false,
  holdingPrev: false,
  t: 0,
  disturb: null,
  nextD: 5,
  done: false,
};

let holdingInput = false;
let hushTimer = null;

const disturbCard = $('#disturbCard');
const disturbText = $('#disturbText');
const medOverlay = $('#medOverlay');
const bRing = $('#bRing');
const mindFill = $('#mindFill');
const medMsg = $('#medMsg');
const breathDots = $('#breathDots');

export function initMeditation() {
  on(EVENTS.SPACE_DOWN, () => { if (state.mode === MODE.MEDITATION) holdingInput = true; });
  on(EVENTS.SPACE_UP, () => { holdingInput = false; });
  on(EVENTS.DISMISS, () => {
    if (state.mode === MODE.MEDITATION && med.disturb) dismissDisturb(true);
  });
}

export function startMeditation() {
  state.story.meditated = true;
  fade(true, () => {
    state.mode = MODE.MEDITATION;
    Object.assign(med, {
      phase: 'in',
      r: 60,
      mind: 32,
      breaths: 0,
      holding: false,
      holdingPrev: false,
      t: 0,
      disturb: null,
      nextD: 5,
      done: false,
    });
    medOverlay.classList.remove('hidden');
    $('#hud').classList.add('hidden');
    $('#ctrlHint').classList.add('hidden');
    disturbCard.classList.add('hidden');
    holdingInput = false;
    fade(false);
  });
}

function dismissDisturb(pressed) {
  if (!med.disturb) return;
  if (pressed) {
    med.mind -= TUNING.disturbPenalty;
    cam.shake = 0.7;
    playThud();
    addScreenNote(t('meditation.chaseAway'));
    med.nextD = Math.max(2.5, med.nextD * 0.65);
  }
  med.disturb = null;
  disturbCard.classList.add('hidden');
}

export function updateMeditation(dt) {
  med.t += dt;
  med.holding = holdingInput;
  med.mind -= TUNING.passiveDecay * dt;

  if (med.phase === 'in') {
    med.r += med.holding ? TUNING.inhaleRate * dt : -TUNING.exhaleRate * dt;
    med.r = clamp(med.r, TUNING.radiusMin, TUNING.radiusMax);

    if (med.holdingPrev && !med.holding) {
      const good = med.r >= TUNING.goodInhaleMin && med.r <= TUNING.goodInhaleMax;
      med.phase = 'out';
      if (good) {
        med.mind += TUNING.breatheReward;
        med.breaths++;
        playChime();
        addScreenNote(t('meditation.goodBreath'));
        if (med.disturb) med.mind += 2.5;
      } else if (med.r < TUNING.goodInhaleMin) {
        med.mind += 3;
        addScreenNote(t('meditation.notFull'));
      } else {
        med.mind += 3;
        addScreenNote(t('meditation.held'));
      }
    }
  } else {
    med.r -= 64 * dt;
    med.r = clamp(med.r, TUNING.radiusMin, TUNING.radiusMax);
    if (!med.holdingPrev && med.holding) {
      const good = med.r >= TUNING.goodExhaleMin && med.r <= TUNING.goodExhaleMax;
      med.phase = 'in';
      if (good) {
        playChime();
        if (med.disturb) med.mind += 2.5;
      } else {
        addScreenNote(t('meditation.rushed'));
      }
    }
  }
  med.holdingPrev = med.holding;

  updateDisturbance(dt);

  if (med.mind < 0) med.mind = 0;
  if (med.mind >= TUNING.targetMind && !med.done) completeMeditation();

  renderMeditation();
  ageScreenNotes(dt);
}

function updateDisturbance(dt) {
  if (!med.disturb) {
    med.nextD -= dt;
    if (med.nextD <= 0 && med.mind < 96) {
      med.disturb = { text: pick(tList('meditation.disturb')), t: 0 };
      disturbText.textContent = med.disturb.text;
      disturbCard.classList.remove('hidden');
      disturbCard.style.opacity = 1;
    }
    return;
  }

  med.disturb.t += dt;
  if (med.disturb.t > TUNING.disturbRelief) {
    dismissDisturb(false);
  } else {
    disturbCard.style.opacity = clamp(1 - (med.disturb.t - 5) / 1.5, 0, 1);
  }
}

function completeMeditation() {
  med.done = true;
  mindFill.style.width = '100%';
  clearTimeout(hushTimer);
  hushTimer = setTimeout(() => {
    fade(true, () => {
      medOverlay.classList.add('hidden');
      playBell();
      startMemory();
      // The screen was faded to black for the transition; bring the memory
      // scene back into view (without this the whole scene stays black).
      fade(false);
    });
  }, 700);
}

function renderMeditation() {
  bRing.style.width = `${med.r * 2}px`;
  bRing.style.height = `${med.r * 2}px`;
  bRing.style.opacity = 0.55 + Math.min(0.45, med.mind / 240);
  mindFill.style.width = `${clamp(med.mind, 0, 100)}%`;
  medMsg.textContent = med.phase === 'in'
    ? t('meditation.inhale')
    : t('meditation.exhale');

  const dots = breathDots.children;
  for (let i = 0; i < dots.length; i++) dots[i].classList.toggle('on', i < med.breaths);
}
