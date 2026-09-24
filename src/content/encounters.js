'use strict';

/**
 * Roadside encounters (design §6).
 *
 * Each being stands somewhere on the road with a prompt; talking offers choices
 * that record an intention and answer through the world, never with a verdict.
 * Chapters, the guardian and the bridge always take priority.
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
