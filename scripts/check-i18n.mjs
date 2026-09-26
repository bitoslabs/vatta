import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * The i18n guard.
 *
 * `t()` already warns at runtime when a key is missing (systems/i18n.js), but a
 * warning only fires once a screen is actually drawn. This script catches the
 * same gaps before the game runs: it derives every key the code can ask for —
 * from the content modules and from a scan of the source and pages — then
 * reports any a locale does not define. Exit code is non-zero when something is
 * missing, so CI can enforce it.
 *
 *   node scripts/check-i18n.mjs
 *   node scripts/check-i18n.mjs --json
 */

const root = fileURLToPath(new URL('..', import.meta.url));
const src = join(root, 'src');
const json = process.argv.includes('--json');

function modulesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return modulesUnder(path);
    return entry.name.endsWith('.js') ? [path] : [];
  });
}

// The same finer gait mapping as systems/forms.js:locomotionKind, read from the
// abilities each body declares.
function gaitOf(form) {
  const abilities = form.abilities || {};
  if (abilities.burrow === true) return 'burrow';
  if (abilities.flying === true) return 'glide';
  if (form.waterBound === true) return 'swim';
  if (abilities.climbing === true) return 'climb';
  if (abilities.leap === true) return 'hop';
  if (abilities.slither === true) return 'slither';
  return 'walk';
}

async function derivedKeys() {
  const [forms, precepts, factors, lures, realms, biomes, karma, questions] = await Promise.all([
    import(`${src}/content/forms.js`),
    import(`${src}/content/precepts.js`),
    import(`${src}/content/factors.js`),
    import(`${src}/content/lures.js`),
    import(`${src}/content/realms.js`),
    import(`${src}/content/biomes.js`),
    import(`${src}/content/karma-actions.js`),
    import(`${src}/content/questions.js`),
  ]);

  const strings = new Set();
  for (const form of forms.FORMS) {
    strings.add(`form.${form.id}.name`);
    strings.add(`form.${form.id}.ability`);
    strings.add(`gait.${gaitOf(form)}`);
    for (const map of form.maps || []) strings.add(`map.${map}`);
  }
  for (const precept of precepts.PRECEPTS) {
    strings.add(`precept.${precept.id}.name`);
    strings.add(`precept.${precept.id}.desc`);
  }
  for (const factor of factors.FACTORS) {
    strings.add(`path.${factor.id}.name`);
    strings.add(`path.${factor.id}.desc`);
  }
  for (const lure of lures.LURES) strings.add(`lure.${lure.id}.name`);
  for (const realm of realms.REALMS) {
    strings.add(`realm.${realm.id}.name`);
    strings.add(`realm.${realm.id}.desc`);
  }
  for (const biome of Object.values(biomes.BIOMES)) strings.add(biome.nameKey);
  for (const id of Object.keys(karma.KARMA_ACTIONS)) {
    strings.add(`karma.${id}.name`);
    strings.add(`karma.${id}.note`);
  }
  for (const id of Object.keys(karma.KARMA_ROOTS)) strings.add(`karma.root.${id}`);
  for (const question of questions.QUESTIONS) {
    for (let i = 0; i < 3; i += 1) strings.add(`q.${question.id}.a${i}`);
  }

  // Tendencies that can actually be drawn: the four unwholesome ranked ones
  // (systems/karma.js:TENDENCY_ORDER) plus the calm fallback the chapter pairs use.
  const karmaSource = readFileSync(join(src, 'systems/karma.js'), 'utf8');
  const order = karmaSource.match(/TENDENCY_ORDER\s*=\s*\[([^\]]*)\]/);
  if (order) {
    for (const match of order[1].matchAll(/'([^']+)'/g)) strings.add(`tendency.${match[1]}`);
  }
  strings.add('tendency.balanced');
  return { strings, lists: new Set() };
}

