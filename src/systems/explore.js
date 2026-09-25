'use strict';

import { state } from '../core/state.js';
import { FORMS, mapsFor } from '../content/forms.js';
import { CHAPTERS, loadChapter } from '../game/chapters.js';
import { setTeacher } from './teacher.js';

/**
 * Exploring bodies (docs/rebirth-modes.md, "สำรวจร่าง").
 *
 * The third rebirth mode, and the gentlest: instead of the seeded draw or the three
 * cards, a life opens the *animal book* and tries on any body in it — to feel what a
 * body can do, with teacher mode on and no spirits. It is deliberately kept out of
 * the story: nothing in this mode writes to the run's save slot
 * (`systems/save.js#saveRun` refuses while exploring), so an afternoon of trying
 * bodies never touches a journey.
 *
 * Every body in the book is one the game can actually enter: a palette, at least one
 * map, and a goal that resolves. That is the same floor `tests/roster.test.mjs`
 * holds new bodies to.
 */
export function isExploring() {
  return state.explore?.active === true;
}

export function exploreState() {
  return state.explore || { active: false, formId: null, chapter: null };
}

/** The bodies the animal book offers, in the order they exist in the game. */
export function explorableForms() {
  // Every body the game has both an identity and a map for. Their goals resolve like
  // any life's (systems/goals.js), and tests/roster.test.mjs holds every one of them
  // to born → walk → goal → save.
  return FORMS.filter((form) => (
    typeof form.id === 'string' && form.id.length > 0 && mapsFor(form.id).length > 0
  ));
}

/**
 * Enter a body (and a chapter) in explore mode. The run's save is left alone, and
 * teacher mode is on so a trial body cannot be punished for being tried.
 */
export function startExplore({ formId, chapterId = CHAPTERS[0].id } = {}) {
  const form = FORMS.find((entry) => entry.id === formId);
  if (!form || !explorableForms().some((entry) => entry.id === formId)) return false;
  const chapter = CHAPTERS.find((entry) => entry.id === chapterId) || CHAPTERS[0];
  state.explore = { active: true, formId, chapter: chapter.id };
  state.lifeMode = false;
  state.formId = form.id;
  setTeacher(true);
  loadChapter(chapter.id, { autosave: false });
  return true;
}

/** Leave explore mode. The story save was never touched, so there is nothing to undo. */
export function stopExplore() {
  state.explore = { active: false, formId: null, chapter: null };
  return true;
}
