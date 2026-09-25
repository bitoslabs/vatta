import assert from 'node:assert/strict';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanTree } from '../deploy/graph.mjs';

/*
 * The module graph (a lesson from building the deploy): a missing source import
 * can break the production build or leave the game blank in development, and a
 * file nothing imports is a file nobody maintains. The reading is
 * done by deploy/graph.mjs, the same code `npm run deploy:check` reports with.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const log = (message) => console.error(`[imports] ${message}`);
const tree = scanTree(ROOT);

const jsFiles = tree.jsFiles;
assert(jsFiles.length > 100, `the source is there to check (${jsFiles.length} modules)`);

// ---- 1. every JS specifier resolves, and none leaves the tree ----
assert.deepEqual(tree.problems, [], 'every import in the game resolves inside the tree');
log(`imports ok — ${jsFiles.length} modules, ${tree.edges} import statements`);

// ---- 2. every CSS @import resolves too ----
assert.deepEqual(tree.cssProblems, [], 'every local stylesheet import resolves');
log(`styles ok — ${tree.cssFiles.length} stylesheets`);

// ---- 3. everything is reachable from the entry point (or is a named dev tool) ----
assert(tree.reachable.has(tree.entry), 'the entry point is part of the graph');
assert.deepEqual(tree.orphans, [], 'no module is left outside the graph, and the graph has no dead ends');
log(`reachability ok — ${tree.reachable.size} modules reachable from ${join('src', 'main.js')}`);

// ---- 4. the page's own references exist, and the externals are only fonts and links ----
assert.deepEqual(tree.missingLocals, [], 'every local reference in index.html exists');
assert(tree.locals.includes('src/main.js'), 'and the entry point is one of them');
const ALLOWED_EXTERNALS = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|fonts\.mts\.la|github\.com\/bitoslabs|bitos\.space)/;
const externalFiles = tree.externals.filter((url) => !ALLOWED_EXTERNALS.test(url));
assert.deepEqual(externalFiles, [],
  'the only external requests are the font stylesheets and the maker\u2019s own links');
log(`page ok — ${tree.locals.length} local references, ${tree.externals.length} font requests`);

console.error('IMPORTS TEST OK — modules resolve and are reachable; local page references exist');
