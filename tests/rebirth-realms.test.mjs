import assert from 'node:assert/strict';

/*
 * คติภูมิ — where a mind is reborn (design §4, docs/samsara.md).
 *
 * The resolver reads the fruit *and* the roots: the strongest tendency decides,
 * unless a wholesome one is at least as strong — then concentration climbs the
 * jhāna ladder through the form and formless planes, metta opens the deva planes,
 * and lesser merit returns a human birth. This suite pins the mapping down in the
 * repository (the same cases the karma harness checks) so the module cannot be lost
 * or rewritten without a red test, and it checks that every reason it can return is
 * actually translated.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const { resolveRebirth, rebirthReasonKeys, rebirthPlanes } = await import('../src/systems/rebirth.js');
const { resetKarma, recordKarma, getKarma } = await import('../src/systems/karma.js');
const { REALMS, realmById } = await import('../src/content/realms.js');

const log = (message) => console.error(`[realms] ${message}`);
const after = (id, times) => { resetKarma(); recordKarma(id, times); return resolveRebirth(getKarma()); };

// ---- 1. the roots decide, and both fruit and tendency are read ----
const CASES = [
  ['harm', 3, 'niraya', 'hatred ripens in the hells'],
  ['steal', 2, 'peta', 'greed ripens among the petas'],
  ['lie', 2, 'tiracchana', 'delusion ripens among the animals'],
  ['cling', 2, 'asurakaya', 'clinging ripens among the asuras'],
  ['meditate', 4, 'mahabrahma', 'collected mind (8) reaches the brahmā planes'],
  ['meditate', 5, 'akasanancayatana', 'absorption (10) reaches the first formless plane'],
  ['meditate', 7, 'vinnanancayatana', 'absorption (14) goes further into the formless'],
  ['letgo', 2, 'yama', 'goodwill opens the deva planes'],
  ['mindful', 1, 'manussa', 'small merit returns a human birth'],
];
for (const [id, times, realmId, why] of CASES) {
  const got = after(id, times);
  assert.equal(got.realmId, realmId, `${id} ×${times}: ${why}`);
  assert(realmById(got.realmId), `${id}: the named plane exists`);
}
log(`mapping ok — ${CASES.length} cases`);

// ---- 2. the dominant tendency decides when both are present ----
{
  resetKarma();
  recordKarma('harm', 3);
  recordKarma('steal', 1);
  assert.equal(resolveRebirth(getKarma()).realmId, 'niraya', 'the heavier tendency weighs more than the lighter one');
  resetKarma();
  recordKarma('meditate', 4);
  recordKarma('harm', 1);
  assert.equal(resolveRebirth(getKarma()).realmId, 'mahabrahma', 'and a stronger collected mind outweighs a little harm');
  resetKarma();
  const clean = resolveRebirth(getKarma());
  assert.equal(clean.realmId, 'manussa', 'with no record at all, a human birth');
  log('dominance ok');
}

// Equal strengths follow the documented wholesome tie-break, regardless of order.
for (const tendencies of [{ anger: 3, metta: 3 }, { metta: 3, anger: 3 }]) {
  assert.equal(resolveRebirth({ tendencies }).realmId, 'tavatimsa');
}
assert.equal(resolveRebirth({ tendencies: { anger: 3, metta: 3 }, merit: 9, demerit: 12 }).realmId,
  'niraya', 'when roots tie, heavier harmful fruit decides');
assert.equal(resolveRebirth({ tendencies: { anger: 3, metta: 3 }, merit: 12, demerit: 9 }).realmId,
  'tavatimsa', 'when roots tie, heavier wholesome fruit protects the higher rebirth');
assert.equal(resolveRebirth({ tendencies: { delusion: 2, sati: 2 } }).realmId, 'manussa');
assert.equal(resolveRebirth({ tendencies: { anger: 4, metta: 3 } }).realmId, 'niraya');

// ---- 3. every plane it names is a real plane, and every reason is translated ----
{
  const planes = rebirthPlanes();
  for (const [group, ids] of Object.entries(planes)) {
    const list = Array.isArray(ids) ? ids : [ids];
    for (const id of list) assert(realmById(id), `${group}: ${id} exists among the 31 planes`);
  }
  assert.equal(REALMS.length, 31, 'the wheel still has 31 planes');
  const keys = rebirthReasonKeys();
  assert(keys.length >= 9, `the resolver names its reasons (${keys.length} keys)`);
  for (const lang of ['th', 'lo', 'en']) {
    const source = readFileSync(fileURLToPath(new URL(`../src/locales/${lang}.js`, import.meta.url)), 'utf8');
    for (const key of keys) {
      assert(source.includes(`'${key}'`), `${lang}: '${key}' is translated`);
    }
  }
  // And the keys are the ones the interlude and end screen print.
  for (const key of keys) assert(key.startsWith('rebirth.reason.'), `${key} is a reason the UI can print`);
  log(`reasons ok — ${keys.length} keys × 3 locales`);
}

console.error('REBIRTH REALMS TEST OK — fruit and roots read together, 31 planes, and every reason named in three languages');

// Mindfulness accompanies meditation and is also earned during ordinary play.
// It must not turn an otherwise identical heaven/Brahma destination into human.
for (const [action, times, expected] of [
  ['meditate', 4, 'mahabrahma'], ['compassion', 1, 'tavatimsa'],
]) {
  resetKarma();
  recordKarma(action, times);
  recordKarma('mindful', 2);
  assert.equal(resolveRebirth(getKarma()).realmId, expected);
}
assert.equal(resolveRebirth({ tendencies: { sati: 100 } }).realmId, 'manussa');
