#!/usr/bin/env node
'use strict';

import { spawn, spawnSync } from 'node:child_process';
import { readdir, watch } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { SLOW_SUITES } from './suite-groups.mjs';

/*
 * The suite runner.
 *
 * Adding a test used to mean editing a very long line in package.json, which is
 * the kind of list that goes stale the first time someone is in a hurry. So the
 * runner discovers the folder instead: every `tests/*.test.mjs` is a suite, run in
 * its own process (module state cannot leak between suites), and the summary says
 * what passed in what time. `*.harness.mjs` files are for the slow, noisy dev
 * harnesses: they only run with `--all`.
 *
 *   npm test                  quick feedback (broad seed proofs are in test:full)
 *   npm run test:full         everything in tests/*.test.mjs
 *   npm test -- routes        only suites whose path matches "routes"
 *   npm test -- --all         include *.harness.mjs
 *   npm test -- --list        show what would run, run nothing
 *   npm test -- --bail        stop at the first failure
 *   npm test -- --verbose     show each suite's own output
 *   npm run test:watch       re-run the quick set on changes
 */

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const testsDir = here;

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((arg) => arg.startsWith('--')));
const filters = argv.filter((arg) => !arg.startsWith('--'));

function numberFlag(name, fallback) {
  const found = argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!found) return fallback;
  const parsed = Number(found.split('=')[1]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

const OPTIONS = {
  syntax: !flags.has('--no-syntax') && !flags.has('--quick'),
  syntaxOnly: flags.has('--syntax-only'),
  all: flags.has('--all'),
  quick: flags.has('--quick'),
  jobs: Math.max(1, Math.min(8, numberFlag('jobs', 2))),
  list: flags.has('--list'),
  bail: flags.has('--bail'),
  verbose: flags.has('--verbose'),
  watch: flags.has('--watch'),
  timeout: numberFlag('timeout', 120000),
  help: flags.has('--help') || flags.has('-h'),
};

const COLOR = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, text) => (COLOR ? `\u001B[${code}m${text}\u001B[0m` : text);
const green = (text) => paint('32', text);
const red = (text) => paint('31', text);
const dim = (text) => paint('2', text);
const bold = (text) => paint('1', text);

function usage() {
  process.stdout.write(`${bold('vatta test runner')}

  node tests/run.mjs [filter…] [--quick] [--all] [--jobs=N] [--list] [--bail] [--verbose] [--watch]

  filter       substring match against the suite's path (e.g. "bat", "tests/fonts")
  --quick      omit broad seeded route suites unless a filter is supplied
  --all        also run *.harness.mjs (slow dev harnesses)
  --jobs=N     run N isolated suites concurrently (default 2, max 8)
  --no-syntax  skip the node --check pass over src/ that runs first
  --syntax-only just check that every module parses, run no suites (npm run check)
  --list       list what would run, then exit
  --bail       stop at the first failure
  --verbose    print each suite's own output as well as the summary
  --timeout=ms per-suite limit (default 120000)
  --watch      re-run on changes under src/ and tests/

Suites are discovered: any tests/*.test.mjs file is one. Nothing to edit here when
a test is added.
`);
}

/**
 * A syntax pass over every module before any suite runs.
 *
 * A stray bracket used to surface as a confusing failure inside whichever suite
 * imported it. `node --check` finds it in about a second and names the file, so
 * the runner does that first (skip with `--no-syntax`).
 */
function modulesUnder(dir) {
  const out = [];
  const walk = (at) => {
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      const path = join(at, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.js')) out.push(path);
    }
  };
  walk(dir);
  return out.sort();
}

function scanSyntax() {
  const files = modulesUnder(join(root, 'src'));
  const broken = [];
  for (const file of files) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) {
      const message = (result.stderr || '').split('\n').find((line) => line.includes('Error')) || 'syntax error';
      broken.push(`${relative(root, file)}: ${message.trim()}`);
    }
  }
  return { checked: files.length, broken };
}

function nameOf(file) {
  return relative(testsDir, file).replace(/\.(test|harness)\.mjs$/, '');
}

function discover() {
  let names = [];
  try {
    names = readdirSync(testsDir);
  } catch {
    return [];
  }
  const wanted = OPTIONS.all ? ['.test.mjs', '.harness.mjs'] : ['.test.mjs'];
  return names
    .filter((name) => wanted.some((suffix) => name.endsWith(suffix)))
    .sort()
    .map((name) => join(testsDir, name))
    .filter((file) => {
      const suite = nameOf(file);
      if (!filters.length) return !OPTIONS.quick || !SLOW_SUITES.has(suite);
      const rel = relative(root, file);
      return filters.some((needle) => rel.includes(needle));
    });
}

