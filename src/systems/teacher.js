'use strict';

import { state } from '../core/state.js';
import { emit, EVENTS, on } from '../core/events.js';
import { dist } from '../core/math.js';
import { player } from '../entities/player.js';
import { anchoredPoint } from '../world/world-data.js';
import { currentMapId } from './biome.js';

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

/**
 * Two kinds of landmark live in this list (design §7): places that stand in every
 * plane (the temple, the bodhi tree, the sala, the forest itself) and places that
 * belong to the road (the guardian, and the road itself). The road-bound ones are
 * carried onto whichever road this life walks, and the forest's own gate lesson
 * is only taught in the forest.
 */
const ROAD_NOTES = new Set(['teacher.note.guardian', 'teacher.note.path']);
const FOREST_NOTES = new Set(['teacher.note.gate']);

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

/** The landmarks this plane has, with the road-bound ones standing on its road. */
export function teacherLandmarks() {
  const plane = currentMapId();
  const forest = plane === 'memory-forest' || plane === 'manussa@memory-forest';
  return NOTES
    .filter((note) => forest || !FOREST_NOTES.has(note.key))
    .map((note) => {
      if (!ROAD_NOTES.has(note.key)) return note;
      const spot = anchoredPoint(plane, note.x, note.y);
      return { ...note, x: spot.x, y: spot.y };
    });
}

/** The tour order this plane can actually walk. */
function tourOrder() {
  const notes = teacherLandmarks();
  return TOUR_ORDER.filter((key) => notes.some((note) => note.key === key));
}

function noteAt() {
  let best = null;
  let bestDist = Infinity;
  for (const note of teacherLandmarks()) {
    const d = dist(player.x, player.y, note.x, note.y);
    if (d < note.r && d < bestDist) {
      bestDist = d;
      best = note;
    }
  }
  return best;
}

/** The next stop of the guided tour, or null when the tour is complete. */
export function tourTarget() {
  const notes = teacherLandmarks();
  const order = tourOrder();
  const key = order[tourIndex];
  return key ? notes.find((note) => note.key === key) || null : null;
}

export function tourProgress() {
  const order = tourOrder();
  return { index: tourIndex, total: order.length, done: tourIndex >= order.length };
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
