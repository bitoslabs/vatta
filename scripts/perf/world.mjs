import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import { assembleRooms, blockedAt, validateRoute, validateCatRoute, validateRabbitRoute } from '../../src/world/rooms.js';

// Fixed inputs, measured outside tests (some tests stub global performance.now).
const samples = [];
function measure(name, run) {
  run(); // warm up
  const times = [];
  let checksum;
  for (let i = 0; i < 3; i++) {
    const start = performance.now();
    checksum = run();
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  samples.push({ name, medianMs: +times[1].toFixed(3), checksum });
}
const features = assembleRooms(7919, 'memory-forest');
measure('collision-grid', () => {
  let hits = 0;
  for (let y = 0; y < 3000; y += 40) for (let x = 0; x < 4600; x += 40) {
    hits += Number(blockedAt(features, x, y, { climbing: true }));
  }
  return hits;
});
measure('route-validation', () => {
  let hits = 0;
  for (let seed = 1; seed <= 4; seed++) {
    const world = assembleRooms(seed * 7919, 'memory-forest');
    hits += Number(validateRoute(world, 'human').ok);
    hits += Number(validateCatRoute(world).ok);
    hits += Number(validateRabbitRoute(world).ok);
  }
  return hits;
});
const report = { node: process.version, platform: process.platform, arch: process.arch, features: features.length, samples };
console.log(JSON.stringify(report, null, 2));
const out = process.argv.find(a => a.startsWith('--out='))?.slice(6);
if (out) writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
