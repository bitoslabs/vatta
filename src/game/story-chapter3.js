'use strict';

import { MODE, SALA } from '../core/constants.js';
import { clamp, dist } from '../core/math.js';
import { state } from '../core/state.js';
import { on, EVENTS } from '../core/events.js';
import { playBell, playChime } from '../systems/audio.js';
import { addFloater } from '../systems/effects.js';
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
import { nearestLure, resetLures, takeLure } from './lures.js';

const LOOT_RANGE = 90;
const SALA_TRIGGER = 340;
const GHOST_BASE_SPEED = 130;
const GHOST_SPEED_PER_LOOT = 24;

/**
 * Chapter 3 — craving.
 *
 * The ghost does not hunt; it *baits*. Treasure is laid on the road, and only
 * grasping awakens the ghost. Taking feeds it; letting go stills it.
 */
let ch3 = { awakened: false, resolved: false, ended: false };

export function startChapter3() {
  ch3 = { awakened: false, resolved: false, ended: false };
  resetLures();
  state.luresVisible = true;
  state.stats.looted = 0;
  say('ch3.intro', () => toast(t('ch3.toast.start.title'), t('ch3.toast.start.sub')));
}

export function updateChapter3(dt) {
  if (state.mode !== MODE.WORLD) return;

  // Every hoarded thing makes the following ghost faster.
  ghost.profile.baseSpeed = GHOST_BASE_SPEED + state.stats.looted * GHOST_SPEED_PER_LOOT;

  state.interact = null;
  if (state.dialogueOpen) return;

  const lure = nearestLure(player.x, player.y, LOOT_RANGE);
  if (lure) {
    state.interact = { fn: () => loot(lure), labelKey: 'prompt.loot' };
  }

  if (!ch3.resolved && dist(player.x, player.y, SALA.x, SALA.y) < SALA_TRIGGER) {
    ch3.resolved = true;
    arriveAtSala();
  }
}

function loot(lure) {
  if (!takeLure(lure)) return;
  state.stats.looted++;
  recordKarma('steal');
  playChime();
  addFloater(player.x, player.y - 120, t('ch3.floater.looted'), '#e9c46a', 16);

  if (!ghost.active) {
    placeGhost(clamp(player.x + 700, 120, 4400), clamp(player.y - 60, 120, 2860));
  }
  if (!ch3.awakened) {
    ch3.awakened = true;
    addFloater(player.x, player.y - 160, t('ch3.floater.awake'), '#d9a86a', 15);
  }
}

/** Let go of everything carried. Returns how many pieces were released. */
function dropAll() {
  const count = state.stats.looted;
  if (count <= 0) return 0;

  state.stats.looted = 0;
  playBell();
  addFloater(player.x, player.y - 130, t('ch3.floater.dropped'), '#bfd9cd', 16);

  ghost.enraged = 0;
  if (ghost.active) {
    ghost.stun = 2;
    ghost.mode = STATUS.FADE;
    ghost.fade = 1.4;
  }
  return count;
}

function arriveAtSala() {
  if (state.stats.looted <= 0) {
    recordKarma('precept');
    toast(t('ch3.toast.clean.title'), t('ch3.toast.clean.sub'));
    say('ch3.clean', finish);
    return;
  }
  say('ch3.hoard', askCraving);
}

function askCraving() {
  choose(
    [{ t: t('ch3.choice.drop') }, { t: t('ch3.choice.keep') }],
    (index) => {
      if (index === 0) {
        dropAll();
        recordKarma('letgo');
        say('ch3.answerDrop', finish);
      } else {
        recordKarma('cling');
        say('ch3.answerKeep', finish);
      }
    },
  );
}

function finish() {
  if (ch3.ended) return;
  ch3.ended = true;
  state.luresVisible = false;
  showEndScreen();
}

registerChapterHandler(3, { start: startChapter3, update: updateChapter3 });

// X releases the hoard at any time — the affordable way out of craving.
on(EVENTS.DISMISS, () => {
  if (state.chapter !== 3 || state.mode !== MODE.WORLD) return;
  if (state.stats.looted <= 0) return;
  dropAll();
  recordKarma('give');
  toast(t('ch3.toast.dropped.title'), t('ch3.toast.dropped.sub'));
});
