import assert from 'node:assert/strict';

/*
 * The map's fixed sites must not be able to wall each other's errands.
 *
 * Every animal site's key points — a seed cache, a burrow mouth, a ford log — are
 * *places a life walks to in whatever plane it is born in* (systems/biome.js decides
 * the plane from kamma, and the goals do not move with it). So no plane's fixed
 * geometry may seal any of them: a wall in the city that closes around a cache makes
 * one whole kind of life unplayable in that plane.
 *
 * This is the check that caught the §7 room sets standing on top of each other and
 * on the forest's seed cache, and it is why the tree scatter is a jittered grid
 * rather than a running sample (world-data.js#TREES): adding one keepout must not
 * move trunks somewhere else and wall an errand.
 */

const { assembleRooms, blockedAt } = await import('../src/world/rooms.js');
const { BIOMES } = await import('../src/content/biomes.js');
const { WORLD } = await import('../src/core/constants.js');
const wd = await import('../src/world/world-data.js');

const log = (message) => console.error(`[sites] ${message}`);

/** The points each animal life stands on, and the site they belong to. */
const keys = [];
const add = (site, name, point, r = 80) => {
  if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) keys.push({ site, name, x: point.x, y: point.y, r });
};
add('seeds', 'cache', wd.SEEDS.cache);
wd.SEEDS.canopies.forEach((point, i) => add('seeds', `crown${i}`, point));
add('burrow', 'chamber', wd.BURROW.chamber);
add('burrow', 'mouth', wd.BURROW.mouth);
add('nest', 'chamber', wd.NEST.chamber);
add('nest', 'crack', wd.NEST.crack);
add('marsh', 'cove', wd.MARSH.cove);
add('crevice', 'crack', wd.CREVICE.crack);
add('field', 'field', wd.FIELD.field);
add('grove', 'grove', wd.GROVE.grove);
add('enclosure', 'refuge', wd.ENCLOSURE.center);
add('tide', 'home', wd.TIDE.home);
add('tide', 'farPool', wd.TIDE.farPool);
add('otter', 'holt', wd.OTTER.holt);
add('blooms', 'hive', wd.BLOOMS.hive);
wd.HOMES.forEach((home, i) => add('homes', `home${i}`, home));
add('homes', 'warmStone', wd.WARM_STONE);
add('ford', 'log', wd.FORD.log);
add('ford', 'pasture', wd.FORD.pasture);
add('damp', 'garden', wd.DAMP.garden);
add('damp', 'hollow', wd.DAMP.hollow);
add('boar', 'feed', wd.BOAR.feed);
add('boar', 'wallow', wd.BOAR.wallow);
wd.BOAR.patches.forEach((patch, i) => add('boar', `patch${i}`, patch));
add('web', 'near', wd.WEB.near);
add('web', 'hollow', wd.WEB.hollow);
add('web', 'postOut', wd.WEB.anchorOut);
add('web', 'postIn', wd.WEB.anchorIn);

const STEP = 20;
const gridFor = (features, abilities) => {
  const pad = 260;
  const cols = Math.ceil((WORLD.w + pad * 2) / STEP);
  const rows = Math.ceil((WORLD.h + pad * 2) / STEP);
  const blocked = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = -pad + c * STEP + STEP / 2;
      const y = -pad + r * STEP + STEP / 2;
      blocked[r * cols + c] = blockedAt(features, x, y, abilities) ? 1 : 0;
    }
  }
  return { blocked, cols, rows };
};
const escapes = (grid, point, dir) => {
  const { blocked, cols, rows } = grid;
  const index = (c, r) => r * cols + c;
  const start = { c: Math.floor((point.x + 260) / STEP), r: Math.floor((point.y + 260) / STEP) };
  const goal = { c: Math.floor((point.x + dir.x * 240 + 260) / STEP), r: Math.floor((point.y + dir.y * 240 + 260) / STEP) };
  const seen = new Uint8Array(cols * rows);
  const queue = [start];
  seen[index(start.c, start.r)] = 1;
  while (queue.length) {
    const cell = queue.shift();
    if (Math.abs(cell.c - goal.c) <= 1 && Math.abs(cell.r - goal.r) <= 1) return true;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = cell.c + dc;
      const r = cell.r + dr;
      if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
      const i = index(c, r);
      if (blocked[i] || seen[i]) continue;
      seen[i] = 1;
      queue.push({ c, r });
    }
  }
  return false;
};

const ABILITY_SETS = [{}, { climbing: true }, { small: true, leap: true }];
const seald = [];
for (const plane of Object.keys(BIOMES)) {
  const features = assembleRooms(7919, plane);
  const sites = BIOMES[plane].sites || [];
  for (const abilities of ABILITY_SETS) {
    const grid = gridFor(features, abilities);
    for (const key of keys) {
      if (sites.includes(key.site)) continue; // a plane does look after its own ground
      const ways = [];
      for (let k = 0; k < 8; k++) {
        const angle = (k / 8) * Math.PI * 2;
        ways.push(escapes(grid, key, { x: Math.cos(angle), y: Math.sin(angle) }));
      }
      if (ways.every((open) => open === false)) {
        seald.push(`${plane} (${JSON.stringify(abilities)}): ${key.site}.${key.name} at (${Math.round(key.x)},${Math.round(key.y)})`);
      }
    }
  }
}
assert.deepEqual(seald, [], 'no plane seals another site\'s key points');
log(`no site seals another ok — ${keys.length} key points × ${Object.keys(BIOMES).length} planes × ${ABILITY_SETS.length} bodies`);

// ---- the tree scatter is stable under new keepouts ----
{
  const { TREES } = wd;
  assert(TREES.length > 150, `the forest has trunks (${TREES.length})`);
  const tooClose = TREES.filter((tree) => tree.x < 20 || tree.y < 20 || tree.x > WORLD.w - 20 || tree.y > WORLD.h - 20);
  assert.deepEqual(tooClose, [], 'every trunk stands inside the world');
  // and the cache every squirrel walks to is not walled by them
  const { dist } = await import('../src/core/math.js');
  const nearCache = TREES.filter((tree) => dist(tree.x, tree.y, wd.SEEDS.cache.x, wd.SEEDS.cache.y) < tree.r + 20);
  assert.deepEqual(nearCache, [], 'no trunk stands on the seed cache');
  log(`trunks ok — ${TREES.length} trees`);
}

console.error('SITES TEST OK — every fixed site keeps its errands open in every plane, and no trunk walls another');
