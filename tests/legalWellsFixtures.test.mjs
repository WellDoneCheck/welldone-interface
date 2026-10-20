// The hand-testing CSVs in tests/fixtures/legal-wells give the results listed in docs/legal-well-compare-test-files.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decodeCsv } from '../app/utils/csv.ts';
import { parseLegalWellsCsv } from '../app/utils/legalWellsCsv.ts';
import { compareWells } from '../app/utils/wellComparison.ts';
import { EXPORT_WELLS } from '../app/data/exportWells.ts';

const DETECTED = EXPORT_WELLS.filter((well) => well.verdict !== 'not-well');
const load = (name) => parseLegalWellsCsv(decodeCsv(readFileSync(new URL(`./fixtures/legal-wells/${name}`, import.meta.url))));
const counts = (wells, tolerance) => {
  const result = compareWells(DETECTED, wells, tolerance);
  return [result.matched.length, result.unregistered.length, result.missing.length];
};

const SAMPLE_VARIANTS = ['01_標準範例_UTF8.csv', '02_Big5編碼.csv', '03_英文欄位.csv', '04_欄位順序不同_含備註.csv', '05_含無效座標.csv', '06_無編號欄位.csv'];

for (const name of SAMPLE_VARIANTS) {
  test(`${name} reads the 42 sample wells and compares to 33 / 12 / 9 at 15 m`, () => {
    const result = load(name);
    assert.equal(result.ok, true);
    assert.equal(result.wells.length, 42);
    assert.deepEqual(counts(result.wells, 15), [33, 12, 9]);
    assert.deepEqual(counts(result.wells, 50), [38, 7, 4]);
  });
}

test('05 skips its 6 invalid rows', () => {
  assert.equal(load('05_含無效座標.csv').skippedRows, 6);
});

test('06 names wells by row', () => {
  assert.equal(load('06_無編號欄位.csv').wells[0].id, '第 2 列');
});

test('07 and 08 are rejected', () => {
  assert.equal(load('07_錯誤_缺少經緯度欄位.csv').ok, false);
  assert.equal(load('08_錯誤_只有標題列.csv').ok, false);
});

test('09 reads all 1,284 wells', () => {
  const result = load('09_大量資料_1284筆.csv');
  assert.equal(result.wells.length, 1284);
  assert.deepEqual(counts(result.wells, 15), [33, 12, 1251]);
});

test('10 matches every detection', () => {
  assert.deepEqual(counts(load('10_全部吻合.csv').wells, 15), [45, 0, 0]);
});
