import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PIN_POP_MS, popDelay, popDuration, poppingIds } from '../app/utils/pinPop.ts';

test('the map\'s first pins all pop in', () => {
  assert.deepEqual(poppingIds(null, ['A001', 'A002']), ['A001', 'A002']);
});

test('later, only the pins new to the map pop in', () => {
  assert.deepEqual(poppingIds(new Set(['A001', 'A002']), ['A001', 'A002', 'A003']), ['A003']);
});

test('a pin taken off pops nothing in', () => {
  assert.deepEqual(poppingIds(new Set(['A001', 'A002']), ['A001']), []);
});

test('pins popping in together go one after another', () => {
  assert.equal(popDelay(0, 3), 0);
  assert.equal(popDelay(1, 3), 60);
  assert.equal(popDelay(2, 3), 120);
  assert.equal(popDuration(3), 120 + PIN_POP_MS);
});

test('a lone pin pops in at once', () => {
  assert.equal(popDelay(0, 1), 0);
  assert.equal(popDuration(1), PIN_POP_MS);
});

test('a whole map of pins still all start within the stagger limit', () => {
  assert.equal(popDelay(200, 201), 1200);
  assert.ok(popDelay(1, 201) < 60);
});
