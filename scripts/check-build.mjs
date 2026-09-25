import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const pages = ['index.html', 'character-lab.html'];

function filesUnder(folder) {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

export function checkBuild() {
  const problems = [];
  if (!existsSync(dist)) return { problems: ['dist/ is missing; run npm run build'], bytes: 0, gzipBytes: 0, files: [] };
  for (const page of pages) {
    const path = join(dist, page);
    if (!existsSync(path)) { problems.push(`${page} is missing`); continue; }
    const html = readFileSync(path, 'utf8');
    const links = [...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)].map((match) => match[1]);
    const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)].map((match) => match[1]);
    if (!scripts.some((url) => /\/assets\/[^/]+-[A-Za-z0-9_-]+\.js$/.test(url))) {
      problems.push(`${page} has no fingerprinted JavaScript entry`);
    }
    for (const url of links) {
      if (/^(https?:|\/\/|data:|#|mailto:)/.test(url)) continue;
      const local = resolve(dirname(path), decodeURI(url.split(/[?#]/)[0]));
      if (!local.startsWith(dist + sep) || !existsSync(local)) problems.push(`${page} has an unresolved asset: ${url}`);
      if (/^(?:\.\/)?src\//.test(url)) problems.push(`${page} still points to source: ${url}`);
    }
  }
  const files = filesUnder(dist);
  for (const file of files) if (file.endsWith('.map')) problems.push(`source map shipped: ${file}`);
  const inputs = [
    ...pages.map((page) => join(root, page)),
    join(root, 'vite.config.js'), join(root, 'package.json'), join(root, 'package-lock.json'),
    ...filesUnder(join(root, 'src')),
    ...filesUnder(join(root, 'assets')),
  ];
  const newestInput = Math.max(...inputs.map((file) => statSync(file).mtimeMs));
  if (existsSync(join(dist, 'index.html')) && statSync(join(dist, 'index.html')).mtimeMs + 1 < newestInput) {
    problems.push('dist/ is older than the source; run npm run build again');
  }
  const bytes = files.reduce((total, file) => total + statSync(file).size, 0);
  const gzipBytes = files.reduce((total, file) => total + gzipSync(readFileSync(file)).length, 0);
  return { problems, bytes, gzipBytes, files };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkBuild();
  console.log(`build check — ${result.files.length} files · ${(result.bytes / 1024).toFixed(0)} KiB raw · ${(result.gzipBytes / 1024).toFixed(0)} KiB gzip`);
  if (result.problems.length) {
    for (const problem of result.problems) console.error(`  ✗ ${problem}`);
    process.exitCode = 1;
  } else console.log('build check OK');
}
