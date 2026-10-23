import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadRegistry, matchRegistry, toWellComparison } from '../app/utils/wellRegistry.ts';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const cmpWell = (id, code, extra = {}) => ({ id, code, latitude: 23.5, longitude: 120.5, confidence: 0.9, verdict: null, to_register: false, to_register_at: null, ...extra });
const legal = (id, well_id) => ({ id, well_id, latitude: 23.5001, longitude: 120.5 });
const comparison = {
  tolerance_m: 15,
  matched: [{ well: cmpWell(1, 'SW-2026-A001'), registry: legal(1, 'L1'), distance_m: 11 }],
  unregistered: [{ well: cmpWell(2, 'SW-2026-A002', { to_register: true }), nearest_registry: null, distance_m: null }],
  missing: [{ registry: legal(2, 'L2'), nearest_well: cmpWell(1, 'SW-2026-A001'), distance_m: 40 }],
};
const source = { file_name: '清冊.csv', imported: 2, skipped: 1 };

// Answers by method and path; a path left out answers its status (default 404)
function backend(answers, calls = []) {
  globalThis.fetch = async (url, init = {}) => {
    const key = `${init.method ?? 'GET'} ${new URL(url).pathname}`;
    calls.push(key);
    const answer = answers[key] ?? { status: 404 };
    return new Response(JSON.stringify(answer.body ?? { message: 'x' }), { status: answer.status ?? 200 });
  };
  return calls;
}

test('the comparison names wells by code and legal wells by their register number', () => {
  const result = toWellComparison(comparison);
  assert.deepEqual(result.matched[0], { detected: { id: 'SW-2026-A001', latitude: 23.5, longitude: 120.5 }, legal: { id: 'L1', latitude: 23.5001, longitude: 120.5 }, distance: 11 });
  assert.equal(result.unregistered[0].nearestLegal, null);
  assert.deepEqual(result.missing[0].nearestDetected, { point: { id: 'SW-2026-A001', latitude: 23.5, longitude: 120.5 }, distance: 40 });
});

test('matching sends the tolerance and reads back the wells to register', async () => {
  const calls = backend({ 'POST /tasks/t/well-registry/match': {}, 'GET /tasks/t/well-registry/comparison': { body: comparison } });
  const result = await matchRegistry('t', source, 15);
  assert.deepEqual(calls, ['POST /tasks/t/well-registry/match', 'GET /tasks/t/well-registry/comparison']);
  assert.equal(result.tolerance, 15);
  assert.deepEqual(result.wellIds, { 'SW-2026-A001': 1, 'SW-2026-A002': 2 });
  assert.deepEqual([...result.toRegister], ['SW-2026-A002']);
});

test('a map without a register has nothing to show', async () => {
  backend({});
  assert.equal(await loadRegistry('t', 15), null);
});

test('a register not compared yet is compared on opening', async () => {
  const answers = {
    'GET /tasks/t/well-registry/source': { body: source },
    'GET /tasks/t/well-registry/comparison': { status: 409 },
    'POST /tasks/t/well-registry/match': {},
  };
  const calls = backend(answers);
  const fetchFirst = globalThis.fetch;
  // once matched, the comparison is there
  globalThis.fetch = async (url, init = {}) => {
    if (init.method === 'POST') answers['GET /tasks/t/well-registry/comparison'] = { body: comparison };
    return fetchFirst(url, init);
  };
  const result = await loadRegistry('t', 15);
  assert.deepEqual(calls, ['GET /tasks/t/well-registry/source', 'GET /tasks/t/well-registry/comparison', 'POST /tasks/t/well-registry/match', 'GET /tasks/t/well-registry/comparison']);
  assert.equal(result.source.file_name, '清冊.csv');
});

test('a register left compared is shown as it was', async () => {
  backend({ 'GET /tasks/t/well-registry/source': { body: source }, 'GET /tasks/t/well-registry/comparison': { body: { ...comparison, tolerance_m: 30 } } });
  assert.equal((await loadRegistry('t', 15)).tolerance, 30);
});
