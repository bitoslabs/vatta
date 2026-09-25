'use strict';

import { FORMS, mapsFor } from '../content/forms.js';

/**
 * Stable animal choices for supported land chapters; no moral ranking of species.
 *
 * A chapter's pool may only offer bodies its map can carry (the design's rule
 * against stranding a body: "ไม่ให้ปลาเกิดบนบก"), and only bodies the life cycle
 * is allowed to be born into (`form.rebirth`). The earthworm joins a few pools
 * because its burrow map now exists — see game/burrow.js. The fish joins only the
 * pools that already carry water bodies, and a water-bound life enters a chapter in
 * the water nearest its start (game/chapters.js#chapterSpawn), so the rule holds in
 * fact and not only in the list.
 */
export const CHAPTER_ANIMALS = [
  ['deer', 'dog', 'crane', 'snake', 'tiger', 'cat'], ['turtle', 'dog', 'worm', 'ant', 'bat', 'buffalo', 'boar'],
  ['monkey', 'butterfly', 'deer', 'rabbit', 'gecko', 'squirrel', 'bee', 'snail', 'boar', 'spider', 'firefly', 'beetle'], ['fish', 'dog', 'turtle', 'crane', 'frog', 'elephant', 'crab', 'otter'],
  ['butterfly', 'monkey', 'worm', 'snake', 'gecko'], ['crane', 'dog', 'turtle', 'tiger'],
  ['fish', 'turtle', 'deer', 'butterfly', 'frog', 'bat', 'crab', 'cat', 'buffalo', 'boar'], ['dog', 'monkey', 'worm', 'ant', 'owl', 'elephant'],
  ['deer', 'butterfly', 'turtle', 'rabbit', 'tiger', 'otter', 'bee', 'cat', 'snail', 'boar', 'spider', 'firefly', 'beetle'], ['monkey', 'crane', 'dog', 'frog', 'owl'],
  ['fish', 'crane', 'turtle', 'butterfly', 'ant', 'snake', 'bat', 'otter'], ['butterfly', 'dog', 'deer', 'tiger'],
  ['turtle', 'monkey', 'crane', 'snake', 'gecko'], ['deer', 'dog', 'butterfly', 'rabbit', 'owl', 'elephant'],
];

/** A body may only be offered for a chapter whose map carries it. */
export function candidatesFor(chapterId, maps = ['land', 'water', 'burrow', 'air']) {
  const pool = CHAPTER_ANIMALS[(chapterId - 1) % CHAPTER_ANIMALS.length] || ['deer'];
  const allowed = pool.filter((id) => {
    const form = FORMS.find((entry) => entry.id === id);
    if (!form || form.rebirth !== true) return false;
    const formMaps = mapsFor(id);
    return formMaps.length === 0 || formMaps.some((map) => maps.includes(map));
  });
  return allowed.length ? allowed : ['deer'];
}

export function planNextLife({ chapter, lifeId, history = [], chapterIds, maps }) {
  const current = chapterIds.indexOf(chapter);
  const nextChapter = chapterIds[(current + 1) % chapterIds.length];
  const candidates = candidatesFor(nextChapter, maps);
  const recent = history.slice(-2);
  const available = candidates.filter(id => !recent.includes(id));
  const pool = available.length ? available : candidates;

  // Wear the bodies least worn so far. Indexing by `lifeId % pool.length` looked
  // fair but was not: the pool length (7) divides the chapter cycle (14), so the
  // same chapter always met the same body and some bodies were never born at all.
  const worn = new Map(pool.map((id) => [id, history.filter((wornId) => wornId === id).length]));
  const least = Math.min(...pool.map((id) => worn.get(id)));
  const freshest = pool.filter((id) => worn.get(id) === least);
  return { chapter: nextChapter, lifeId: lifeId + 1, formId: freshest[(lifeId - 1) % freshest.length] };
}
