'use strict';

import { state } from '../core/state.js';
import { emit, EVENTS, on } from '../core/events.js';
import { dist } from '../core/math.js';
import { player } from '../entities/player.js';

const KEY = 'vimutti.teacher';

/**
 * Classroom / teacher mode.
 *
 * With it on there are no spirits, no temptations and no fail states: the map
 * becomes a place to walk and read. Landmark labels float over the world and a
 * guided tour walks the class through the map in a sensible order.
 */
const NOTES = [
  // coordinates mirror core/constants + world/world-data + game/npc
  { key: 'teacher.note.temple', labelKey: 'teacher.label.temple', x: 620, y: 1560, r: 470 },
  { key: 'teacher.note.bodhi', labelKey: 'teacher.label.bodhi', x: 360, y: 1690, r: 170 },
  { key: 'teacher.note.gate', labelKey: 'teacher.label.gate', x: 2490, y: 300, r: 260 },
  { key: 'teacher.note.guardian', labelKey: 'teacher.label.guardian', x: 2560, y: 1240, r: 140 },
  { key: 'teacher.note.path', labelKey: 'teacher.label.path', x: 2250, y: 1180, r: 320 },
  { key: 'teacher.note.sala', labelKey: 'teacher.label.sala', x: 3980, y: 880, r: 320 },
];

/** A pilgrimage order for the guided tour: inward, then outward, then back. */
const TOUR_ORDER = [
  'teacher.note.temple',
  'teacher.note.path',
  'teacher.note.gate',
  'teacher.note.guardian',
  'teacher.note.sala',
  'teacher.note.bodhi',
];

const byKey = new Map(NOTES.map((note) => [note.key, note]));

let tourIndex = 0;

export function initTeacher() {
  let stored = null;
  try {
    stored = localStorage.getItem(KEY);
  } catch {
    stored = null;
  }
  state.teacher = stored === '1';
}

export function isTeacher() {
  return state.teacher === true;
}

export function setTeacher(on) {
  state.teacher = Boolean(on);
  if (state.teacher) tourIndex = 0;
  try {
    localStorage.setItem(KEY, state.teacher ? '1' : '0');
  } catch {
    /* storage may be unavailable — the mode still works for this session */
  }
  emit(EVENTS.TEACHER_TOGGLE, state.teacher);
}

export function toggleTeacher() {
  setTeacher(!state.teacher);
}

/** The commentary key for wherever the walker currently stands. */
export function currentNote() {
  const here = noteAt();
  return here ? here.key : 'teacher.note.forest';
}

function noteAt() {
  let best = null;
  let bestDist = Infinity;
  for (const note of NOTES) {
    const d = dist(player.x, player.y, note.x, note.y);
    if (d < note.r && d < bestDist) {
      bestDist = d;
      best = note;
    }
  }
  return best;
}

export function teacherLandmarks() {
  return NOTES;
}

/** The next stop of the guided tour, or null when the tour is complete. */
export function tourTarget() {
  return byKey.get(TOUR_ORDER[tourIndex]) || null;
}

export function tourProgress() {
  return { index: tourIndex, total: TOUR_ORDER.length, done: tourIndex >= TOUR_ORDER.length };
}

export function resetTour() {
  tourIndex = 0;
}

/** Advance the tour as the walker reaches each stop. */
export function updateTour() {
  if (!isTeacher()) return;
  const target = tourTarget();
  if (!target) return;
  if (dist(player.x, player.y, target.x, target.y) < target.r) {
    tourIndex++;
    emit(EVENTS.TEACHER_TOUR, tourProgress());
  }
}

on(EVENTS.TEACHER_KEY, toggleTeacher);
