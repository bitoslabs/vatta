'use strict';

import { on, EVENTS } from '../core/events.js';
import { t } from '../systems/i18n.js';
import { currentNote, isTeacher, tourProgress, tourTarget, toggleTeacher } from '../systems/teacher.js';
import { isProjector, toggleProjector } from '../systems/projector.js';
import { $ } from './dom.js';

const panel = $('#teacherPanel');
const titleEl = $('#teacherTitle');
const textEl = $('#teacherText');
const tourEl = $('#teacherTour');
const hintEl = $('#teacherHint');
const toggleButton = $('#teacherBtn');
const projectorButton = $('#projectorBtn');

let lastNote = null;
let lastTour = -1;

function renderTour() {
  const progress = tourProgress();
  if (progress.done) {
    tourEl.textContent = t('teacher.tour.done');
    return;
  }
  const target = tourTarget();
  tourEl.textContent = t('teacher.tour', {
    i: progress.index + 1,
    n: progress.total,
    name: t(target.labelKey),
  });
}

function renderChrome() {
  const on = isTeacher();
  panel.classList.toggle('hidden', !on);
  titleEl.textContent = t('teacher.title');
  hintEl.textContent = t('teacher.hint');
  if (toggleButton) {
    toggleButton.textContent = on ? t('teacher.toggle.on') : t('teacher.toggle.off');
  }
  if (projectorButton) {
    projectorButton.textContent = isProjector() ? t('projector.toggle.on') : t('projector.toggle.off');
  }
  lastNote = null;
  lastTour = -1; // force a refresh on the next frame
}

/** Called every world frame; only touches the DOM when something changes. */
export function updateTeacherPanel() {
  if (!isTeacher()) return;

  const note = currentNote();
  if (note !== lastNote) {
    lastNote = note;
    textEl.textContent = t(note);
  }

  const progress = tourProgress();
  if (progress.index !== lastTour) {
    lastTour = progress.index;
    renderTour();
  }
}

export function initTeacherPanel() {
  if (toggleButton) {
    toggleButton.addEventListener('click', (e) => {
      e.target.blur();
      toggleTeacher();
    });
  }
  if (projectorButton) {
    projectorButton.addEventListener('click', (e) => {
      e.target.blur();
      toggleProjector();
    });
  }
  on(EVENTS.TEACHER_TOGGLE, renderChrome);
  on(EVENTS.PROJECTOR_TOGGLE, renderChrome);
  on(EVENTS.TEACHER_TOUR, renderTour);
  on(EVENTS.LOCALE_CHANGED, renderChrome);
  renderChrome();
}
