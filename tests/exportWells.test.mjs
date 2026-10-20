import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXPORT_WELLS, findExportWell } from '../app/data/exportWells.ts';

test('finds an export-page well by id, for opening it on the check page', () => {
  assert.equal(findExportWell('SW-2023-A001'), EXPORT_WELLS[0]);
});

test('returns nothing for an unknown or missing id', () => {
  assert.equal(findExportWell('SW-2023-A01'), undefined);
  assert.equal(findExportWell(undefined), undefined);
});

test('gives every placeholder well its own position', () => {
  const positions = new Set(EXPORT_WELLS.map((well) => `${well.latitude},${well.longitude}`));
  assert.equal(positions.size, EXPORT_WELLS.length);
});
