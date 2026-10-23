import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCheckView, loadMapView, mapHref, resolveMapWell } from '../app/utils/routeRecords.ts';

/* ─── Map page ──────────────────────────────────────────────────── */

const backendTask = (id, ai_status) => ({ id, name: '2026-10-20 13:52', split_status: 'completed', ai_status, created_by_id: null, created_at: '2026-10-20T05:52:00.000Z' });
const wellView = (id, code) => ({ id, code, task_id: 'done', verdict: null, confidence: 0.9, latitude: 23.8, longitude: 120.4 });
const tilejson = { tiles: ['http://localhost:3000/tasks/done/tiles/{z}/{x}/{y}.png'], bounds: [120.3, 23.7, 120.5, 23.9], minzoom: 12, maxzoom: 22 };

// Answers the backend's calls by path; a path left out answers 404
function backend(answers) {
  globalThis.fetch = async (url) => {
    const path = new URL(url).pathname + new URL(url).search;
    return path in answers ? new Response(JSON.stringify(answers[path]), { status: 200 }) : new Response('{"message":"Not Found"}', { status: 404 });
  };
}
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

test('map: shows the map asked for with its wells and imagery', async () => {
  backend({ '/tasks': [backendTask('done', 'completed')], '/wells?taskId=done': [wellView(1, 'SW-2026-A001')], '/tasks/done/tiles/tilejson': tilejson });
  const view = await loadMapView('done');
  assert.equal(view.task.id, 'done');
  assert.deepEqual(view.wells.map((well) => well.id), ['SW-2026-A001']);
  assert.deepEqual(view.imagery, tilejson);
});

test('map: a map not cut yet opens without imagery', async () => {
  backend({ '/tasks': [backendTask('cutting', 'waiting')], '/wells?taskId=cutting': [] });
  const view = await loadMapView('cutting');
  assert.equal(view.imagery, null);
  assert.deepEqual(view.wells, []);
});

test('map: with no finished map there is nothing to show', async () => {
  backend({ '/tasks': [backendTask('cutting', 'waiting')] });
  await assert.rejects(loadMapView(null), /還沒有辨識完成的地圖/);
});

const routeWells = [{ id: 'SW-2026-A001', recordId: 'done' }, { id: 'SW-2026-A002', recordId: 'done' }];

test('map: a map opened from the import page shows its wells with none selected', () => {
  assert.deepEqual(resolveMapWell(routeWells, null, null), { well: null, openCardOnArrival: false, cardOpenAtStart: false });
});

test('map: a well asked for is selected and its card opens on arrival', () => {
  const view = resolveMapWell(routeWells, 'SW-2026-A002', null);
  assert.equal(view.well.id, 'SW-2026-A002');
  assert.equal(view.openCardOnArrival, true);
  assert.equal(view.cardOpenAtStart, false);
});

test('map: coming back from the check page opens the card at once', () => {
  assert.equal(resolveMapWell(routeWells, 'SW-2026-A002', 'check').cardOpenAtStart, true);
});

test('map: a well of another map is not selected', () => {
  assert.equal(resolveMapWell(routeWells, 'SW-2023-A001', 'check').well, null);
});

/* ─── Check page ────────────────────────────────────────────────── */

const timeline = [
  { task_id: 'older', task_created_at: '2025-03-01T02:00:00.000Z', well: { id: 9, code: 'SW-2025-A004', verdict: null, distance_m: 2.4 } },
  { task_id: 'done', task_created_at: '2026-10-20T05:52:00.000Z', well: { id: 2, code: 'SW-2026-A002', verdict: null, distance_m: 0 } },
];

test('check: a well is read by its code, with its map and its captures in every map', async () => {
  backend({
    '/wells/code/SW-2026-A002': wellView(2, 'SW-2026-A002'),
    '/tasks/done': backendTask('done', 'completed'),
    '/wells/2/timeline': timeline,
  });
  const view = await loadCheckView('SW-2026-A002');
  assert.equal(view.well.id, 'SW-2026-A002');
  assert.equal(view.task.id, 'done');
  assert.deepEqual(view.captures, [
    { id: 'older', capturedAt: '2025-03-01 10:00', image: '/wells/9/image?size=702' },
    { id: 'done', capturedAt: '2026-10-20 13:52', image: '/wells/2/image?size=702' },
  ]);
});

test('check: the way back is to the well in its map, with its card already open', async () => {
  backend({ '/wells/code/SW-2026-A002': wellView(2, 'SW-2026-A002'), '/tasks/done': backendTask('done', 'completed'), '/wells/2/timeline': timeline });
  const view = await loadCheckView('SW-2026-A002');
  assert.equal(view.backHref, '/map?record=done&well=SW-2026-A002&from=check');
  assert.equal(view.backHref, `${mapHref(view.well)}&from=check`);
});

test('check: without a well, the first well of the newest finished map', async () => {
  backend({
    '/tasks': [backendTask('done', 'completed')],
    '/wells?taskId=done': [wellView(1, 'SW-2026-A001'), wellView(2, 'SW-2026-A002')],
    '/wells/1/timeline': [],
  });
  assert.equal((await loadCheckView(null)).well.id, 'SW-2026-A001');
});

test('check: an unknown well says so', async () => {
  backend({});
  await assert.rejects(loadCheckView('SW-1999-Z999'), /Not Found/);
});
