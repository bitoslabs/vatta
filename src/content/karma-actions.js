'use strict';

/**
 * Karma (กรรม) action table.
 *
 * In the teaching, kamma is *cetanā* — intention (เจตนา). Every act is therefore
 * described by three canonical aspects, all shown to the player:
 *
 *   root  — กุศล (kusala) or อกุศล (akusala)
 *   mūla  — the root it grows from:
 *             อกุศลมูล 3: โลภะ (lobha), โทสะ (dosa), โมหะ (moha)
 *             กุศลมูล 3:  อโลภะ (alobha), อโทสะ (adosa), อโมหะ (amoha)
 *   fruit — วิบาก: the merit (บุญ / puñña) or demerit (บาป / pāpa) it ripens into,
 *           with the tendency (อนุสัย) it reinforces.
 *
 * The rebirth resolver reads both the fruit and the roots, not the score alone.
 */
export const KARMA_ACTIONS = Object.freeze({
  give: { root: 'kusala', rootId: 'alobha', merit: 8, tendencies: { generosity: 2, metta: 1 } },
  precept: { root: 'kusala', rootId: 'amoha', merit: 6, tendencies: { sati: 1, generosity: 1 } },
  meditate: { root: 'kusala', rootId: 'amoha', merit: 10, tendencies: { concentration: 2, sati: 2 } },
  mindful: { root: 'kusala', rootId: 'amoha', merit: 6, tendencies: { sati: 2 } },
  compassion: { root: 'kusala', rootId: 'adosa', merit: 9, tendencies: { metta: 3 } },
  letgo: { root: 'kusala', rootId: 'alobha', merit: 14, tendencies: { metta: 2, clinging: -3, concentration: 1 } },

  harm: { root: 'akusala', rootId: 'dosa', demerit: 12, tendencies: { anger: 3 } },
  steal: { root: 'akusala', rootId: 'lobha', demerit: 10, tendencies: { greed: 3 } },
  lie: { root: 'akusala', rootId: 'moha', demerit: 8, tendencies: { delusion: 2 } },
  cling: { root: 'akusala', rootId: 'lobha', demerit: 7, tendencies: { clinging: 3 } },
  panic: { root: 'akusala', rootId: 'moha', demerit: 3, tendencies: { delusion: 1 } },
});

/** The six roots (มูล), in canonical order: unwholesome first, then wholesome. */
export const KARMA_ROOTS = Object.freeze({
  lobha: { group: 'akusala', labelKey: 'karma.root.lobha' },
  dosa: { group: 'akusala', labelKey: 'karma.root.dosa' },
  moha: { group: 'akusala', labelKey: 'karma.root.moha' },
  alobha: { group: 'kusala', labelKey: 'karma.root.alobha' },
  adosa: { group: 'kusala', labelKey: 'karma.root.adosa' },
  amoha: { group: 'kusala', labelKey: 'karma.root.amoha' },
});

export const ROOT_IDS = Object.freeze(Object.keys(KARMA_ROOTS));

/** Tendency keys in display order. */
export const TENDENCIES = Object.freeze([
  'anger',
  'greed',
  'delusion',
  'clinging',
  'metta',
  'sati',
  'generosity',
  'concentration',
]);

export const ACTION_IDS = Object.freeze(Object.keys(KARMA_ACTIONS));
