'use strict';

import { MODE, SALA } from '../core/constants.js';
import { clamp, lerp } from '../core/math.js';
import { rng } from '../core/rng.js';
import { state } from '../core/state.js';
import { playDissolve } from '../systems/audio.js';
import { addSpark } from '../systems/effects.js';
import { t } from '../systems/i18n.js';
import { say } from '../ui/dialogue.js';
import { fade, toast } from '../ui/feedback.js';
import { STATUS } from '../entities/ghost-status.js';
import { ghost } from '../entities/ghost.js';
import { player } from '../entities/player.js';
import { cam } from './camera.js';

const GHOST_APPROACH_TIME = 3.6;
const RELEASE_END_TIME = 6.2;
const SPARK_COUNT = 46;

let releaseSeq = null;

/** Begin the liberation sequence in the world scene. */
export function startRelease() {
  state.mode = MODE.WORLD;
  state.story.released = true;
  player.x = SALA.x - 60;
  player.y = SALA.y + 130;
  cam.x = player.x;
  cam.y = player.y;
  ghost.active = true;
  ghost.mode = STATUS.HUNT;
  ghost.x = SALA.x - 200;
  ghost.y = SALA.y - 180;
  ghost.alpha = 1;
  releaseSeq = { t: 0, burst: false };
  fade(false);
}

/** Advance the liberation sequence. No-op when it is not running. */
export function updateRelease(dt) {
  if (!releaseSeq) return;
  releaseSeq.t += dt;
  const elapsed = releaseSeq.t;

  if (elapsed < GHOST_APPROACH_TIME) {
    ghost.x = lerp(ghost.x, player.x, dt * 0.8);
    ghost.y = lerp(ghost.y, player.y - 40, dt * 0.8);
    ghost.alpha = clamp(1 - elapsed / GHOST_APPROACH_TIME, 0.15, 1);
  } else if (!releaseSeq.burst) {
    releaseSeq.burst = true;
    playDissolve();
    cam.shake = 0.4;
    for (let i = 0; i < SPARK_COUNT; i++) {
      addSpark({
        x: ghost.x,
        y: ghost.y,
        vx: (rng() - 0.5) * 90,
        vy: -20 - rng() * 70,
        t: 0,
        life: 1.6 + rng() * 1.4,
      });
    }
    ghost.active = false;
  }

  if (elapsed > RELEASE_END_TIME) {
    releaseSeq = null;
    state.story.releaseDone = true;
    say('release', () => toast(t('toast.dawn.title'), t('toast.dawn.sub')));
  }
}
