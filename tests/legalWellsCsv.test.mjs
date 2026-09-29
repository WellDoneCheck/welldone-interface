import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLegalWellsCsv } from '../app/utils/legalWellsCsv.ts';

test('reads id, latitude and longitude by their Chinese headers in any order', () => {
  const result = parseLegalWellsCsv('地段,經度(WGS84),水井編號,緯度(WGS84)\n溪州,120.123,LW-1,23.456');
  assert.deepEqual(result, { ok: true, wells: [{ id: 'LW-1', latitude: 23.456, longitude: 120.123 }], skippedRows: 0 });
});

test('reads English headers', () => {
  const result = parseLegalWellsCsv('ID,Lat,Lng\nA,23.5,120.5');
  assert.equal(result.ok && result.wells[0].id, 'A');
});

test('names wells by their row when there is no id column', () => {
  const result = parseLegalWellsCsv('緯度,經度\n23.5,120.5');
  assert.equal(result.ok && result.wells[0].id, '第 2 列');
});

test('skips and counts rows with missing or out-of-range coordinates', () => {
  const result = parseLegalWellsCsv('編號,緯度,經度\nA,23.5,120.5\nB,,120.5\nC,95,120.5\nD,abc,120.5');
  assert.equal(result.ok && result.wells.length, 1);
  assert.equal(result.ok && result.skippedRows, 3);
});

test('fails when the latitude or longitude column is missing', () => {
  const result = parseLegalWellsCsv('編號,地址\nA,彰化');
  assert.equal(result.ok, false);
});

test('fails when no row has a usable coordinate', () => {
  const result = parseLegalWellsCsv('編號,緯度,經度\nA,,');
  assert.equal(result.ok, false);
});
