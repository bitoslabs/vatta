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
  ['deer', 'dog', 'crane', 'snake', 'tiger'], ['turtle', 'dog', 'worm', 'ant', 'bat'],
  ['monkey', 'butterfly', 'deer', 'rabbit', 'gecko', 'squirrel'], ['dog', 'turtle', 'crane', 'frog', 'elephant'],
  ['butterfly', 'monkey', 'worm', 'snake', 'gecko'], ['crane', 'dog', 'turtle', 'tiger'],
  ['turtle', 'deer', 'butterfly', 'frog', 'bat'], ['dog', 'monkey', 'worm', 'ant', 'owl', 'elephant'],
  ['deer', 'butterfly', 'turtle', 'rabbit', 'tiger'], ['monkey', 'crane', 'dog', 'frog', 'owl'],
  ['crane', 'turtle', 'butterfly', 'ant', 'snake', 'bat'], ['butterfly', 'dog', 'deer', 'tiger'],
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
  return { chapter: nextChapter, lifeId: lifeId + 1, formId: pool[(lifeId - 1) % pool.length] };
}
