import { REALMS, realmById } from './realms.js';
import { BIOMES } from './biomes.js';

// Artistic map identities, not additional cosmological claims. Shared mission
// sites remain intact; each realm owns its palette, route seed and lesson theme.
export function realmBiome(id) {
  const realm = realmById(id);
  if (id === 'niraya') return 'woeful';
  if (id === 'peta') return 'craving-market';
  if (id === 'asurakaya') return 'asura-city';
  if (realm?.group === 'arupa') return 'formless';
  if (realm?.group === 'rupa' || (realm?.group === 'kamasugati' && id !== 'manussa')) return 'light-garden';
  return 'memory-forest';
}

export const REALM_MAPS = Object.freeze(Object.fromEntries(REALMS.map((realm, index) => {
  const biomeId = realmBiome(realm.id);
  const hue = realm.group === 'apaya' ? [12, 112, 38, 225][index]
    : realm.group === 'arupa' ? 230 + (index - 27) * 22
      : realm.group === 'rupa' ? 155 + (index - 11) * 7 : 65 + (index - 4) * 19;
  return [realm.id, Object.freeze({
    id: realm.id, biomeId, index, nameKey: realm.nameKey, group: realm.group,
    theme: realm.id === 'niraya' ? 'kindness' : realm.id === 'peta' ? 'giving'
      : realm.id === 'asurakaya' ? 'patience' : realm.group === 'arupa' ? 'letting'
        : realm.group === 'rupa' ? 'attention' : realm.id === 'tiracchana' ? 'care' : 'change',
    accent: `hsl(${hue} 55% 72%)`,
    ground: `hsla(${hue}, 35%, 18%, .46)`,
    water: `hsl(${hue} 35% 13%)`, waterCore: `hsl(${hue} 36% 23%)`,
    veil: `hsla(${hue}, 65%, 65%, .055)`,
  })];
})));

export function mapIdentity(realmId, biomeId = realmBiome(realmId)) {
  return `${REALM_MAPS[realmId] ? realmId : 'manussa'}@${BIOMES[biomeId] ? biomeId : 'memory-forest'}`;
}

export function mapProfile(mapId) {
  return REALM_MAPS[String(mapId).split('@')[0]] || null;
}

export function biomeForMap(mapId) {
  const profile = mapProfile(mapId);
  return BIOMES[String(mapId).split('@')[1]] || BIOMES[mapId]
    || BIOMES[profile?.biomeId || 'memory-forest'];
}

export function baseBiomeId(mapId) {
  return Object.keys(BIOMES).find(id => BIOMES[id] === biomeForMap(mapId)) || 'memory-forest';
}
