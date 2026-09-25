# Testing

No framework, no dependencies, no build step: every suite is a plain ES module that
imports the game's modules, asserts, and prints one `… TEST OK` line.

## Run

```bash
npm test                # every tests/*.test.mjs
npm test -- routes      # only suites whose path matches "routes"
npm test -- --list      # show what would run, run nothing
npm test -- --bail      # stop at the first failure
npm test -- --verbose   # also print each suite's own output
npm test -- --timeout=120000
npm test -- --no-syntax # skip the parse pass over src/

npm run test:watch      # re-run on changes under src/ and tests/
npm run test:all        # include tests/*.harness.mjs (slow dev harnesses)
npm run check           # node --check every module in src/
```

`tests/run.mjs` is the runner. It **discovers** the folder, so adding a test means
adding a file — there is no list to update anywhere. Each suite runs in its own
process, so module state (and a hung suite) cannot leak into the next one; a suite
that exceeds the timeout is killed and reported as a failure. The runner exits
non-zero if anything fails, so it can gate a deploy.

Before any suite runs, the runner checks that **every module under `src/` parses**.
A stray bracket used to surface as a confusing failure inside whichever suite
imported the file; now it is named in about a second.

## Writing a suite

```js
import assert from 'node:assert/strict';

// A minimal DOM so modules that touch the page can be imported in Node.
globalThis.document = { querySelector: () => null, querySelectorAll: () => [] };
globalThis.window = { matchMedia: () => ({ matches: false }) };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };

const { state } = await import('../src/core/state.js');
assert.equal(state.chapter, 1, 'a fresh run starts at the first chapter');
console.error('EXAMPLE TEST OK — one sentence saying what is now guaranteed');
```

Conventions the existing suites follow:

- **Name the file `*.test.mjs`** and end with `console.error('<AREA> TEST OK — …')`,
  one sentence describing the promise, not the mechanics.
- **Import by path from `../src/…`**; suites are run from the repository root.
- **Do not assume another suite ran first.** Each one sets up `state` itself.
- **Test the rule, not the implementation**: the chapter suites assert behaviour
  through `loadChapter` + frames, the map suites assert that every seed validates,
  and the UI suites drive real clicks through `tests/helpers/dom.mjs`.
- **Assets and pure data can be asserted too** — `tests/fonts.test.mjs` compares the
  canvas font stack against the stylesheet, and `tests/routes.test.mjs` compares the
  stylesheet, the roads and the story beats for agreement.

## Slow suites

The map and life suites run hundreds of validated builds (60 seeds × route search),
so they take seconds each, not milliseconds. The whole default set is under a
minute. Anything slower or noisier belongs in a `*.harness.mjs` file, which only
runs with `npm run test:all`.

## Working notes

While developing, the same modules are also exercised by throwaway harnesses kept
outside the repository (`/var/folders/…/kilo/*.mjs`): 16 per-chapter smoke walks,
karma/path/precept/save/teacher/slots/life/render/i18n checks, and a `life-test`
that drives whole lives — including the animal lives — through the real frame loop.
They are scratch tools, not part of the project; anything that deserves to last is
promoted into `tests/` as a suite with an assertion and a sentence.

## The module graph (`tests/imports.test.mjs`)

The game has no build step, so every `import` is a browser request. This suite reads
the whole graph (`deploy/graph.mjs` — the same code `npm run deploy:check` reports
with) and fails if a specifier does not resolve, if one is not relative (a bare
import would need a bundler), if anything `index.html` references is missing, if a
module is left outside the graph (except the two named dev/legacy files), or if the
page makes an external request that is not a font stylesheet or the maker's own link.

`tests/sites.test.mjs` guards the map, `tests/poses.test.mjs` the bodies, and this
one guards the shelf they sit on.
