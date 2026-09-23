'use strict';

/**
 * The 31 planes of existence (ภูมิ 31 / ไตรภูมิ) of the Theravāda Abhidhamma.
 *
 *   11 kāma-bhūmi   — planes of sense-desire
 *      · 4 apāya     — the woeful planes (hell, animal, peta, asura)
 *      · 7 sugati    — human + the six deva heavens
 *   16 rūpa-bhūmi   — fine-material Brahma planes (by jhāna)
 *    4 arūpa-bhūmi  — formless planes (by the four arūpa-jhāna)
 *
 * Every plane also carries a gameplay `modifier`, so being reborn as an animal,
 * a deva or a Brahmā actually changes how the world plays:
 *   speed         × player/ghost movement
 *   fearGain      × how fast the meter (fear / anger) builds
 *   safeRelief    × how fast safe zones calm the mind
 *   vision        ± pixels of sight radius
 *   mindDissolve  × time mindfulness needs to dissolve a ghost (lower = easier)
 *   canSpeak      false for animals — they cannot talk to the elder
 *
 * Names are shown with their Pali form; every name/description is localised.
 */
export const REALM_GROUPS = Object.freeze([
  { id: 'apaya', labelKey: 'realm.group.apaya' },
  { id: 'kamasugati', labelKey: 'realm.group.kamasugati' },
  { id: 'rupa', labelKey: 'realm.group.rupa' },
  { id: 'arupa', labelKey: 'realm.group.arupa' },
]);

const BASE_MODIFIER = Object.freeze({
  speed: 1,
  fearGain: 1,
  safeRelief: 1,
  vision: 0,
  mindDissolve: 1,
  canSpeak: true,
});

const GROUP_MODIFIERS = Object.freeze({
  apaya: { speed: 0.82, fearGain: 1.35, safeRelief: 0.8, vision: -80, mindDissolve: 1.3 },
  kamasugati: {},
  rupa: { speed: 0.95, fearGain: 0.8, safeRelief: 1.3, vision: 60, mindDissolve: 0.7 },
  arupa: { speed: 0.9, fearGain: 0.65, safeRelief: 1.5, vision: 90, mindDissolve: 0.55 },
});

const DEVA = { speed: 1.02, fearGain: 1.08, safeRelief: 1.15, vision: 30, mindDissolve: 0.95 };

const REALM_OVERRIDES = Object.freeze({
  niraya: { speed: 0.75, fearGain: 1.5, safeRelief: 0.7, vision: -110, mindDissolve: 1.5 },
  peta: { speed: 0.85, fearGain: 1.35, vision: -70 },
  asurakaya: { speed: 0.88, fearGain: 1.4, vision: -60 },
  tiracchana: { vision: -90, canSpeak: false },

  manussa: {},
  catumaharajika: DEVA,
  tavatimsa: DEVA,
  yama: DEVA,
  tusita: DEVA,
  nimmanarati: DEVA,
  paranimmita: DEVA,
});

function modifierFor(id, group) {
  return { ...BASE_MODIFIER, ...GROUP_MODIFIERS[group], ...REALM_OVERRIDES[id] };
}

const realm = (id, group, pali) => ({
  id,
  group,
  pali,
  nameKey: `realm.${id}.name`,
  descKey: `realm.${id}.desc`,
  modifier: modifierFor(id, group),
});

export const REALMS = Object.freeze([
  // ---- Apāya (4) --------------------------------------------------------
  realm('niraya', 'apaya', 'Niraya'),
  realm('tiracchana', 'apaya', 'Tiracchāna'),
  realm('peta', 'apaya', 'Peta'),
  realm('asurakaya', 'apaya', 'Asurakāya'),

  // ---- Sugati / kāma (7) ------------------------------------------------
  realm('manussa', 'kamasugati', 'Manussa'),
  realm('catumaharajika', 'kamasugati', 'Cātummahārājika'),
  realm('tavatimsa', 'kamasugati', 'Tāvatiṃsa'),
  realm('yama', 'kamasugati', 'Yāma'),
  realm('tusita', 'kamasugati', 'Tusita'),
  realm('nimmanarati', 'kamasugati', 'Nimmānarati'),
  realm('paranimmita', 'kamasugati', 'Paranimmitavasavattī'),

  // ---- Rūpa (16) --------------------------------------------------------
  realm('brahma-parisajja', 'rupa', 'Brahma-pārisajja'),
  realm('brahma-purohita', 'rupa', 'Brahma-purohita'),
  realm('mahabrahma', 'rupa', 'Mahā-brahmā'),
  realm('parittabha', 'rupa', 'Parittābha'),
  realm('appamanabha', 'rupa', 'Appamāṇābha'),
  realm('abhassara', 'rupa', 'Ābhassara'),
  realm('parittasubha', 'rupa', 'Parittasubhā'),
  realm('appamanasubha', 'rupa', 'Appamāṇasubhā'),
  realm('subhakinha', 'rupa', 'Subhakiṇhā'),
  realm('vehapphala', 'rupa', 'Vehapphalā'),
  realm('asannasatta', 'rupa', 'Asaññasattā'),
  realm('aviha', 'rupa', 'Avihā'),
  realm('atappa', 'rupa', 'Atappā'),
  realm('sudassa', 'rupa', 'Sudassā'),
  realm('sudassi', 'rupa', 'Sudassī'),
  realm('akanittha', 'rupa', 'Akaniṭṭhā'),

  // ---- Arūpa (4) --------------------------------------------------------
  realm('akasanancayatana', 'arupa', 'Ākāsānañcāyatana'),
  realm('vinnanancayatana', 'arupa', 'Viññāṇañcāyatana'),
  realm('akincannayatana', 'arupa', 'Ākiñcaññāyatana'),
  realm('nevasannanasannayatana', 'arupa', 'Nevasaññānāsaññāyatana'),
]);

const byId = new Map(REALMS.map((r) => [r.id, r]));

export function realmById(id) {
  return byId.get(id) || null;
}

export function realmsByGroup(groupId) {
  return REALMS.filter((r) => r.group === groupId);
}