/** Keys literally written in the source: t('…'), tList('…'), key properties. */
function scannedKeys() {
  const strings = new Set();
  const lists = new Set();
  const call = (fn, target) => {
    const re = new RegExp(`\\b${fn}\\(\\s*(['"])([^'"]+)\\1`, 'g');
    for (const file of modulesUnder(src)) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(re)) target.add(match[2]);
    }
  };
  call('t', strings);
  call('tList', lists);

  const property = /\b(?:nameKey|subtitleKey|lessonKey|statsKey|titleKey|meterKey|labelKey|descKey)\s*:\s*(['"])([^'"]+)\1/g;
  const listProperty = /\bmindHintKey\s*:\s*(['"])([^'"]+)\1/g;
  for (const file of modulesUnder(src)) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(property)) strings.add(match[2]);
    for (const match of text.matchAll(listProperty)) lists.add(match[2]);
  }

  for (const page of ['index.html', 'character-lab.html']) {
    let html;
    try {
      html = readFileSync(join(root, page), 'utf8');
    } catch {
      continue;
    }
    for (const match of html.matchAll(/data-i18n(?:-html)?\s*=\s*"([^"]+)"/g)) strings.add(match[1]);
    for (const match of html.matchAll(/data-i18n-attr\s*=\s*"[^|"]+\|([^"]+)"/g)) strings.add(match[1]);
  }
  return { strings, lists };
}

/** Keys built from a template literal whose parts live in static source. */
function templateKeys() {
  const strings = new Set();
  const rooms = readFileSync(join(src, 'world/rooms.js'), 'utf8');
  for (const match of rooms.matchAll(/\bsite:\s*'([^']+)'/g)) strings.add(`site.${match[1]}`);
  const echoes = readFileSync(join(src, 'game/echoes.js'), 'utf8');
  for (const match of echoes.matchAll(/\bid:\s*'([^']+)'/g)) strings.add(`echo.${match[1]}`);
  return { strings, lists: new Set() };
}

function union(...sets) {
  const out = new Set();
  for (const set of sets) for (const key of set) out.add(key);
  return out;
}

const codes = ['en', 'lo', 'th'];
const localeData = {};
for (const code of codes) {
  const mod = await import(`${src}/locales/${code}.js`);
  localeData[code] = { strings: mod.default.strings, lists: mod.default.lists ?? {} };
}

const derived = await derivedKeys();
const scanned = scannedKeys();
const templated = templateKeys();
const required = {
  strings: union(derived.strings, scanned.strings, templated.strings),
  lists: union(derived.lists, scanned.lists, templated.lists),
};

const report = {};
for (const code of codes) {
  const missingStrings = [...required.strings].filter((key) => localeData[code].strings[key] === undefined);
  const missingLists = [...required.lists].filter((key) => localeData[code].lists[key] === undefined);
  report[code] = { strings: missingStrings.sort(), lists: missingLists.sort() };
}

const countOf = (entry) => entry.strings.length + entry.lists.length;
const missingTotal = codes.reduce((sum, code) => sum + countOf(report[code]), 0);
const checkedTotal = required.strings.size + required.lists.size;

if (json) {
  process.stdout.write(`${JSON.stringify({ checked: checkedTotal, missing: report }, null, 2)}\n`);
  process.exitCode = missingTotal ? 1 : 0;
} else {
  process.stdout.write(`i18n check — ${checkedTotal} keys expected (${required.strings.size} strings, ${required.lists.size} lists)\n\n`);
  for (const code of codes) {
    const entry = report[code];
    if (!countOf(entry)) {
      process.stdout.write(`  ${code}: ok\n`);
      continue;
    }
    process.stdout.write(`  ${code}: ${countOf(entry)} missing\n`);
    for (const key of entry.strings) process.stdout.write(`      [string] ${key}\n`);
    for (const key of entry.lists) process.stdout.write(`      [list]   ${key}\n`);
  }
  process.stdout.write(`\n${missingTotal ? `${missingTotal} missing key(s) across locales` : 'all locales complete'}\n`);
  process.exitCode = missingTotal ? 1 : 0;
}
