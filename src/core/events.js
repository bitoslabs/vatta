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
  CHOICE_PICK: 'choice:pick',
  LOCALE_CHANGED: 'locale:changed',
});
