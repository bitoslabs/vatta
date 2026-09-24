'use strict';

/**
 * Roadside encounters (design §6).
 *
 * Each being stands somewhere on the road with a prompt; talking offers choices
 * that record an intention and answer through the world, never with a verdict.
 * Chapters, the guardian and the bridge always take priority.
 *
 * A being with a `biome` only appears in that plane (design §7's signature
 * places: the asura bridge, the fading garden, the market of craving, the weir).
 */
export const ENCOUNTERS = Object.freeze([
  {
    id: 'peta',
    kind: 'peta',
    x: 2000,
    y: 1290,
    r: 115,
    promptKey: 'prompt.talkPeta',
    choices: [
      { key: 'peta.choice.give', karma: 'give', answer: 'peta.answer.give', color: '#d9c58c' },
      { key: 'peta.choice.observe', karma: 'mindful', answer: 'peta.answer.observe', color: '#bfd9cd' },
    ],
  },
  {
    id: 'nymph',
    kind: 'nymph',
    x: 1780,
    y: 1500,
    r: 115,
    promptKey: 'prompt.talkNymph',
    choices: [
      { key: 'nymph.choice.listen', karma: 'mindful', answer: 'nymph.answer.listen', color: '#bfd9cd' },
      { key: 'nymph.choice.rush', karma: 'cling', answer: 'nymph.answer.rush', color: '#c8a2c8' },
    ],
  },
  {
    id: 'fame',
    kind: 'mara',
    x: 3060,
    y: 1600,
    r: 115,
    promptKey: 'prompt.talkFame',
    choices: [
      { key: 'fame.choice.shortcut', karma: 'harm', answer: 'fame.answer.shortcut', color: '#c98a7a' },
      { key: 'fame.choice.refuse', karma: 'letgo', answer: 'fame.answer.refuse', color: '#bfd9cd' },
    ],
  },
  {
    id: 'naga',
    kind: 'naga',
    x: 1420,
    y: 2080,
    r: 120,
    promptKey: 'prompt.talkNaga',
    choices: [
      { key: 'naga.choice.share', karma: 'give', answer: 'naga.answer.share', color: '#9fc6dd' },
      { key: 'naga.choice.hoard', karma: 'cling', answer: 'naga.answer.hoard', color: '#c8a2c8' },
    ],
  },
  {
    id: 'garuda',
    kind: 'garuda',
    x: 3560,
    y: 1360,
    r: 115,
    promptKey: 'prompt.talkGaruda',
    choices: [
      { key: 'garuda.choice.speed', karma: 'cling', answer: 'garuda.answer.speed', color: '#c8a2c8' },
      { key: 'garuda.choice.wait', karma: 'compassion', answer: 'garuda.answer.wait', color: '#bfd9cd' },
    ],
  },
  {
    id: 'asura-bridge',
    kind: 'asura',
    biome: 'asura-city',
    x: 1500,
    y: 2400,
    r: 130,
    promptKey: 'prompt.talkAsuraBridge',
    choices: [
      { key: 'asura.choice.share', karma: 'give', answer: 'asura.answer.share', color: '#bfd9cd' },
      { key: 'asura.choice.race', karma: 'cling', answer: 'asura.answer.race', color: '#c8a2c8' },
    ],
  },
  {
    id: 'garden-bloom',
    kind: 'garden',
    biome: 'light-garden',
    x: 3700,
    y: 1200,
    r: 130,
    promptKey: 'prompt.talkGardenBloom',
    choices: [
      { key: 'garden.choice.release', karma: 'letgo', answer: 'garden.answer.release', color: '#bfd9cd' },
      { key: 'garden.choice.hold', karma: 'cling', answer: 'garden.answer.hold', color: '#c8a2c8' },
    ],
  },
  {
    id: 'market-stall',
    kind: 'market',
    biome: 'craving-market',
    x: 2120,
    y: 1200,
    r: 130,
    promptKey: 'prompt.talkMarketStall',
    choices: [
      { key: 'market.choice.empty', karma: 'precept', answer: 'market.answer.empty', color: '#bfd9cd' },
      { key: 'market.choice.offer', karma: 'steal', answer: 'market.answer.offer', color: '#e9c46a' },
    ],
  },
  {
    id: 'river-weir',
    kind: 'weir',
    biome: 'memory-forest',
    x: 1350,
    y: 2600,
    r: 130,
    promptKey: 'prompt.talkWeir',
    choices: [
      { key: 'weir.choice.open', karma: 'give', answer: 'weir.answer.open', color: '#9fc6dd' },
      { key: 'weir.choice.close', karma: 'cling', answer: 'weir.answer.close', color: '#c8a2c8' },
    ],
  },
  {
    id: 'keeper',
    kind: 'keeper',
    x: 3860,
    y: 1040,
    r: 115,
    promptKey: 'prompt.talkKeeper',
    choices: [
      { key: 'keeper.choice.sit', karma: 'mindful', answer: 'keeper.answer.sit', color: '#dfe6e0' },
    ],
  },
]);
