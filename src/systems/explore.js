'use strict';

import { realmById } from '../content/realms.js';
import { MODE } from '../core/constants.js';
import { state } from '../core/state.js';
import { FORMS, mapsFor } from '../content/forms.js';
import { CHAPTERS, loadChapter } from '../game/chapters.js';
import { setTeacher } from './teacher.js';
import { BURROW, DEER, FISH, MARSH, NEST } from '../world/world-data.js';
import { player } from '../entities/player.js';
import { cam } from '../game/camera.js';
import { resetChicken } from '../game/burrow.js';
import { resetRain } from '../game/ant.js';
import { resetFishBird } from '../game/fish.js';
import { resetDryMarsh } from '../game/frog.js';
import { resetDeerHazard } from '../game/deer.js';
import { applySaveMeta, applySaveRuntime, snapshot } from './save.js';
import { resetDialogue } from '../ui/dialogue.js';
import { $ } from '../ui/dom.js';

let returnState = null;

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
export function startExplore({ formId, chapterId = CHAPTERS[0].id, realmId = null } = {}) {
  if (realmId !== null && !realmById(realmId)) return false;
  const form = FORMS.find((entry) => entry.id === formId);
  if (!form || !explorableForms().some((entry) => entry.id === formId)) return false;
  const chapter = CHAPTERS.find((entry) => entry.id === chapterId) || CHAPTERS[0];
  if (!isExploring()) {
    returnState = { run: JSON.parse(JSON.stringify(snapshot())), teacher: state.teacher === true };
  }
  state.explore = { active: true, formId, chapter: chapter.id };
  state.lifeMode = false;
  state.formId = form.id;
  setTeacher(true);
  loadChapter(chapter.id, { autosave: false, realmId: realmId || (form.id === 'worm' ? 'tiracchana' : null) });
  if (form.id === 'worm') {
    // The animal book opens at the actual burrow, so the chicken can be tried
    // without completing several story lives first. Exploration writes no save.
    player.x = BURROW.shelter.x;
    player.y = BURROW.shelter.y;
    cam.x = player.x;
    cam.y = player.y;
    resetDialogue();
  } else if (form.id === 'ant') {
    player.x = NEST.preview.x;
    player.y = NEST.preview.y;
    cam.x = player.x;
    cam.y = player.y;
    resetDialogue();
  } else if (form.id === 'fish') {
    player.x = FISH.preview.x;
    player.y = FISH.preview.y;
    cam.x = player.x;
    cam.y = player.y;
    resetDialogue();
  } else if (form.id === 'frog') {
    player.x = MARSH.preview.x;
    player.y = MARSH.preview.y;
    cam.x = player.x;
    cam.y = player.y;
    resetDialogue();
  } else if (form.id === 'deer') {
    player.x = DEER.preview.x;
    player.y = DEER.preview.y;
    cam.x = player.x;
    cam.y = player.y;
    resetDialogue();
  }
  return true;
}

/** Leave explore mode. The story save was never touched, so there is nothing to undo. */
export function stopExplore() {
  state.explore = { active: false, formId: null, chapter: null };
  if (returnState) {
    applySaveMeta(returnState.run);
    applySaveRuntime(returnState.run);
    setTeacher(returnState.teacher);
    returnState = null;
    state.mode = MODE.TITLE;
    $('#titleScreen')?.classList.remove('hidden');
    $('#hud')?.classList.add('hidden');
    $('#ctrlHint')?.classList.add('hidden');
    resetDialogue();
  }
  resetChicken();
  resetRain();
  resetFishBird();
  resetDryMarsh();
  resetDeerHazard();
  return true;
}
