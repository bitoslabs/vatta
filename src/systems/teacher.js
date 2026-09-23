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
 * becomes a place to walk and read. A commentary line follows the landmarks so
 * a teacher can talk over the world itself.
 */
const NOTES = [
  // coordinates mirror core/constants + world/world-data + game/npc
  { key: 'teacher.note.bodhi', x: 360, y: 1690, r: 170 },
  { key: 'teacher.note.temple', x: 620, y: 1560, r: 470 },
  { key: 'teacher.note.gate', x: 2490, y: 300, r: 260 },
  { key: 'teacher.note.guardian', x: 2560, y: 1240, r: 140 },
  { key: 'teacher.note.path', x: 2250, y: 1180, r: 320 },
  { key: 'teacher.note.sala', x: 3980, y: 880, r: 320 },
];

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
  for (const note of NOTES) {
    if (dist(player.x, player.y, note.x, note.y) < note.r) return note.key;
  }
  return 'teacher.note.forest';
}

on(EVENTS.TEACHER_KEY, toggleTeacher);
