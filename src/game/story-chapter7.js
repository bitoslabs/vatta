'use strict';

import { MODE, TEMPLE } from '../core/constants.js';
import { dist } from '../core/math.js';
import { state } from '../core/state.js';
import { t } from '../systems/i18n.js';
import { recordKarma, getKarma } from '../systems/karma.js';import { player } from '../entities/player.js';
import { choose } from '../ui/choices.js';
import { say } from '../ui/dialogue.js';
import { showEndScreen } from '../ui/end-screen.js';
import { toast } from '../ui/feedback.js';
import { registerChapterHandler } from './chapters.js';
import { startMeditation } from './meditation.js';

const TEMPLE_TRIGGER = 340;
const STATION_SILA = 3400;
const STATION_SAMADHI = 2560;
const STATION_PANNA = 1900;

/**
 * Chapter 7 — the way beyond (ศีล · สมาธิ · ปัญญา).
 *
 * No ghost walks this road. Three stations test the whole training:
 *   1. ศีล     — do not harm, and do not take
 *   2. สมาธิ   — sit and steady the mind (the meditation minigame)
 *   3. ปัญญา   — see that nothing, not even "self", is to be held
 * The ending leaves the cycle only when the final release is real *and* the
 * accumulated kamma is not outweighed by its harm.
 */
let ch7 = { stations: {}, seated: false, ended: false };

export function startChapter7() {
  ch7 = { stations: {}, seated: false, ended: false };
  say('ch7.intro');
}

export function updateChapter7(dt) {
  if (state.mode !== MODE.WORLD) return;
  state.interact = null;
  if (state.dialogueOpen || state.choiceOpen) return;

  if (!ch7.stations.sila && player.x <= STATION_SILA && player.x > STATION_SAMADHI) {
    stationSila();
  } else if (!ch7.stations.samadhi && player.x <= STATION_SAMADHI && player.x > STATION_PANNA) {
    stationSamadhi();
  } else if (!ch7.stations.panna && player.x <= STATION_PANNA) {
    stationPanna();
  }

  if (!ch7.ended && dist(player.x, player.y, TEMPLE.x, TEMPLE.y) < TEMPLE_TRIGGER) {
    ch7.ended = true;
    say('ch7.final', askFinal);
  }
}

function stationSila() {
  ch7.stations.sila = true;
  toast(t('ch7.toast.sila.title'), t('ch7.toast.sila.sub'));
  say('ch7.sila', () => {
    choose(
      [
        { t: t('ch7.sila.choice.help') },
        { t: t('ch7.sila.choice.pass') },
        { t: t('ch7.sila.choice.take') },
        { t: t('ch7.sila.choice.lie') },
      ],
      (index) => {
        if (index === 0) {
          recordKarma('give');
          say('ch7.silaHelp');
        } else if (index === 2) {
          recordKarma('steal');
          say('ch7.silaTake');
        } else if (index === 3) {
          recordKarma('lie');
          say('ch7.silaLie');
        } else {
          say('ch7.silaPass');
        }
      },
    );
  });
}

function stationSamadhi() {
  ch7.stations.samadhi = true;
  toast(t('ch7.toast.samadhi.title'), t('ch7.toast.samadhi.sub'));
  startMeditation({
    onComplete: () => {
      state.mode = MODE.WORLD;
      recordKarma('meditate');
      ch7.seated = true;
    },
  });
}

function stationPanna() {
  ch7.stations.panna = true;
  say('ch7.panna', askPanna);
}

function askPanna() {
  choose(
    [
      { t: t('ch7.panna.choice.anicca') },
      { t: t('ch7.panna.choice.self') },
      { t: t('ch7.panna.choice.unknown') },
    ],
    (index) => {
      if (index === 0) {
        recordKarma('letgo');
        say('ch7.pannaWarm');
      } else if (index === 2) {
        say('ch7.pannaCool', askPanna);
      } else {
        recordKarma('cling');
        say('ch7.pannaCold', askPanna);
      }
    },
  );
}

function askFinal() {
  choose(
    [
      { t: t('ch7.final.choice.stay') },
      { t: t('ch7.final.choice.free') },
      { t: t('ch7.final.choice.unknown') },
    ],
    (index) => {
      if (index === 0) {
        recordKarma('cling');
        state.liberated = false;
        say('ch7.answerCold', finish);
      } else if (index === 2) {
        say('ch7.answerUnknown', askFinal);
      } else {
        recordKarma('letgo');
        // Leaving the cycle asks for a real release, and for kamma that is not
        // outweighed by harm across the whole run.
        const karma = getKarma();
        state.liberated = karma.merit >= karma.demerit;
        say('ch7.answerWarm', finish);
      }
    },
  );
}

function finish() {
  ch7.ended = true;
  showEndScreen();
}

registerChapterHandler(7, { start: startChapter7, update: updateChapter7 });
