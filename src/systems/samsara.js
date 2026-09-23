'use strict';

import { realmById } from '../content/realms.js';
import { emit, EVENTS } from '../core/events.js';
import { state } from '../core/state.js';
import { getKarma } from './karma.js';
import { resolveRebirth } from './rebirth.js';

/** Default plane for a mind with no recorded kamma yet. */
export const DEFAULT_REALM_ID = 'manussa';

export function getRealm() {
  return realmById(state.realmId || DEFAULT_REALM_ID) || realmById(DEFAULT_REALM_ID);
}

/** Movement / fear / vision / mindfulness modifiers of the current plane. */
export function getRealmModifier() {
  return getRealm().modifier;
}

export function enterRealm(realmId) {
  const realm = realmById(realmId);
  if (!realm) return null;
  state.realmId = realm.id;
  emit(EVENTS.REBIRTH, realm.id);
  return realm;
}

export function resetRealm() {
  state.realmId = DEFAULT_REALM_ID;
}

/**
 * จุติ–ปฏิสนธิ: leave this life and be reborn according to accumulated kamma.
 * @returns {{ realm: object, reasonKey: string }}
 */
export function rebirth(karma = getKarma()) {
  const { realmId, reasonKey } = resolveRebirth(karma);
  const realm = enterRealm(realmId);
  return { realm, reasonKey };
}
