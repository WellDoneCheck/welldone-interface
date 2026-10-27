import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addWell, canAddWell, removeWell, coordinatesText, isOnImagery, toMapWell, toWebMercator, wellImageUrl } from '../app/utils/wells.ts';

const view = { id: 7, code: 'SW-2026-A007', task_id: 'task-1', verdict: 'well', confidence: 0.9, source: 'ai', latitude: 23.830123, longitude: 120.460234 };

test('a well is named by its code, and keeps the backend id for its image', () => {
  const well = toMapWell(view, { created_at: '2026-10-20T05:52:00.000Z' });
  assert.equal(well.id, 'SW-2026-A007');
  assert.equal(well.wellId, 7);
  assert.equal(well.recordId, 'task-1');
  assert.equal(well.verdict, 'well');
  assert.equal(well.manual, false);
  assert.equal(toMapWell({ ...view, source: 'manual', confidence: null }, { created_at: '2026-10-20T05:52:00.000Z' }).manual, true);
  assert.equal(wellImageUrl(well, 640), '/wells/7/image?size=640');
  assert.equal(wellImageUrl(well, 1600, 100), '/wells/7/image?size=1600&radius=100');
});

test('a well shows where it is and when its map came in (Taipei time)', () => {
  const well = toMapWell(view, { created_at: '2026-10-20T05:52:00.000Z' });
  assert.equal(well.coordinates, '23.83012, 120.46023');
  assert.equal(well.timestamp, '2026-10-20 13:52');
});

test('a placed point is sent in the backend\'s EPSG:3857 metres', () => {
  const { e, n } = toWebMercator({ latitude: 23.5, longitude: 120 });
  assert.ok(Math.abs(e - 13358338.895) < 0.01);
  assert.ok(Math.abs(n - 2692598.219) < 0.01);
});

test('a well can be placed only on its map\'s imagery, and is written as the others are', () => {
  const bounds = [120.4, 23.8, 120.5, 23.9];
  assert.equal(isOnImagery(bounds, { latitude: 23.85, longitude: 120.45 }), true);
  assert.equal(isOnImagery(bounds, { latitude: 23.95, longitude: 120.45 }), false);
  assert.equal(isOnImagery(bounds, { latitude: 23.85, longitude: 120.39 }), false);
  assert.equal(coordinatesText({ latitude: 23.830123, longitude: 120.460234 }), '23.83012, 120.46023');
});

test('a well added by hand is posted to its map and verified as a well, and only operators and admins may', async () => {
  const sent = [];
  globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  globalThis.fetch = async (url, init) => {
    sent.push({ path: new URL(url).pathname, method: init.method, body: init.body && JSON.parse(init.body) });
    return new Response('{"id":9,"code":"SW-2026-A009"}', { status: 201 });
  };
  const point = { latitude: 23.5, longitude: 120 };
  const well = await addWell('task-1', point);
  assert.equal(well.code, 'SW-2026-A009');
  assert.deepEqual(sent, [
    { path: '/wells', method: 'POST', body: { taskId: 'task-1', ...toWebMercator(point) } },
    { path: '/wells/9/verdict', method: 'PATCH', body: { verdict: 'well' } },
  ]);
  await removeWell({ wellId: 9 });
  assert.deepEqual(sent[2], { path: '/wells/9', method: 'DELETE', body: undefined });
  assert.equal(canAddWell('operator'), true);
  assert.equal(canAddWell('admin'), true);
  assert.equal(canAddWell('viewer'), false);
});
