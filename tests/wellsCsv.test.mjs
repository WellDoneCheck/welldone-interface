import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWellsCsv } from '../app/utils/wellsCsv.ts';

const verified = { id: 'SW-2023-A001', latitude: 23.456, longitude: 120.123, capturedAt: '2023-10-01 14:30', verdict: 'well' };
const pending = { id: 'SW-2023-A002', latitude: 23.5, longitude: 120.1, capturedAt: '2023-10-02 14:30', verdict: null };

function lines(csv) {
  return csv.replace(/^﻿/, '').split('\r\n');
}

test('starts with a UTF-8 BOM so Excel reads the Chinese header', () => {
  assert.ok(buildWellsCsv([]).startsWith('﻿'));
});

test('writes the header even without wells', () => {
  assert.deepEqual(lines(buildWellsCsv([])), ['編號,緯度,經度,拍攝時間,驗證狀態,判定結果']);
});

test('writes one row per well with status and verdict', () => {
  const [, first, second] = lines(buildWellsCsv([verified, { ...pending }]));
  assert.equal(first, 'SW-2023-A001,23.456,120.123,2023-10-01 14:30,已驗證,是井');
  assert.equal(second, 'SW-2023-A002,23.500,120.100,2023-10-02 14:30,未驗證,');
});

test('labels wells judged not to be wells', () => {
  const [, row] = lines(buildWellsCsv([{ ...verified, verdict: 'not-well' }]));
  assert.ok(row.endsWith(',已驗證,不是井'));
});

test('quotes fields containing commas or quotes', () => {
  const [, row] = lines(buildWellsCsv([{ ...verified, id: 'A,"B"' }]));
  assert.ok(row.startsWith('"A,""B""",'));
});
