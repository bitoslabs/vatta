'use strict';

import { MODE, WORLD } from '../core/constants.js';
import { clamp, dist } from '../core/math.js';
import { state } from '../core/state.js';
import { playBell, playThud } from '../systems/audio.js';
import { addFloater } from '../systems/effects.js';
import { t, tList } from '../systems/i18n.js';
import { enrageGhost, ghost, placeGhost } from '../entities/ghost.js';
import { player } from '../entities/player.js';
import { choose } from '../ui/choices.js';
import { say } from '../ui/dialogue.js';
import { showEndScreen } from '../ui/end-screen.js';
import { toast } from '../ui/feedback.js';
import { cam } from './camera.js';
import { registerChapterHandler } from './chapters.js';

const RETALIATE_RANGE = 150;
const BODHI = { x: 360, y: 1690 };
const BODHI_RADIUS = 140;
const ANGER_SPAWN = { x: 2500, y: 1450 };
const ENRAGE_SECONDS = 6;
const RETALIATE_FEAR = 0.28;

/** Chapter-local progress flags, reset every time the chapter starts. */
let ch2 = { hinted: false, pacified: false, answered: false, ended: false };

export function startChapter2() {
  ch2 = { hinted: false, pacified: false, answered: false, ended: false };
  placeGhost(ANGER_SPAWN.x, ANGER_SPAWN.y);
  say('ch2.intro', () => toast(t('ch2.toast.start.title'), t('ch2.toast.start.sub')));
}

export function updateChapter2(dt) {
  if (state.mode !== MODE.WORLD) return;
  state.interact = null;

  // Offer "retaliate" while anger is within reach — the tempting wrong move.
  if (ghost.active && !state.dialogueOpen
    && dist(player.x, player.y, ghost.x, ghost.y) < RETALIATE_RANGE) {
    state.interact = { fn: retaliate, labelKey: 'prompt.retaliate' };
  }

  // Teach the counter-move once, the first time anger comes close.
  if (!ch2.hinted && ghost.active && !state.dialogueOpen
    && dist(player.x, player.y, ghost.x, ghost.y) < 420) {
    ch2.hinted = true;
    addFloater(player.x, player.y - 150, t('ch2.hint.endure'), '#e9d9a8', 14.5);
  }

  if (!ch2.pacified && !ghost.active && ghost.pacified) {
    ch2.pacified = true;
    playBell();
    toast(t('ch2.toast.pacified.title'), t('ch2.toast.pacified.sub'));
    say('ch2.pacified');
  }

  if (ch2.pacified && !ch2.answered
    && dist(player.x, player.y, BODHI.x, BODHI.y) < BODHI_RADIUS) {
    ch2.answered = true;
    say('ch2.bodhi', askCompassion);
  }
}

function retaliate() {
  if (!ghost.active) return;
  state.stats.retaliations++;
  state.fear = clamp(state.fear + RETALIATE_FEAR, 0, 1);
  enrageGhost(ENRAGE_SECONDS);
  cam.shake = 0.5;
  playThud();
  addFloater(player.x, player.y - 120, t('ch2.floater.retaliate'), '#d98a6a', 16);
}

/** The world answers: revenge rekindles anger, avoidance defers it, letting go frees it. */
function askCompassion() {
  const options = tList('ch2.question').map((text) => ({ t: text }));
  choose(options, (index) => {
    if (index === 0) {
      reviveAnger();
      say('ch2.answerCold', askCompassion);
    } else if (index === 2) {
      say('ch2.answerCool', askCompassion);
    } else {
      say('ch2.answerWarm', () => {
        ch2.ended = true;
        showEndScreen();
      });
    }
  });
}

/** Anger returns, faster — the player must walk back out and sit with it again. */
function reviveAnger() {
  ch2.pacified = false;
  ch2.answered = false;
  placeGhost(
    clamp(player.x + 760, 120, WORLD.w - 120),
    clamp(player.y - 40, 120, WORLD.h - 120),
  );
  enrageGhost(ENRAGE_SECONDS);
  state.fear = clamp(state.fear + 0.3, 0, 1);
  addFloater(player.x, player.y - 150, t('ch2.floater.angerReturns'), '#d98a6a', 15);
}

registerChapterHandler(2, { start: startChapter2, update: updateChapter2 });
