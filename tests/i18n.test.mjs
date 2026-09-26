import assert from 'node:assert/strict';

/*
 * The missing-key warning.
 *
 * `t()` reports a key it cannot find, once per key and locale, and still returns
 * the key so a screen keeps rendering instead of showing `undefined`. The same
 * guard runs ahead of time in scripts/check-i18n.mjs; this suite holds the
 * runtime half so a forgotten key is at least loud in the console.
 */

const warnings = [];
const original = console.warn;
console.warn = (...args) => warnings.push(args.join(' '));

try {
  const { t, tList, tDialogue, getLocale } = await import('../src/systems/i18n.js');

  const locale = getLocale();

  const present = t('form.human.name');
  assert.notEqual(present, 'form.human.name', 'a defined key resolves to its text');
  assert.equal(warnings.length, 0, 'a defined key does not warn');

  const missing = t('__missing__.form.name');
  assert.equal(missing, '__missing__.form.name', 'a missing key falls back to the key itself');
  assert.equal(warnings.length, 1, 'a missing key warns once');
  assert.match(warnings[0], /\[i18n\] missing string key "__missing__\.form\.name"/);
  assert.ok(warnings[0].includes(`"${locale}"`), 'the warning names the locale');

  t('__missing__.form.name');
  assert.equal(warnings.length, 1, 'the same key is not reported twice');

  const list = tList('hud.mind');
  assert.ok(Array.isArray(list) && list.length > 0, 'a defined list resolves');
  assert.deepEqual(tList('__missing__.list'), [], 'a missing list falls back to empty');
  assert.match(warnings.at(-1), /missing list key "__missing__\.list"/);

  assert.deepEqual(tDialogue('__missing__.dialogue'), [], 'a missing dialogue falls back to empty');
  assert.match(warnings.at(-1), /missing dialogue key "__missing__\.dialogue"/);

  console.error('[i18n] warning guard ok');
} finally {
  console.warn = original;
}
