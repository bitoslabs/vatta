'use strict';

import { INTERACT, MODE, SALA, TEMPLE, WORLD } from '../core/constants.js';
import { clamp, dist } from '../core/math.js';
import { state } from '../core/state.js';
import { on, EVENTS } from '../core/events.js';
import { playBell, playCall, playThud } from '../systems/audio.js';
import { addFloater } from '../systems/effects.js';
import { t } from '../systems/i18n.js';
import { recordKarma } from '../systems/karma.js';
import { GATES } from '../world/world-data.js';
import { STATUS } from '../entities/ghost-status.js';
import { ghost, spawnGhostNearPlayer } from '../entities/ghost.js';
import { player } from '../entities/player.js';
import { say } from '../ui/dialogue.js';
import { showEndScreen } from '../ui/end-screen.js';
import { endFlashFade, flashFade, toast } from '../ui/feedback.js';
import { cam } from './camera.js';
import { registerChapterHandler } from './chapters.js';
import { startMeditation } from './meditation.js';
import { updateRelease } from './release.js';

const MONK = { x: 700, y: 1450 };
const CALL_INTERVAL = 6.5;
const GATE_CALL_RANGE = 950;
const GATE_LOOP_RADIUS = 54;
const GATE_LOOP_FEAR = 0.45;

let callCd = 6;

export function startChapter1() {
  say('intro', () => toast(t('toast.night.title'), t('toast.night.sub')));
}

export function updateChapter1(dt) {
  if (state.mode !== MODE.WORLD) return;
  const { story } = state;

  if (!story.left && player.x > 1135) {
    story.left = true;
    toast(t('toast.night.title'), t('toast.night.sub'));
    addFloater(player.x + 140, player.y - 120, t('floater.coldWind'), '#9aa898', 14);
  }

  if (!story.call && story.left && player.x > 1520) {
    story.call = true;
    addFloater(player.x + 300, player.y - 70, t('voice.callShort'), '#bfd9cd', 17);
    playCall(0.5);
    setTimeout(() => {
      addFloater(player.x + 330, player.y - 110, t('voice.callHome'), '#bfd9cd', 16);
      playCall(0.7);
    }, 2800);
    setTimeout(() => {
      spawnGhostNearPlayer(-420, 40);
      if (!story.hintSati) {
        story.hintSati = true;
        addFloater(player.x, player.y - 150, t('hint.sati'), '#e9d9a8', 15);
      }
    }, 4600);
  }

  if (ghost.active && !story.salaReached) maybePlayGateCall(dt);

  if (state.fear > GATE_LOOP_FEAR) {
    for (const gate of GATES) {
      if (dist(player.x, player.y, gate.x, gate.y) < GATE_LOOP_RADIUS) {
        loopBack(gate);
        break;
      }
    }
  }

  if (!story.salaReached && dist(player.x, player.y, SALA.x, SALA.y) < INTERACT.salaTrigger) {
    story.salaReached = true;
    // Past this point the sala's own fade takes over; mindfulness can no
    // longer dissolve the ghost and it will not respawn.
    ghost.mindDissolve = false;
    ghost.respawnOnFade = false;
    ghost.mode = STATUS.FADE;
    ghost.fade = 1.6;
    state.checkpoint = { x: SALA.x - 90, y: SALA.y + 110 };
    playBell();
    toast(t('toast.sala.title'), t('toast.sala.sub'));
    addFloater(player.x, player.y - 130, t('floater.sala'), '#e9d9a8', 14.5);
  }

  updateRelease(dt);

  if (story.releaseDone && !story.ended
    && dist(player.x, player.y, TEMPLE.x, TEMPLE.y) < INTERACT.templeReturn) {
    story.ended = true;
    say('final', showEndScreen);
  }

  updateInteractions();
}

function maybePlayGateCall(dt) {
  callCd -= dt;
  if (callCd > 0) return;

  let nearest = null;
  let best = Infinity;
  for (const gate of GATES) {
    const d = dist(player.x, player.y, gate.x, gate.y);
    if (d < best) {
      best = d;
      nearest = gate;
    }
  }
  if (nearest && best < GATE_CALL_RANGE) {
    addFloater(nearest.x, nearest.y - 40, t('voice.callShort'), '#bfd9cd', 16);
    playCall(clamp((nearest.x - player.x) / 600, -1, 1));
  }
  callCd = CALL_INTERVAL;
}

function updateInteractions() {
  state.interact = null;
  if (state.mode !== MODE.WORLD || state.dialogueOpen) return;

  const nearMonk = dist(player.x, player.y, MONK.x, MONK.y) < INTERACT.monk;
  const nearSala = dist(player.x, player.y, SALA.x, SALA.y) < INTERACT.sala;

  if (nearMonk && !state.story.released) {
    state.interact = { fn: talkMonk, labelKey: 'prompt.talkMonk' };
  } else if (state.story.salaReached && !state.story.meditated && nearSala) {
    state.interact = { fn: startMeditation, labelKey: 'prompt.meditate' };
  }

  if (state.interact && state.story.released && nearMonk) {
    state.interact = { fn: talkMonk, labelKey: 'prompt.talkMonk' };
  }
}

function talkMonk() {
  if (!state.story.talked) {
    say('monkFirst', () => { state.story.talked = true; });
  } else if (state.story.released) {
    say('monkAfterRelease');
  } else {
    say('monkRepeat');
  }
}

function loopBack(gate) {
  state.stats.lost++;
  flashFade();
  setTimeout(() => {
    const dx = gate.from.x - gate.x;
    const dy = gate.from.y - gate.y;
    const d = Math.hypot(dx, dy);
    player.x = clamp(gate.from.x + (dx / d) * 70, 40, WORLD.w - 40);
    player.y = clamp(gate.from.y + (dy / d) * 70, 40, WORLD.h - 40);
    state.fear = clamp(state.fear + 0.22, 0, 1);
    if (ghost.active) {
      ghost.x = player.x - 600;
      ghost.y = player.y + 120;
      ghost.stun = 1;
    }
    cam.x = player.x;
    cam.y = player.y;
    playThud();
    addFloater(player.x, player.y - 120, t('floater.loop'), '#cbb8a8', 16);
    if (!state.story.hintLoop) {
      state.story.hintLoop = true;
      addFloater(player.x, player.y - 160, t('hint.loop'), '#e9d9a8', 14.5);
    }
    endFlashFade();
  }, 260);
}

registerChapterHandler(1, { start: startChapter1, update: updateChapter1 });

// Dissolving the ghost through mindfulness is the chapter's wholesome act.
on(EVENTS.GHOST_PACIFIED, (cause) => {
  if (state.chapter === 1 && cause === 'mind') recordKarma('mindful');
});
