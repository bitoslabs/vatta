'use strict';

import { locales } from '../locales/index.js';
import { emit, EVENTS } from '../core/events.js';

const STORAGE_KEY = 'vimutti.locale';

let current = locales[locales.default];
let code = locales.default;

/**
 * Keys already reported, so a string drawn every frame warns once rather than
 * flooding the console. Cleared when the locale changes so each locale reports
 * its own gaps.
 */
const warned = new Set();

function reportMissing(where, key) {
  const stamp = `${where}:${code}:${key}`;
  if (warned.has(stamp)) return;
  warned.add(stamp);
  console.warn(`[i18n] missing ${where} key "${key}" for locale "${code}"`);
}

/** Translate a flat string key. Supports `{name}` interpolation. */
export function t(key, vars) {
  const raw = current.strings[key];
  let text;
  if (raw === undefined) {
    reportMissing('string', key);
    text = key;
  } else {
    text = raw;
  }
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) => (vars[name] ?? match));
}

/** Translate a bundled list of values (quotes, disturbance lines, ...). */
export function tList(key) {
  if (current.lists?.[key] === undefined) reportMissing('list', key);
  return current.lists?.[key] ?? [];
}

/** Resolve a dialogue script to an array of `{ who, text }` lines. */
export function tDialogue(key) {
  if (current.dialogue?.[key] === undefined) reportMissing('dialogue', key);
  return current.dialogue?.[key] ?? [];
}

export function getLocale() {
  return code;
}

export function availableLocales() {
  return locales.order;
}

export function localeLabel(localeCode) {
  return locales[localeCode]?.label ?? localeCode;
}

function applyStaticTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-html]').forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    const [attr, key] = el.dataset.i18nAttr.split('|');
    if (attr && key) el.setAttribute(attr, t(key));
  });
}

export function setLocale(nextCode) {
  if (!locales[nextCode]) return;
  code = nextCode;
  current = locales[nextCode];
  warned.clear();
  document.documentElement.lang = current.htmlLang ?? nextCode;
  document.title = t('app.title');
  applyStaticTranslations();
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* storage may be unavailable (private mode) — safe to ignore */
  }
  emit(EVENTS.LOCALE_CHANGED, code);
}

export function initI18n() {
  let saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    saved = null;
  }
  setLocale(saved && locales[saved] ? saved : locales.default);
}
