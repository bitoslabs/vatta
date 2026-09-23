'use strict';

import { MODE } from '../core/constants.js';
import { state } from '../core/state.js';
import { t, tList } from '../systems/i18n.js';
import { getKarma } from '../systems/karma.js';
import { getRealm } from '../systems/samsara.js';
import { unlockedCount } from '../systems/path.js';
import { keptPreceptCount } from '../systems/precepts.js';
import { $ } from './dom.js';

const hudEl = $('#hud');
const fearLabel = $('#fearLabel');
const fearFill = $('#fearFill');
const mindHint = $('#mindHint');
const karmaReadout = $('#karmaReadout');
const realmReadout = $('#realmReadout');
const pathReadout = $('#pathReadout');
const preceptReadout = $('#preceptReadout');

const FEAR_LOW = 0.3;
const FEAR_HIGH = 0.6;
const MIND_HINT_ROTATE_MS = 1600;

/** Sync the HUD DOM with the current meter / mindfulness state. */
export function updateHud(mind) {
  if (state.mode === MODE.WORLD && !state.story.released) {
    hudEl.classList.remove('hidden');
    fearLabel.textContent = t(state.meterKey || 'hud.fear');
    fearFill.style.width = `${state.fear * 100}%`;
    fearFill.style.background = state.fear > FEAR_HIGH
      ? '#b0685a'
      : state.fear > FEAR_LOW ? '#c2a878' : '#e8e2d0';

    const karma = getKarma();
    karmaReadout.textContent = t('hud.karma', {
      merit: karma.merit,
      demerit: karma.demerit,
      kusala: karma.kusala,
      akusala: karma.akusala,
    });
    realmReadout.textContent = t('hud.realm', { realm: t(getRealm().nameKey) });
    pathReadout.textContent = t('hud.path.count', { count: unlockedCount() });
    preceptReadout.textContent = t('hud.precept.count', { kept: keptPreceptCount() });

    if (mind) {
      const quotes = tList(state.mindHintKey || 'hud.mind');
      mindHint.style.opacity = 1;
      mindHint.textContent = quotes[Math.floor(performance.now() / MIND_HINT_ROTATE_MS) % quotes.length];
    } else {
      mindHint.style.opacity = 0;
    }
  } else if (state.story.released) {
    hudEl.classList.add('hidden');
  }
}
