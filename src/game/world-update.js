'use strict';

import { FEAR, MODE } from '../core/constants.js';
import { clamp, dist, lerp } from '../core/math.js';
import { state } from '../core/state.js';
import { playHeart } from '../systems/audio.js';
import { updateEffects } from '../systems/effects.js';
import { isMindful } from '../systems/input.js';
import { getPathModifiers } from '../systems/path.js';
import { getRealmModifier } from '../systems/samsara.js';
import { ghost, updateGhosts } from '../entities/ghost.js';
import { inSafeZone, player, updatePlayer } from '../entities/player.js';
import { cam } from './camera.js';
import { updateEchoes } from './echoes.js';
import { updateGuardian } from './npc.js';
import { updateStory } from './story.js';
import { updateTeacherPanel } from '../ui/teacher-panel.js';

let heartCd = 0;

/** Per-frame update of the explorable world scene. */
export function updateWorld(dt) {
  state.stats.time += dt;
  const frozen = state.dialogueOpen || state.mode === MODE.TITLE;
  const mind = isMindful();

  const { running } = updatePlayer(dt);

  // Classroom mode: free roam, no spirits, no fail states — just the map.
  if (state.teacher) {
    updateTeacherPanel();
    updateCamera(dt);
    updateEffects(dt);
    return;
  }

  updateFear(dt, { frozen, mind, running });
  updateHeartbeat(dt);

  if (!state.story.released) updateGhosts(dt, mind, frozen);

  updateStory(dt);
  updateGuardian();
  updateEchoes();
  updateCamera(dt);
  updateEffects(dt);
}

function updateFear(dt, { frozen, mind, running }) {
  if (state.story.released || frozen) {
    state.fear = 0;
    return;
  }

  const modifier = getRealmModifier();
  const path = getPathModifiers();
  const gain = modifier.fearGain;
  // Unlocked factors of the path let the mind settle faster.
  const relief = modifier.safeRelief * (1 + path.fearRelief);

  if (running && player.moving) state.fear += FEAR.runGain * gain * dt;
  if (ghost.active) {
    const d = dist(player.x, player.y, ghost.x, ghost.y);
    if (d < 420) state.fear += FEAR.ghostGain * gain * dt * (1.6 - d / 640);
  }
  if (mind) state.fear -= FEAR.mindRelief * relief * dt;
  else if (!player.moving) state.fear -= FEAR.idleRelief * relief * dt;
  else state.fear -= FEAR.walkRelief * relief * dt;
  if (inSafeZone(player.x, player.y)) state.fear -= FEAR.safeRelief * relief * dt;

  state.fear = clamp(state.fear, 0, 1);
}

function updateHeartbeat(dt) {
  if (state.fear <= FEAR.heartThreshold || state.mode !== MODE.WORLD) return;
  heartCd -= dt;
  if (heartCd <= 0) {
    playHeart();
    heartCd = lerp(FEAR.heartSlowPeriod, FEAR.heartFastPeriod, state.fear);
  }
}

function updateCamera(dt) {
  const smoothing = 1 - Math.pow(0.0012, dt);
  cam.x = lerp(cam.x, player.x, smoothing);
  cam.y = lerp(cam.y, player.y, smoothing);
  cam.shake = Math.max(0, cam.shake - dt * 2);
}