function runSuite(file) {
  const started = Date.now();
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [file], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    const collect = (chunk) => {
      output += chunk;
      if (output.length > 200000) output = output.slice(-100000); // keep a sane tail
    };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      output += `\n[runner] killed after ${OPTIONS.timeout}ms\n`;
    }, OPTIONS.timeout);

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ file, code, output, ms: Date.now() - started });
    });
  });
}

function tail(output, lines = 14) {
  const clean = output.replace(/\u001B\[\d+m/g, '').trimEnd().split('\n');
  return clean.slice(-lines).join('\n');
}

function pad(text, width) {
  return text.length >= width ? text : text + ' '.repeat(width - text.length);
}

async function runAll() {
  if (OPTIONS.syntax) {
    const { checked, broken } = scanSyntax();
    if (broken.length) {
      process.stdout.write(`${red('syntax errors')} — nothing was run\n\n`);
      for (const line of broken) process.stdout.write(`  ${red('✗')} ${line}\n`);
      process.stdout.write(`\n${broken.length} of ${checked} modules would not parse\n`);
      return 1;
    }
    if (!OPTIONS.list) process.stdout.write(`${dim(`${checked} modules parse`)}\n`);
  }

  const files = discover();
  if (!files.length) {
    process.stdout.write(`${red('no suites found')}${filters.length ? ` matching: ${filters.join(', ')}` : ''}\n`);
    return 1;
  }
  if (OPTIONS.list) {
    for (const file of files) process.stdout.write(`${relative(root, file)}\n`);
    return 0;
  }

  const width = Math.max(...files.map((file) => relative(testsDir, file).replace(/\.(test|harness)\.mjs$/, '').length));
  process.stdout.write(`${bold(`vatta · ${files.length} ${files.length === 1 ? 'suite' : 'suites'}`)}\n\n`);

  let failed = 0;
  let passed = 0;
  const startedAll = Date.now();

  let next = 0;
  let stop = false;
  async function worker() {
    while (next < files.length && !stop) {
      const file = files[next++];
      const name = nameOf(file);
      const result = await runSuite(file);
      const ok = result.code === 0;
      const time = `${(result.ms / 1000).toFixed(2)}s`;
      if (ok) {
        passed++;
        process.stdout.write(`  ${green('✓')} ${pad(name, width)}  ${dim(time)}\n`);
      } else {
        failed++;
        process.stdout.write(`  ${red('✗')} ${pad(name, width)}  ${dim(time)}\n`);
        process.stdout.write(`${red('  ── output (tail) ──')}\n`);
        process.stdout.write(`${tail(result.output).split('\n').map((line) => `    ${line}`).join('\n')}\n`);
        if (result.code === null) process.stdout.write(`    ${dim('(killed)')}\n`);
        if (OPTIONS.bail) stop = true;
      }
      if (OPTIONS.verbose && ok) {
        process.stdout.write(`${tail(result.output, 40).split('\n').map((line) => `    ${dim(line)}`).join('\n')}\n`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(OPTIONS.jobs, files.length) }, worker));

  const seconds = ((Date.now() - startedAll) / 1000).toFixed(1);
  const summary = `${passed} passed · ${failed ? red(`${failed} failed`) : '0 failed'} · ${seconds}s`;
  process.stdout.write(`\n${failed ? red('✗') : green('✓')} ${summary}\n`);
  return failed ? 1 : 0;
}

/** Re-run whenever anything under src/ or tests/ changes. */
function watchMode() {
  let running = false;
  let queued = false;
  const trigger = () => {
    if (running) {
      queued = true;
      return;
    }
    running = true;
    runAll().then(() => {
      running = false;
      if (queued) {
        queued = false;
        trigger();
      }
    });
  };

  const watched = [join(root, 'src'), join(root, 'tests')];
  for (const dir of watched) {
    try {
      if (statSync(dir).isDirectory()) {
        readdir(dir, () => {}); // touch, so a missing dir is reported early
        watch(dir, { recursive: true }, () => trigger());
      }
    } catch {
      /* a folder that is not there is simply not watched */
    }
  }
  process.stdout.write(`${dim('watching src/ and tests/ — ctrl-c to stop')}\n`);
  trigger();
}

if (OPTIONS.help) {
  usage();
} else if (OPTIONS.syntaxOnly) {
  const { checked, broken } = scanSyntax();
  for (const line of broken) process.stdout.write(`${red('✗')} ${line}\n`);
  process.stdout.write(`${broken.length ? red(`${broken.length} of ${checked} modules would not parse`) : `${green('✓')} ${checked} modules parse`}\n`);
  process.exitCode = broken.length ? 1 : 0;
} else if (OPTIONS.watch) {
  watchMode();
} else {
  process.exitCode = await runAll();
}
