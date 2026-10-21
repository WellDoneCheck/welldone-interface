import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { canVerify, countVerdicts, getWellVerdicts, lookOf, saveVerdict, subscribeToWellVerdicts, VERDICT_COLOR, verdictOf } from '../app/utils/wellVerdicts.ts';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

let sent = [];
let status = 200;
beforeEach(() => {
  sent = [];
  status = 200;
  globalThis.fetch = async (url, init) => {
    sent.push({ url, method: init.method, body: JSON.parse(init.body) });
    return new Response(status === 200 ? '{}' : '{"message":"不可驗證"}', { status });
  };
});

const well = (id, wellId, verdict = null) => ({ id, wellId, verdict });

test('a well keeps the verdict it came with until verified here', () => {
  assert.equal(verdictOf(well('SW-2026-A001', 1, 'well'), {}), 'well');
  assert.equal(verdictOf(well('SW-2026-A002', 2), {}), null);
});

test('a verdict is saved on the backend, then every page shows it', async () => {
  await saveVerdict(well('SW-2026-A003', 3), 'not-well');
  assert.deepEqual(sent, [{ url: 'http://localhost:3000/wells/3/verdict', method: 'PATCH', body: { verdict: 'not-well' } }]);
  assert.equal(verdictOf(well('SW-2026-A003', 3)), 'not-well');
});

test('a verdict can be changed, also over the one a well came with', async () => {
  await saveVerdict(well('SW-2026-A004', 4, 'well'), 'not-well');
  assert.equal(verdictOf(well('SW-2026-A004', 4, 'well')), 'not-well');
});

test('a verdict the backend refuses is not shown', async () => {
  status = 403;
  await assert.rejects(saveVerdict(well('SW-2026-A005', 5), 'well'), /不可驗證/);
  assert.equal(verdictOf(well('SW-2026-A005', 5)), null);
});

test('listeners hear of every verdict, and the verdicts are a new object each time', async () => {
  let heard = 0;
  const unsubscribe = subscribeToWellVerdicts(() => heard++);
  const before = getWellVerdicts();
  await saveVerdict(well('SW-2026-A006', 6), 'well');
  assert.equal(heard, 1);
  assert.notEqual(getWellVerdicts(), before);
  unsubscribe();
});

test('the counts follow the verdicts given', () => {
  const wells = [well('a', 1, 'well'), well('b', 2), well('c', 3)];
  assert.deepEqual(countVerdicts(wells, {}), { verified: 1, pending: 2 });
  assert.deepEqual(countVerdicts(wells, { b: 'not-well' }), { verified: 2, pending: 1 });
});

test('viewers only look', () => {
  assert.equal(canVerify('viewer'), false);
  assert.equal(canVerify('operator'), true);
});

test('each verdict has its own look: red until verified, teal a well, grey not one', () => {
  assert.equal(lookOf(null), 'pending');
  assert.equal(lookOf('well'), 'well');
  assert.equal(new Set(Object.values(VERDICT_COLOR)).size, 3);
});
