import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toMapWell, wellImageUrl } from '../app/utils/wells.ts';

const view = { id: 7, code: 'SW-2026-A007', task_id: 'task-1', verdict: 'well', confidence: 0.9, latitude: 23.830123, longitude: 120.460234 };

test('a well is named by its code, and keeps the backend id for its image', () => {
  const well = toMapWell(view, { created_at: '2026-10-20T05:52:00.000Z' });
  assert.equal(well.id, 'SW-2026-A007');
  assert.equal(well.wellId, 7);
  assert.equal(well.recordId, 'task-1');
  assert.equal(well.verdict, 'well');
  assert.equal(wellImageUrl(well, 640), '/wells/7/image?size=640');
});

test('a well shows where it is and when its map came in (Taipei time)', () => {
  const well = toMapWell(view, { created_at: '2026-10-20T05:52:00.000Z' });
  assert.equal(well.coordinates, '23.83012, 120.46023');
  assert.equal(well.timestamp, '2026-10-20 13:52');
});
