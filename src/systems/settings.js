'use strict';

import { emit, EVENTS } from '../core/events.js';

/**
 * Player settings that are about the *screen*, not the world: the large-type
 * mode for classroom projectors and tired eyes. Kept in one place and stored
 * beside the saves, so a session that starts in a classroom looks the same next
 * week (see ui/settings.js for the screen that drives it).
 */
const KEY = 'vimutti.settings';

let largeType = false;

function store() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ largeType }));
  } catch {
    /* storage may be unavailable — the setting still holds for this session */
  }
}

/** Put the setting on the document, where the stylesheets can see it. */
function apply() {
  const root = document.documentElement;
  if (!root || !root.classList) return;
  root.classList.toggle('type-large', largeType);
}

export function isLargeType() {
  return largeType;
}

export function setLargeType(on) {
  largeType = Boolean(on);
  apply();
  persist();
  emit(EVENTS.SETTINGS_CHANGED, { largeType });
  return largeType;
}

export function toggleLargeType() {
  return setLargeType(!largeType);
}

/** Read the stored settings and put them on the document. Called once at boot. */
export function initSettings() {
  const saved = store();
  largeType = saved.largeType === true;
  apply();
}
