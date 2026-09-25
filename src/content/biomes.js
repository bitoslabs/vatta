'use strict';

/**
 * Biomes (design §7, "shุดแผนที่เริ่มต้น") — the same forest, seen through a
 * different realm or body.
 *
 * Rather than six hand-built maps, a biome re-skins and re-lights the world:
 * ground tint, water colour, the veil over the scene, and how dark the night
 * feels. It is chosen from the body you wear, the plane you were born into, and
 * your strongest tendency — so the map answers "where am I?" as much as the HUD.
 *
 * `features` is the dressing the seed assembles for that plane (design §7's
 * "กฎ Dynamic" per map). `sites` lists the **fixed map sites** that plane always
 * carries no matter the seed (the earthworm's burrow, the ant's nest, the frog's
 * marsh, the snake's crevice — see world/rooms.js), while `site` names the
 * signature place where that realm asks you to decide something (the asura
 * bridge, the garden, the market; see content/encounters.js).
 */
export const BIOMES = Object.freeze({
  'memory-forest': {
    nameKey: 'biome.memory.name',
    descKey: 'biome.memory.desc',
    ground: 'rgba(10,18,12,.35)',
    water: '#0a1a2c',
    waterCore: '#123049',
    veil: null,
    ambient: 0.87,
    features: ['thicket', 'boulders', 'pond', 'clearing'],
    sites: ['marsh', 'crevice', 'field', 'grove', 'enclosure', 'seeds', 'tide', 'homes', 'ford', 'damp', 'boar', 'web', 'signal', 'push'],
    site: null,
  },
  'under-root': {
    nameKey: 'biome.root.name',
    descKey: 'biome.root.desc',
    ground: 'rgba(46,30,16,.5)',
    water: '#2a1d12',
    waterCore: '#3b2a18',
    veil: 'rgba(120,92,52,.05)',
    ambient: 0.9,
    features: ['rootwall', 'pebble', 'clearing', 'burrow'],
    sites: ['burrow', 'nest'],
    site: null,
  },
  woeful: {
    nameKey: 'biome.woeful.name',
    descKey: 'biome.woeful.desc',
    ground: 'rgba(48,12,10,.42)',
    water: '#2a0f12',
    waterCore: '#3d1a18',
    veil: 'rgba(120,20,20,.07)',
    ambient: 0.93,
    features: ['boulders', 'thicket', 'thicket'],
    sites: [],
    site: null,
  },
  'asura-city': {
    nameKey: 'biome.asura.name',
    descKey: 'biome.asura.desc',
    ground: 'rgba(38,44,58,.4)',
    water: '#16202e',
    waterCore: '#1f2f42',
    veil: 'rgba(70,90,130,.06)',
    ambient: 0.8,
    features: ['tower', 'tower', 'bridge'],
    sites: ['asura'],
    site: 'asura',
  },
  'light-garden': {
    nameKey: 'biome.garden.name',
    descKey: 'biome.garden.desc',
    ground: 'rgba(70,78,44,.32)',
    water: '#1d3c58',
    waterCore: '#2a5a7d',
    veil: 'rgba(230,240,200,.05)',
    ambient: 0.62,
    features: ['bloom', 'bloom', 'clearing', 'pond'],
    sites: ['garden'],
    site: 'garden',
  },
  'craving-market': {
    nameKey: 'biome.market.name',
    descKey: 'biome.market.desc',
    ground: 'rgba(58,42,18,.4)',
    water: '#1c1a2c',
    waterCore: '#2a2438',
    veil: 'rgba(200,150,60,.06)',
    ambient: 0.84,
    features: ['stall', 'stall', 'clearing'],
    sites: ['market'],
    site: 'market',
  },
  formless: {
    nameKey: 'biome.formless.name',
    descKey: 'biome.formless.desc',
    ground: 'rgba(60,62,70,.3)',
    water: '#2a2e38',
    waterCore: '#3a3f4c',
    veil: 'rgba(220,230,255,.05)',
    ambient: 0.55,
    features: ['clearing'],
    sites: [],
    site: null,
  },
});
