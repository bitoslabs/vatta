'use strict';

import { MODE, TEMPLE } from '../core/constants.js';
import { clamp, dist } from '../core/math.js';
import { state } from '../core/state.js';
import { playBell, playThud } from '../systems/audio.js';
import { addFloater } from '../systems/effects.js';
import { isMindful } from '../systems/input.js';
import { t } from '../systems/i18n.js';
import { recordKarma } from '../systems/karma.js';
import { STATUS } from '../entities/ghost-status.js';
import { ghost, placeGhost } from '../entities/ghost.js';
import { player } from '../entities/player.js';
import { choose } from '../ui/choices.js';
import { say } from '../ui/dialogue.js';
import { showEndScreen } from '../ui/end-screen.js';
import { toast } from '../ui/feedback.js';
import { registerChapterHandler } from './chapters.js';

const NEAR = 240;          // closer than this = clinging grows
const FAR = 430;           // farther than this + mindfulness = release grows
const RELEASE_TIME = 4.5;  // seconds of distance + mindfulness needed
const EMBRACE_RANGE = 150; // the tempting "hold on" action
const TEMPLE_TRIGGER = 340;

/**
 * Chapter 4 — attachment / impermanence.
 *
 * The spirit wears a familiar face and holds its distance (it never catches
 * you). Clinging is what hurts: coming close feeds it, holding on (E) feeds it.
 * The way through is to step away and, mindful, see that nothing stays the same.
 */
let ch4 = { release: 0, resolved: false, ended: false };

export function startChapter4() {
  ch4 = { release: 0, resolved: false, ended: false };
  placeGhost(clamp(player.x - 260, 120, 4400), clamp(player.y + 40, 120, 2860));
  say('ch4.intro', () => toast(t('ch4.toast.start.title'), t('ch4.toast.start.sub')));
}

export function updateChapter4(dt) {
  if (state.mode !== MODE.WORLD) return;
  state.interact = null;
  if (state.dialogueOpen) return;
  if (!ghost.active && !ch4.resolved) return;

  const d = dist(player.x, player.y, ghost.x, ghost.y);
  const mind = isMindful();

  if (ghost.active && d < EMBRACE_RANGE) {
    state.interact = { fn: embrace, labelKey: 'prompt.embrace' };
  }

  if (!ch4.resolved) {
    if (!ghost.active) {
      // nothing to cling to
    } else if (d < NEAR) {
      // Closeness is clinging: the meter swells, release progress is lost.
      state.fear = clamp(state.fear + 0.35 * dt, 0, 1);
      ch4.release = Math.max(0, ch4.release - dt * 0.6);
    } else if (mind && d > FAR) {
      ch4.release += dt / RELEASE_TIME;
      if (ch4.release >= 1) release();
    } else {
      ch4.release = Math.max(0, ch4.release - dt * 0.25);
    }
  }

  if (ch4.resolved && !ch4.ended
    && dist(player.x, player.y, TEMPLE.x, TEMPLE.y) < TEMPLE_TRIGGER) {
    ch4.ended = true;
    say('ch4.final', askImpermanence);
  }
}

function embrace() {
  if (!ghost.active) return;
  state.stats.clung++;
  recordKarma('cling');
  state.fear = clamp(state.fear + 0.3, 0, 1);
  playThud();
  addFloater(player.x, player.y - 130, t('ch4.floater.embrace'), '#c8a2c8', 16);
  ch4.release = 0;
}

function release() {
  ch4.resolved = true;
  ghost.mode = STATUS.FADE;
  ghost.fade = 1.6;
  recordKarma('letgo');
  playBell();
  toast(t('ch4.toast.release.title'), t('ch4.toast.release.sub'));
  say('ch4.release');
}

function askImpermanence() {
  choose(
    [
      { t: t('ch4.choice.keep') },
      { t: t('ch4.choice.accept') },
      { t: t('ch4.choice.unknown') },
    ],
    (index) => {
      if (index === 0) {
        recordKarma('cling');
        say('ch4.answerCold', finish);
      } else if (index === 2) {
        say('ch4.answerCool', askImpermanence);
      } else {
        recordKarma('letgo');
        say('ch4.answerWarm', finish);
      }
    },
  );
}

function finish() {
  ch4.ended = true;
  showEndScreen();
}

registerChapterHandler(4, { start: startChapter4, update: updateChapter4 });
