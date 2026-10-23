import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildComparisonCsv } from '../app/utils/wellComparison.ts';

const point = (id, latitude, longitude = 120.5) => ({ id, latitude, longitude });
const comparison = {
  matched: [{ detected: point('D1', 23.5), legal: point('L1', 23.5001), distance: 11.1 }],
  unregistered: [{ detected: point('D2', 23.6), nearestLegal: null }],
  missing: [{ legal: point('L2', 23.7), nearestDetected: { point: point('D2', 23.6), distance: 11119 } }],
};
const rows = (csv) => csv.replace(/^\uFEFF/, '').split('\r\n');

test('writes every category to the CSV', () => {
  const lines = rows(buildComparisonCsv(comparison));
  assert.equal(lines[0], '類別,辨識編號,辨識緯度,辨識經度,合法井編號,合法井緯度,合法井經度,距離(公尺),登記處理');
  assert.deepEqual(lines.slice(1).map((line) => line.split(',')[0]), ['合法已辨識', '疑似未登記', '清冊未辨識']);
  assert.equal(lines[1], '合法已辨識,D1,23.5,120.5,L1,23.5001,120.5,11,');
  assert.equal(lines[3], '清冊未辨識,D2,23.6,120.5,L2,23.7,120.5,11119,');
});

test('marks suspected unregistered wells picked for registration', () => {
  const lines = rows(buildComparisonCsv(comparison, new Set(['D2'])));
  assert.equal(lines[2], '疑似未登記,D2,23.6,120.5,,,,,待登記');
});
