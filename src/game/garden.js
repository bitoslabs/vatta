'use strict';

import { MODE } from '../core/constants.js';
import { dist } from '../core/math.js';
import { state } from '../core/state.js';
import { playChime } from '../systems/audio.js';
import { currentBiomeId } from '../systems/biome.js';
import { addFloater } from '../systems/effects.js';
import { t } from '../systems/i18n.js';
import { recordKarma } from '../systems/karma.js';
import { hasEffect, recordEffect } from '../systems/world-effects.js';
import { digFeature, dynamicFeatures, nextFeatureIndex } from '../systems/worldgen.js';
import { GARDEN, gardenGate } from '../world/world-data.js';
import { animatePlayer, player } from '../entities/player.js';

/**
 * The light garden (design §7, "สวนแสงไม่เที่ยง — สวนบานแล้วโรย ทางแสงมีอายุ ·
 * ปล่อยดอกไม้เก่าเพื่อให้เมล็ดเดินทางต่อ").
 *
 * The gate is a shadow, and the light that lies over it comes and goes
 * (systems/light.js) — so the way in has an age. Inside, the beds are in flower or
 * already ripe, and the garden's ask is the plane's own line: release an old bed
 * and its seeds travel on, into every later world, as flowers along this plane's
 * road (`seeds-released`, `state.world.released`). Nothing here is a wall; the
 * door is the light, and the question is whether to let go.
 */
/**
 * How near a bed a life must be to let it go. Deliberately tighter than the
 * garden being's circle: the beds stand a step out from the middle, so walking to
 * the middle is how you meet the being, and walking up to a bed is how you release
 * it (see game/world-update.js for why the place outranks the being).
 */
const BED_RANGE = 70;

export function gardenSite() {
  return GARDEN;
}

export function gatePoint() {
  return gardenGate();
}

export function seedsReleased() {
  return hasEffect('seeds-released');
}

/** Bloom beds earlier lives let go of (state.world.released). */
export function releasedBeds() {
  return Array.isArray(state.world.released) ? state.world.released : [];
}

export function hasReleased() {
  return state.garden?.released === true;
}

/** Every life arrives with the beds as the seed left them. */
export function resetGarden() {
  state.garden = { released: false };
}

/** The one act: an old bed, let go. */
export function updateGarden() {
  if (state.mode !== MODE.WORLD) return;
  if (state.dialogueOpen || state.choiceOpen || state.interact) return;
  if (currentBiomeId() !== 'light-garden') return;
  if (hasReleased()) return;

  const bed = dynamicFeatures().find((feature) => (
    feature.type === 'bloombed' && feature.ripe === true
    && dist(player.x, player.y, feature.x, feature.y) <= BED_RANGE
  ));
  if (!bed) return;
  state.interact = { fn: () => releaseBloom(bed), labelKey: 'prompt.releaseBloom' };
}

/**
 * Let an old bed go. The flowers leave this world's bed and appear as seeds
 * travelling — the seedfall stays where the bed was, and later worlds carry the
 * flowers along the plane's road.
 */
export function releaseBloom(feature) {
  if (!feature || feature.ripe !== true || hasReleased()) return false;
  if (!digFeature(feature.i)) return false;

  const where = { x: feature.x, y: feature.y };
  state.world.released = [...releasedBeds(), where];
  state.garden.released = true;
  recordEffect('seeds-released');
  recordKarma('letgo');
  if (state.dynamic && Array.isArray(state.dynamic.features)) {
    state.dynamic.features.push({
      i: nextFeatureIndex(), site: 'garden', type: 'seedfall', fixed: true, x: where.x, y: where.y, r: 26,
    });
  }
  animatePlayer();
  playChime();
  addFloater(player.x, player.y - 120, t('garden.bed.released'), '#e6d8a8', 15);
  return true;
}
