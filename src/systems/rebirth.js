'use strict';

import { getKarma } from './karma.js';

const APAYA_BY_TENDENCY = Object.freeze({
  anger: 'niraya',
  greed: 'peta',
  delusion: 'tiracchana',
  clinging: 'asurakaya',
});

const DEVA_LADDER = Object.freeze([
  { min: 45, realmId: 'paranimmita' },
  { min: 38, realmId: 'nimmanarati' },
  { min: 32, realmId: 'tusita' },
  { min: 26, realmId: 'yama' },
  { min: 20, realmId: 'tavatimsa' },
  { min: 14, realmId: 'catumaharajika' },
]);

const ARUPA_LADDER = Object.freeze([
  { min: 18, realmId: 'nevasannanasannayatana' },
  { min: 16, realmId: 'akincannayatana' },
  { min: 14, realmId: 'vinnanancayatana' },
]);

const RUPA_LADDER = Object.freeze([
  { min: 12, realmId: 'subhakinha' },
  { min: 10, realmId: 'abhassara' },
  { min: 9, realmId: 'appamanabha' },
  { min: 8, realmId: 'mahabrahma' },
  { min: 7, realmId: 'brahma-purohita' },
]);

function fromLadder(ladder, value, fallback) {
  for (const step of ladder) {
    if (value >= step.min) return step.realmId;
  }
  return fallback;
}

function sumNegative(tendencies) {
  return (tendencies.anger || 0)
    + (tendencies.greed || 0)
    + (tendencies.delusion || 0)
    + (tendencies.clinging || 0);
}

function dominantNegative(tendencies) {
  let best = null;
  let bestValue = 0;
  for (const key of ['anger', 'greed', 'delusion', 'clinging']) {
    const value = tendencies[key] || 0;
    if (value > bestValue) {
      bestValue = value;
      best = key;
    }
  }
  return best;
}

/**
 * Resolve where this run's karma would lead (คติ / จุดเกิดใหม่).
 *
 * A deliberate game abstraction of the canonical principles:
 *   - mastery of jhāna (concentration) → the Brahmā / formless planes
 *   - heavy unwholesome kamma (โทสะ โลภะ โมหะ อุปาทาน) → the woeful planes
 *   - wholesome kamma with merit (ทาน ศีล เมตตา) → human / deva planes
 */
export function resolveRebirth(karma = getKarma()) {
  const tendencies = karma.tendencies;
  const negative = sumNegative(tendencies);
  const net = karma.merit - karma.demerit;

  if (tendencies.concentration >= 10 && negative <= 4) {
    return {
      realmId: fromLadder(ARUPA_LADDER, tendencies.concentration, 'akasanancayatana'),
      reasonKey: 'rebirth.reason.concentration',
    };
  }

  if (tendencies.concentration >= 7 && negative <= 6) {
    return {
      realmId: fromLadder(RUPA_LADDER, tendencies.concentration, 'brahma-parisajja'),
      reasonKey: 'rebirth.reason.jhana',
    };
  }

  const demeritSurplus = karma.demerit - karma.merit;
  if (karma.demerit >= karma.merit && (negative >= 8 || demeritSurplus >= 10)) {
    const dominant = dominantNegative(tendencies);
    return {
      realmId: APAYA_BY_TENDENCY[dominant] || 'niraya',
      reasonKey: `rebirth.reason.${dominant || 'delusion'}`,
    };
  }

  if (net >= 14) {
    return {
      realmId: fromLadder(DEVA_LADDER, net, 'catumaharajika'),
      reasonKey: 'rebirth.reason.merit',
    };
  }

  return { realmId: 'manussa', reasonKey: 'rebirth.reason.human' };
}
