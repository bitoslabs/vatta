import assert from 'node:assert/strict';

import { getKarma, importKarma, exportKarma, recordKarma, resetKarma } from '../src/systems/karma.js';
import { getPreceptStatus } from '../src/systems/precepts.js';
import { resolveRebirth } from '../src/systems/rebirth.js';

resetKarma();
assert.equal(recordKarma('panic'), false, 'fear is not an immoral intention');
assert.equal(getKarma().demerit, 0);
assert.equal(getPreceptStatus().find((entry) => entry.id === 'surameraya').kept, true,
  'fear does not break the intoxication precept');
recordKarma('cling');
assert.equal(getPreceptStatus().find((entry) => entry.id === 'kamesu').kept, true,
  'ordinary attachment does not break the sexual misconduct precept');

importKarma({ merit: 0, demerit: 6, akusala: 2,
  roots: { moha: 2 }, tendencies: { delusion: 2 },
  actions: [{ actionId: 'panic', times: 2 }] });
assert.equal(getKarma().demerit, 0, 'old saves lose the mistaken demerit from fear');
assert.equal(getKarma().tendencies.delusion, 0);
assert.equal(getPreceptStatus().find((entry) => entry.id === 'surameraya').kept, true);
const migrated = exportKarma();
importKarma(migrated);
assert.equal(getKarma().demerit, 0, 'the migration runs only once');

resetKarma();
recordKarma('harm');
assert.equal(resolveRebirth(getKarma()).realmId, 'niraya');
resetKarma();
recordKarma('compassion');
assert.equal(resolveRebirth(getKarma()).realmId, 'tavatimsa');

console.error('KARMA AUDIT TEST OK — intention, old-save migration, precepts and opposing rebirths');
