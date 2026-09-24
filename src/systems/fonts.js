'use strict';

import { getLocale } from './i18n.js';

/**
 * Canvas typefaces, per locale, in one place.
 *
 * The stylesheets already switch faces for the DOM (`base.css` sets
 * `--font-body` to *Kom* under `html[lang='lo']`), but canvas text is not styled
 * by CSS: every `ctx.font` is a string the code builds itself. Without this, Lao
 * dialogue, floaters and prompts were drawn in a Thai-only face and came out as
 * boxes or fell back to whatever the browser found first. So the same stacks live
 * here too, and `tests/fonts.test.mjs` holds the two in step: the first family a
 * locale uses on screen must be the first family it uses on the canvas.
 *
 * Lao letters also sit smaller per pixel than Latin or Thai, so canvas type is
 * nudged up a little for that locale (the DOM gets the same effect from the
 * face's own metrics).
 */
const STACKS = Object.freeze({
  th: Object.freeze({ body: "'Bai Jamjuree', 'Noto Sans Thai', 'Thonburi', 'Leelawadee UI', sans-serif" }),
  lo: Object.freeze({ body: "'Kom', 'Bai Jamjuree', 'Noto Sans Lao', 'Thonburi', sans-serif" }),
  en: Object.freeze({ body: "'Bai Jamjuree', 'Noto Sans Thai', 'Thonburi', 'Leelawadee UI', sans-serif" }),
});

const SCALE = Object.freeze({ lo: 1.12 });

/** The size multiplier canvas text needs in this locale. */
export function localeFontScale(locale = getLocale()) {
  return SCALE[locale] || 1;
}

/** The font family canvas text uses in this locale. */
export function canvasFontFamily(locale = getLocale()) {
  return (STACKS[locale] || STACKS.th).body;
}

/**
 * A `ctx.font` string in the right face for the locale in play:
 * `canvasFont(13)` → `"300 13px 'Bai Jamjuree', …"`, and under Lao →
 * `"300 15px 'Kom', …"`.
 */
export function canvasFont(size, weight = 300, locale = getLocale()) {
  const scaled = Math.max(1, Math.round(size * localeFontScale(locale)));
  return `${weight} ${scaled}px ${canvasFontFamily(locale)}`;
}
