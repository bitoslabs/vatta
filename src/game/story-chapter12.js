'use strict';

import { MODE, SALA, WORLD } from '../core/constants.js';
import { clamp, dist } from '../core/math.js';
import { state } from '../core/state.js';
import { on, EVENTS } from '../core/events.js';
import { playBell, playChime, playThud } from '../systems/audio.js';
import { addFloater } from '../systems/effects.js';
import { isMindful } from '../systems/input.js';
import { t } from '../systems/i18n.js';
import { recordKarma } from '../systems/karma.js';
import { STATUS } from '../entities/ghost-status.js';
import { addGhost, ghost, ghosts, placeGhostAt } from '../entities/ghost.js';
import { player } from '../entities/player.js';
import { choose } from '../ui/choices.js';
import { say } from '../ui/dialogue.js';
import { showEndScreen } from '../ui/end-screen.js';
import { toast } from '../ui/feedback.js';
import { cam } from './camera.js';
import { registerChapterHandler } from './chapters.js';

const MAX_SPIRITS = 4;
const SPLIT_RANGE = 420;
const SPLIT_INTERVAL = 2.2;
const FAR = 540;
const NEAR = 200;
const RELEASE_TIME = 4.5;
const STRIKE_RANGE = 160;
const SALA_TRIGGER = 340;

/**
 * Chapter 12 — the dividing spirit (Part 2).
 *
 * This one breaks the rule the player has learned: mindfulness held up close
 * does not still it — it *splits* it. Suppression multiplies. The way through
 * is to step away and see it from a distance, and then the whole swarm thins.
 */
let ch12 = { splitTimer: 0, release: 0, resolved: false, asked: false, hinted: false, ended: false };

export function startChapter12() {
  ch12 = { splitTimer: 0, release: 0, resolved: false, asked: false, hinted: false, ended: false };

  ghost.mindDissolve = false;
  ghost.tint = 'rgba(180,180,200,.5)';
  placeGhostAt(ghost, clamp(player.x + 520, 120, WORLD.w - 120), clamp(player.y - 80, 120, WORLD.h - 120));

  say('ch12.intro', () => toast(t('ch12.toast.start.title'), t('ch12.toast.start.sub')));
}

export function updateChapter12(dt) {
  if (state.mode !== MODE.WORLD) return;
  state.interact = null;

  const mind = isMindful();
  const nearest = closestDistance();

  if (ghosts.length && nearest < STRIKE_RANGE && !state.dialogueOpen && !state.choiceOpen) {
    state.interact = { fn: strike, labelKey: 'prompt.retaliate' };
  }

  if (!ch12.resolved) {
    // Holding mindfulness up close feeds it, and it divides.
    if (mind && nearest < SPLIT_RANGE && ghosts.length < MAX_SPIRITS) {
      ch12.splitTimer += dt;
      if (ch12.splitTimer >= SPLIT_INTERVAL) {
        ch12.splitTimer = 0;
        split();
      }
    } else {
      ch12.splitTimer = Math.max(0, ch12.splitTimer - dt * 0.5);
    }

    // Seeing it from a distance is the way through.
    if (mind && nearest > FAR) {
      ch12.release += dt / RELEASE_TIME;
      if (ch12.release >= 1) releaseSwarm();
    } else if (nearest < NEAR) {
      state.fear = clamp(state.fear + 0.3 * dt, 0, 1);
      ch12.release = Math.max(0, ch12.release - dt * 0.6);
    } else {
      ch12.release = Math.max(0, ch12.release - dt * 0.2);
    }
  }

  if (state.dialogueOpen || state.choiceOpen) return;

  if (ch12.resolved && !ch12.asked && dist(player.x, player.y, SALA.x, SALA.y) < SALA_TRIGGER) {
    ch12.asked = true;
    say('ch12.arrive', askSwarm);
  } else if (!ch12.resolved && !ch12.hinted && dist(player.x, player.y, SALA.x, SALA.y) < SALA_TRIGGER) {
    ch12.hinted = true;
    addFloater(player.x, player.y - 150, t('ch12.floater.blocked'), '#c9bcd6', 15);
  }
}

function closestDistance() {
  let nearest = Infinity;
  for (const spirit of ghosts) {
    if (!spirit.active) continue;
    nearest = Math.min(nearest, dist(player.x, player.y, spirit.x, spirit.y));
  }
  return nearest;
}

function split() {
  const source = ghosts[0];
  const angle = ghosts.length * 2.1;
  const spirit = addGhost({
    tint: source.tint,
    mindDissolve: false,
    profile: {
      baseSpeed: 118,
      fearSpeedBonus: 45,
      mindSpeedBase: 62,
      mindSpeedFearBonus: 30,
      mindDissolveTime: 99,
      enrageSpeedFactor: 1.2,
      standOff: 0,
    },
  });
  placeGhostAt(
    spirit,
    clamp(player.x + Math.cos(angle) * 240, 120, WORLD.w - 120),
    clamp(player.y + Math.sin(angle) * 240, 120, WORLD.h - 120),
  );
  for (const g of ghosts) g.mindHold = 0;

  playChime();
  addFloater(player.x, player.y - 150, t('ch12.floater.split', { n: ghosts.length }), '#c9bcd6', 15);
}

function releaseSwarm() {
  ch12.resolved = true;
  for (const spirit of ghosts) {
    if (!spirit.active) continue;
    spirit.mode = STATUS.FADE;
    spirit.fade = 1.6;
  }
  recordKarma('letgo');
  playBell();
  toast(t('ch12.toast.release.title'), t('ch12.toast.release.sub'));
}

function strike() {
  state.stats.retaliations++;
  state.fear = clamp(state.fear + 0.28, 0, 1);
  recordKarma('harm');
  cam.shake = 0.5;
  playThud();
  addFloater(player.x, player.y - 120, t('ch12.floater.strike'), '#c98a7a', 15);
  if (ghosts.length < MAX_SPIRITS) split();
}

function askSwarm() {
  choose(
    [
      { t: t('ch12.choice.suppress') },
      { t: t('ch12.choice.distance') },
      { t: t('ch12.choice.unsure') },
    ],
    (index) => {
      if (index === 0) {
        recordKarma('cling');
        say('ch12.answerCold', finish);
      } else if (index === 2) {
        say('ch12.answerCool', askSwarm);
      } else {
        recordKarma('letgo');
        say('ch12.answerWarm', finish);
      }
    },
  );
}

function finish() {
  ch12.ended = true;
  showEndScreen();
}

registerChapterHandler(12, { start: startChapter12, update: updateChapter12 });

on(EVENTS.GHOST_PACIFIED, (cause) => {
  if (state.chapter === 12 && cause === 'mind') recordKarma('mindful');
});
