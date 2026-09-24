'use strict';

import { emit, EVENTS } from '../core/events.js';

/**
 * Player settings that are about the *screen*, not the world: the large-type mode
 * for classroom projectors and tired eyes, and the reduced-motion mode for anyone
 * who does not want particles thrown at them (docs/rebirth-effects.md: "ลดการ
 * เคลื่อนไหว" uses a short fade and no particles, and the story reads the same).
 * Kept in one place and stored beside the saves, so a session that starts in a
 * classroom looks the same next week (see ui/settings.js for the screen that
 * drives it).
 */
const KEY = 'vimutti.settings';

let largeType = false;
let reducedMotion = false;

function store() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ largeType, reducedMotion }));
  } catch {
    /* storage may be unavailable — the setting still holds for this session */
  }
}

/** Put the setting on the document, where the stylesheets can see it. */
function apply() {
  const root = document.documentElement;
  if (!root || !root.classList) return;
  root.classList.toggle('type-large', largeType);
  root.classList.toggle('motion-reduced', reducedMotion);
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

export function isReducedMotion() {
  return reducedMotion;
}

export function setReducedMotion(on) {
  reducedMotion = Boolean(on);
  apply();
  persist();
  emit(EVENTS.SETTINGS_CHANGED, { reducedMotion });
  return reducedMotion;
}

export function toggleReducedMotion() {
  return setReducedMotion(!reducedMotion);
}

/** Read the stored settings and put them on the document. Called once at boot. */
export function initSettings() {
  const saved = store();
  largeType = saved.largeType === true;
  reducedMotion = saved.reducedMotion === true;
  apply();
}
