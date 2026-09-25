'use strict';

import { MODE } from '../core/constants.js';
import { state } from '../core/state.js';
import { t, tList } from '../systems/i18n.js';
import { getKarma } from '../systems/karma.js';
import { getRealm } from '../systems/samsara.js';
import { unlockedCount } from '../systems/path.js';
import { keptPreceptCount } from '../systems/precepts.js';
import { formNameKey } from '../content/forms.js';
import { getActiveSlot, getRunName } from '../systems/save.js';
import { chapterById } from '../game/chapters.js';
import { readsTide, tideReadout } from '../game/crab.js';
import { groundReadout, readsGround } from '../game/snail.js';
import { forageReadout, readsForage } from '../game/boar.js';
import { currentBiomeId } from '../systems/biome.js';
import { isLit, lightTrend } from '../systems/light.js';
import { carriedCount } from '../game/market.js';
import { waypoint } from '../systems/waypoint.js';
import { currentBiome } from '../systems/biome.js';
import { $ } from './dom.js';

const hudEl = $('#hud');
const fearLabel = $('#fearLabel');
const fearFill = $('#fearFill');
const mindHint = $('#mindHint');
const karmaReadout = $('#karmaReadout');
const realmReadout = $('#realmReadout');
const pathReadout = $('#pathReadout');
const preceptReadout = $('#preceptReadout');
const formReadout = $('#formReadout');
const runReadout = $('#runReadout');
const tideReadoutEl = $('#tideReadout');
const groundReadoutEl = $('#groundReadout');
const forageReadoutEl = $('#forageReadout');
const lightReadoutEl = $('#lightReadout');
const carryReadoutEl = $('#carryReadout');
const waypointReadoutEl = $('#waypointReadout');

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
    realmReadout.textContent = t('hud.realm', {
      realm: t(getRealm().nameKey),
      biome: t(currentBiome().nameKey),
    });
    pathReadout.textContent = t('hud.path.count', { count: unlockedCount() });
    preceptReadout.textContent = t('hud.precept.count', { kept: keptPreceptCount() });
    formReadout.textContent = t('hud.form', { form: t(formNameKey(state.formId)) });

    // A body that lives by the water can read the water (systems/tide.js).
    if (tideReadoutEl) {
      const shows = readsTide();
      tideReadoutEl.classList.toggle('hidden', !shows);
      if (shows) {
        const tide = tideReadout();
        tideReadoutEl.textContent = `${t(tide.key)} · ${t(tide.depth)}`;
      }
    }

    // A body that needs the damp can read the ground (systems/moisture.js).
    if (groundReadoutEl) {
      const shows = readsGround();
      groundReadoutEl.classList.toggle('hidden', !shows);
      if (shows) {
        const ground = groundReadout();
        groundReadoutEl.textContent = `${t(ground.key)} · ${t(ground.trend)}`;
      }
    }

    // A rooting body can read how far its meal has come (game/boar.js).
    if (forageReadoutEl) {
      const shows = readsForage();
      forageReadoutEl.classList.toggle('hidden', !shows);
      if (shows) {
        const forage = forageReadout();
        forageReadoutEl.textContent = t('hud.forage', { eaten: forage.eaten, need: forage.need });
      }
    }

    // The garden's light: it comes and goes, and its gate is only there while it
    // is on. A body in that plane can read which way it is going (systems/light.js).
    if (lightReadoutEl) {
      const shows = currentBiomeId() === 'light-garden';
      lightReadoutEl.classList.toggle('hidden', !shows);
      if (shows) {
        lightReadoutEl.textContent = `${t(isLit() ? 'hud.light.lit' : 'hud.light.dim')} · ${t(lightTrend() === 'brightening' ? 'hud.light.brightening' : 'hud.light.fading')}`;
      }
    }

    // The market's own reading: what a body is carrying decides what opens and
    // what lets it through (game/market.js). A rule you cannot see is a trap.
    if (carryReadoutEl) {
      const shows = currentBiomeId() === 'craving-market';
      carryReadoutEl.classList.toggle('hidden', !shows);
      if (shows) {
        const held = carriedCount();
        carryReadoutEl.textContent = held === 0
          ? t('hud.carry.empty')
          : t('hud.carry.held', { n: held });
      }
    }

    // The memory being followed (systems/waypoint.js): which place, and where it is.
    if (waypointReadoutEl) {
      const mark = waypoint();
      waypointReadoutEl.classList.toggle('hidden', !mark);
      if (mark) {
        const where = mark.site ? t(`site.${mark.site}`) : '';
        waypointReadoutEl.textContent = where
          ? `${t('hud.waypoint')} · ${where}`
          : t('hud.waypoint');
      }
    }

    // Which run this is: the slot, the chapter, and the name it was given.
    if (runReadout) {
      const def = chapterById(state.chapter);
      runReadout.textContent = t('hud.run', {
        slot: getActiveSlot(),
        chapter: def ? `${state.chapter}. ${t(def.nameKey)}` : state.chapter,
        name: getRunName() || t('hud.run.unnamed'),
      });
    }

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
