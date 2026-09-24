'use strict';

const registry = new Map();

/** Subscribe to an app event. Returns an unsubscribe function. */
export function on(event, handler) {
  if (!registry.has(event)) registry.set(event, new Set());
  const handlers = registry.get(event);
  handlers.add(handler);
  return () => handlers.delete(handler);
}

/** Publish an app event to every subscriber. */
export function emit(event, payload) {
  const handlers = registry.get(event);
  if (!handlers) return;
  for (const handler of [...handlers]) handler(payload);
}

/** Canonical event names — the only contract between systems and scenes. */
export const EVENTS = Object.freeze({
  SPACE_DOWN: 'key:space-down',
  SPACE_UP: 'key:space-up',
  ACTION: 'action:act',
  DISMISS: 'action:dismiss',
  MUTE_TOGGLE: 'audio:mute-toggle',
  DIALOGUE_ADVANCE: 'dialogue:advance',
  CHOICE_PICK: 'choice:picked',
  LOCALE_CHANGED: 'locale:changed',
  /** Payload: the karma action id that was recorded. */
  KARMA_CHANGED: 'karma:changed',
  /** Payload: cause of pacification — 'mind' (mindfulness) or 'sala'. */
  GHOST_PACIFIED: 'ghost:pacified',
  /** Payload: the realm id the player has just been reborn into. */
  REBIRTH: 'samsara:rebirth',
  /** Payload: the Noble Eightfold Path factor id that was just unlocked. */
  PATH_UNLOCKED: 'path:unlocked',
  /** Payload: the precept id that was just broken for the first time. */
  PRECEPT_BROKEN: 'precept:broken',
  /** Payload: the T key was pressed (request to toggle classroom mode). */
  TEACHER_KEY: 'teacher:key',
  /** Payload: whether classroom mode is now on. */
  TEACHER_TOGGLE: 'teacher:toggle',
  /** Payload: { index, total, done } as the guided tour advances. */
  TEACHER_TOUR: 'teacher:tour',
  /** Payload: the P key was pressed (request to toggle projector mode). */
  PROJECTOR_KEY: 'projector:key',
  /** Payload: whether projector mode is now on. */
  PROJECTOR_TOGGLE: 'projector:toggle',
  /** Payload: the new form id (see content/forms.js). */
  FORM_CHANGED: 'form:changed',
  /** Payload: the goal kind ('water' | 'land') when a life's goal is reached. */
  LIFE_COMPLETE: 'life:complete',
});
