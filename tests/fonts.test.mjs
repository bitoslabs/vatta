import assert from 'node:assert/strict';

/*
 * Canvas type per locale.
 *
 * CSS switches the DOM to *Kom* under `html[lang='lo']`, but canvas text is not
 * styled by CSS — every `ctx.font` is a string the code builds. Lao therefore used
 * to be drawn in a Thai-only face. This suite holds the canvas stacks, the size
 * nudge, and the stylesheet to the same promise: what a locale looks like on
 * screen is what it looks like on the canvas.
 */

// A minimal DOM: the modules below only read a couple of elements at import time.
const elements = new Map();
function element() {
  const classes = new Set(['hidden']);
  return {
    style: {}, dataset: {}, children: [], textContent: '', innerHTML: '',
    classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c), toggle() {} },
    addEventListener() {}, appendChild(child) { this.children.push(child); },
    querySelectorAll: () => [], getContext: () => ({}), setAttribute() {},
  };
}
const query = () => element();
globalThis.document = {
  hidden: false,
  documentElement: { lang: 'th', classList: { add() {}, remove() {}, toggle() {}, contains: () => false } },
  querySelector: query,
  querySelectorAll: () => [],
  getElementById: query,
  createElement: element,
};
globalThis.window = { matchMedia: () => ({ matches: false }), addEventListener() {}, location: { reload() {} } };
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.performance = { now: () => 0 };

const log = (message) => console.error(`[fonts] ${message}`);
const { canvasFont, canvasFontFamily, localeFontScale } = await import('../src/systems/fonts.js');
const { getLocale, setLocale, initI18n } = await import('../src/systems/i18n.js');
const { t } = await import('../src/systems/i18n.js');
const fs = await import('node:fs');

const familyOf = (font) => font.split(/px\s+/)[1].split(',')[0].trim().replace(/^'|'$/g, '');

// ---- 1. New players start in Lao, including the canvas font ----
initI18n();
assert.equal(getLocale(), 'lo', 'the game opens in Lao when nothing was saved');
assert.equal(document.documentElement.lang, 'lo', 'the document language follows the default');
assert.equal(document.title, t('app.title'), 'the page title follows the default');
const lao = canvasFont(13);
assert(lao.includes("'Kom'"), `Lao canvas text uses Kom (${lao})`);
assert.equal(familyOf(lao), 'Kom', 'and Kom comes first, before any Thai fallback');
assert.equal(localeFontScale('lo') > 1, true, 'Lao letters sit smaller, so canvas type is nudged up');
assert(lao.includes('15px'), `a 13px label is drawn at 15px under Lao (${lao})`);
assert(canvasFont(11, 500).startsWith('500 '), 'weight is preserved for Lao too');
assert(canvasFont(11, 500).includes("'Kom'"), 'and so is the face');
log('lao default ok');

// ---- 2. A saved Thai choice overrides the new default ----
setLocale('th');
initI18n();
assert.equal(getLocale(), 'th', 'a saved Thai choice survives reload');
const thai = canvasFont(13);
assert.equal(thai, `300 13px ${canvasFontFamily('th')}`, 'the Thai font string is weight, size, stack');
assert(thai.includes("'Bai Jamjuree'"), 'Thai canvas text uses the Thai face');
assert.equal(localeFontScale('th'), 1, 'and needs no size nudge');
log('thai ok');

// ---- 3. English is its own switch, and switching back restores Lao ----
setLocale('en');
assert.equal(getLocale(), 'en', 'switching to English');
const english = canvasFont(13);
assert(english.includes("'Bai Jamjuree'"), 'English uses the body face');
assert.equal(localeFontScale('en'), 1, 'with no size nudge');
setLocale('lo');
assert(canvasFont(13).includes("'Kom'"), 'and Lao comes back');
log('en ok');

// ---- 4. the stylesheet and the canvas agree, family for family ----
const css = fs.readFileSync('src/styles/base.css', 'utf8');
const laoBlock = css.slice(css.indexOf("html[lang='lo']"), css.indexOf('}', css.indexOf("html[lang='lo']")));
const cssLaoBody = laoBlock.slice(laoBlock.indexOf('--font-body:'), laoBlock.indexOf(';', laoBlock.indexOf('--font-body:')));
const cssLaoFirst = cssLaoBody.split(':')[1].split(',')[0].trim().replace(/^'|'$/g, '');
assert.equal(cssLaoFirst, 'Kom', 'the stylesheet puts Kom first for Lao body text');
assert.equal(
  familyOf(canvasFont(13, 300, 'lo')),
  cssLaoFirst,
  'and the canvas is drawn in the very same face',
);
assert(css.includes("html[lang='lo']"), 'the Lao stylesheet block is what i18n.js toggles (html[lang])');
log('css parity ok');

// ---- 5. nobody hardcodes a canvas face again ----
for (const file of [
  'src/render/sprites.js',
  'src/render/world-renderer.js',
  'src/render/memory-renderer.js',
  'src/render/lighting.js',
  'src/prototypes/character-lab.js',
]) {
  const source = fs.readFileSync(file, 'utf8');
  for (const line of source.split('\n')) {
    if (!line.includes('ctx.font')) continue;
    assert(
      line.includes('canvasFont('),
      `${file}: canvas text must go through canvasFont() — found: ${line.trim()}`,
    );
  }
}
log('no hardcoded faces ok');

console.error('FONTS TEST OK — canvas text follows the locale (Kom for Lao, Thai for Thai) in step with the stylesheet');
