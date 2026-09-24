'use strict';

import { FORMS, mapsFor } from '../content/forms.js';

/**
 * Stable animal choices for supported land chapters; no moral ranking of species.
 *
 * A chapter's pool may only offer bodies its map can carry (the design's rule
 * against stranding a body: "ไม่ให้ปลาเกิดบนบก"), and only bodies the life cycle
 * is allowed to be born into (`form.rebirth`). The earthworm joins a few pools
 * because its burrow map now exists — see game/burrow.js.
 */
export const CHAPTER_ANIMALS = [
  ['deer', 'dog', 'crane'], ['turtle', 'dog', 'worm', 'ant'],
  ['monkey', 'butterfly', 'deer'], ['dog', 'turtle', 'crane', 'frog'],
  ['butterfly', 'monkey', 'worm'], ['crane', 'dog', 'turtle'],
  ['turtle', 'deer', 'butterfly', 'frog'], ['dog', 'monkey', 'worm', 'ant'],
  ['deer', 'butterfly', 'turtle'], ['monkey', 'crane', 'dog', 'frog'],
  ['crane', 'turtle', 'butterfly', 'ant'], ['butterfly', 'dog', 'deer'],
  ['turtle', 'monkey', 'crane'], ['deer', 'dog', 'butterfly'],
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
  return { chapter: nextChapter, lifeId: lifeId + 1, formId: pool[(lifeId - 1) % pool.length] };
}
