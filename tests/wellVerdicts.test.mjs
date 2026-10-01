import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countVerdicts, getWellVerdicts, setWellVerdict, subscribeToWellVerdicts, verdictOf } from '../app/utils/wellVerdicts.ts';
import { EXPORT_WELLS } from '../app/data/exportWells.ts';

// A stand-in for the browser's localStorage and window
const stored = new Map();
globalThis.localStorage = {
  getItem: (key) => (stored.has(key) ? stored.get(key) : null),
  setItem: (key, value) => stored.set(key, String(value)),
};
globalThis.window = { addEventListener() {}, removeEventListener() {} };

const pending = EXPORT_WELLS.filter((well) => well.verdict === null);

test('a well keeps the verdict it came with until verified here', () => {
  assert.equal(verdictOf(EXPORT_WELLS[0]), EXPORT_WELLS[0].verdict);
  assert.equal(verdictOf(pending[0]), null);
  assert.equal(verdictOf({ id: 'SW-2023-B001' }), null, 'a well not on the export page starts unverified');
});

test('a verdict given on one page is the one every page shows, and is saved', () => {
  setWellVerdict(pending[0].id, 'not-well');
  assert.equal(verdictOf(pending[0]), 'not-well');
  assert.deepEqual(JSON.parse(stored.get('skywell:well-verdicts')), { [pending[0].id]: 'not-well' });
});

test('a verdict can be changed, also over the one a well came with', () => {
  setWellVerdict(pending[0].id, 'well');
  setWellVerdict(EXPORT_WELLS[0].id, 'not-well');
  assert.equal(verdictOf(pending[0]), 'well');
  assert.equal(verdictOf(EXPORT_WELLS[0]), 'not-well');
});

test('the counts follow the verdicts given', () => {
  const before = countVerdicts(EXPORT_WELLS, {});
  assert.deepEqual(before, { verified: 100, pending: 5 });
  const after = countVerdicts(EXPORT_WELLS, { [pending[1].id]: 'well', [pending[2].id]: 'not-well' });
  assert.deepEqual(after, { verified: 102, pending: 3 });
});

test('listeners hear of every verdict, and the verdicts are a new object each time', () => {
  let heard = 0;
  const unsubscribe = subscribeToWellVerdicts(() => heard++);
  const before = getWellVerdicts();
  setWellVerdict(pending[3].id, 'well');
  assert.equal(heard, 1);
  assert.notEqual(getWellVerdicts(), before);
  unsubscribe();
});
