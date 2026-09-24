'use strict';

import { FEAR, MODE } from '../core/constants.js';
import { clamp, dist, lerp } from '../core/math.js';
import { state } from '../core/state.js';
import { playHeart, playThud } from '../systems/audio.js';
import { addFloater, updateEffects } from '../systems/effects.js';
import { isMindful } from '../systems/input.js';
import { t } from '../systems/i18n.js';
import { getPathModifiers } from '../systems/path.js';
import { getForm } from '../systems/forms.js';
import { rng } from '../core/rng.js';
import { addSpark } from '../systems/effects.js';
import { dynamicFeatures, removeFeature } from '../systems/worldgen.js';
import { getRealmModifier } from '../systems/samsara.js';
import { ghost, updateGhosts } from '../entities/ghost.js';
import { animatePlayer, inSafeZone, player, updatePlayer } from '../entities/player.js';
import { cam } from './camera.js';
import { updateEchoes } from './echoes.js';
import { updateGuardian } from './npc.js';
import { updateEncounters } from './npc-encounters.js';
import { updateWorldMemory } from './world-memory.js';
import { updateAnt } from './ant.js';
import { updateFrog } from './frog.js';
import { updateStory } from './story.js';
import { updateTeacherPanel } from '../ui/teacher-panel.js';
import { updateTour } from '../systems/teacher.js';
import { updateLifeGoal } from '../systems/goals.js';

let heartCd = 0;

/** Per-frame update of the explorable world scene. */
export function updateWorld(dt) {
  state.stats.time += dt;
  const frozen = state.dialogueOpen || state.mode === MODE.TITLE;
  const mind = isMindful();

  const { running } = updatePlayer(dt);

  // Classroom mode: free roam, no spirits, no fail states — just the map.
  if (state.teacher) {
    updateTour();
    updateTeacherPanel();
    updateCamera(dt);
    updateEffects(dt);
    return;
  }

  updateFear(dt, { frozen, mind, running });
  updateHeartbeat(dt);

  if (!state.story.released) updateGhosts(dt, mind, frozen);

  updateStory(dt);
  leaveLightFootprints();
  leapSplashes();
  clearBouldersForStrongForms();
  updateLifeGoal();
  updateGuardian();
  updateEncounters();
  updateWorldMemory();
  updateAnt();
  updateFrog();
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
  const form = getForm();
  const gain = modifier.fearGain * (form.fearGain || 1);
  // Unlocked factors of the path — and a steady form — let the mind settle faster.
  const relief = modifier.safeRelief * (1 + path.fearRelief) * (form.fearGuard || 1);

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

/** เทวดา leaves a faint trail of light behind it (design §10). */
function leaveLightFootprints() {
  if (getForm().id !== 'deva' || !player.moving) return;
  if (rng() > 0.18) return;
  addSpark({
    x: player.x + (rng() - 0.5) * 12,
    y: player.y + (rng() - 0.5) * 6,
    vx: (rng() - 0.5) * 8,
    vy: -6 - rng() * 8,
    t: 0,
    life: 0.9 + rng() * 0.5,
  });
}

/**
 * A leap across the mire leaves water behind it (design §10): the frog's own
 * flourish, and the one cue that says the mud was crossable for this body.
 */
function leapSplashes() {
  if (getForm().abilities?.leap !== true || !player.moving) return;
  if (rng() > 0.16) return;
  const overMire = dynamicFeatures().some((feature) => (
    feature.type === 'mire' && dist(player.x, player.y, feature.x, feature.y) < feature.r + 26
  ));
  if (!overMire) return;
  addSpark({
    x: player.x + (rng() - 0.5) * 16,
    y: player.y + 4,
    vx: (rng() - 0.5) * 26,
    vy: -14 - rng() * 12,
    t: 0,
    life: 0.5 + rng() * 0.4,
  });
}

/** อสุร lifts boulders out of the road — a change later lives inherit. */
function clearBouldersForStrongForms() {
  if (!getForm().strong) return;
  for (const feature of dynamicFeatures()) {
    if (feature.type !== 'boulders') continue;
    if (dist(player.x, player.y, feature.x, feature.y) < feature.r + 14) {
      removeFeature(feature.i);
      animatePlayer();
      playThud();
      addFloater(player.x, player.y - 120, t('form.asura.lift'), '#c9bcd6', 15);
    }
  }
}

function updateCamera(dt) {
  const smoothing = 1 - Math.pow(0.0012, dt);
  cam.x = lerp(cam.x, player.x, smoothing);
  cam.y = lerp(cam.y, player.y, smoothing);
  cam.shake = Math.max(0, cam.shake - dt * 2);
}
