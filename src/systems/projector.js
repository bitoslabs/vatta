'use strict';

import { state } from '../core/state.js';
import { emit, EVENTS, on } from '../core/events.js';
import { isTeacher, setTeacher } from './teacher.js';

const KEY = 'vimutti.projector';

/**
 * Projector mode for a classroom screen: larger type and larger in-world
 * labels. It only makes sense together with classroom mode, so turning it on
 * turns that on too.
 */
function applyClass() {
  const root = typeof document !== 'undefined' ? document.documentElement : null;
  root?.classList?.toggle('projector', state.projector === true);
}

export function initProjector() {
  let stored = null;
  try {
    stored = localStorage.getItem(KEY);
  } catch {
    stored = null;
  }
  state.projector = stored === '1';
  applyClass();
}

export function isProjector() {
  return state.projector === true;
}

export function setProjector(on) {
  state.projector = Boolean(on);
  if (state.projector && !isTeacher()) setTeacher(true);
  try {
    localStorage.setItem(KEY, state.projector ? '1' : '0');
  } catch {
    /* storage may be unavailable — the mode still works for this session */
  }
  applyClass();
  emit(EVENTS.PROJECTOR_TOGGLE, state.projector);
}

export function toggleProjector() {
  setProjector(!state.projector);
}

on(EVENTS.PROJECTOR_KEY, toggleProjector);
