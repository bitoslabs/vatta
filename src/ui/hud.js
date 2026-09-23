'use strict';

import { MODE } from '../core/constants.js';
import { state } from '../core/state.js';
import { tList } from '../systems/i18n.js';
import { $ } from './dom.js';

const hudEl = $('#hud');
const fearFill = $('#fearFill');
const mindHint = $('#mindHint');

const FEAR_LOW = 0.3;
const FEAR_HIGH = 0.6;
const MIND_HINT_ROTATE_MS = 1600;

/** Sync the HUD DOM with the current fear / mindfulness state. */
export function updateHud(mind) {
  if (state.mode === MODE.WORLD && !state.story.released) {
    hudEl.classList.remove('hidden');
    fearFill.style.width = `${state.fear * 100}%`;
    fearFill.style.background = state.fear > FEAR_HIGH
      ? '#b0685a'
      : state.fear > FEAR_LOW ? '#c2a878' : '#e8e2d0';

    if (mind) {
      const quotes = tList('hud.mind');
      mindHint.style.opacity = 1;
      mindHint.textContent = quotes[Math.floor(performance.now() / MIND_HINT_ROTATE_MS) % quotes.length];
    } else {
      mindHint.style.opacity = 0;
    }
  } else if (state.story.released) {
    hudEl.classList.add('hidden');
  }
}
