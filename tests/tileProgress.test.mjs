import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  countStates,
  cutImagery,
  keepReading,
  mercatorToLngLat,
  aiFinished,
  readTileProgress,
  recognisedCount,
  recognitionFeatures,
  uncutFeatures,
} from '../app/utils/tileProgress.ts';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} ≉ ${expected}`);

test('EPSG:3857 metres become longitude and latitude', () => {
  // the corner of the Web Mercator world
  const [lng, lat] = mercatorToLngLat(20037508.342789244, 20037508.342789244);
  near(lng, 180);
  near(lat, 85.0511287798);
  assert.deepEqual(mercatorToLngLat(0, 0), [0, 0]);
});

// GET tiles/cut: origin (1000, 5000), 2 m a pixel, 100 px tiles; the image is 200×140 px (2×2 tiles), so the bottom
// row is cut short. Three tiles have imagery; the fourth is blank.
const grid = {
  geoTransform: [1000, 2, 0, 5000, 0, -2],
  tileSize: 100,
  bounds: [0.008983, 0.04491, 0.012577, 0.044916],
  rows: 2,
  cols: 2,
  tiles: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }],
  empty: [{ row: 1, col: 1 }],
  imagery: { tiles: ['http://api.local/tasks/t1/tiles/cut/{z}/{x}/{y}.png?v=3'], minzoom: 14, maxzoom: 23 },
};
// part way through cutting: one tile cut, one found blank, two not done yet
const cutting = { ...grid, tiles: [{ row: 0, col: 1 }], empty: [{ row: 1, col: 1 }] };
const ai = (taskStatus, tiles) => ({ taskStatus, tiles: tiles.map(([row, col, status]) => ({ row, col, status })) });
const states = (features) => features.features.map((feature) => feature.properties.state);

test('while cutting, the cells not done yet next to a cut one are drawn as uncut; the cut ones show their imagery', () => {
  // cut (0,1); (1,1) blank; (0,0) not done and next to it; (1,0) not done but only diagonal to it
  const features = uncutFeatures(cutting);
  assert.deepEqual(states(features), ['uncut']);
  assert.deepEqual(features.features[0].geometry.coordinates[0][0], mercatorToLngLat(1000, 5000));
  assert.deepEqual(countStates(features), { uncut: 1, pending: 0, processing: 0, failed: 0 });
  assert.deepEqual(states(uncutFeatures(grid)), []);
  // nothing cut yet: nothing to stand next to
  assert.deepEqual(states(uncutFeatures({ ...cutting, tiles: [] })), []);
  assert.deepEqual(cutImagery(cutting), { ...grid.imagery, bounds: grid.bounds });
  assert.equal(cutImagery({ ...grid, imagery: null }), null);
});

test('once cut, only the tiles still to recognise are drawn; one the AI has not started on is pending', () => {
  const features = recognitionFeatures(grid, ai('processing', [[0, 0, 'done'], [0, 1, 'processing'], [1, 0, 'failed']]));
  assert.deepEqual(states(features), ['processing', 'failed']);
  assert.deepEqual(countStates(features), { uncut: 0, pending: 0, processing: 1, failed: 1 });
  assert.deepEqual(states(recognitionFeatures(grid, ai('pending', []))), ['pending', 'pending', 'pending']);
});

test('each tile drawn knows its row and column, and can be sent to the AI again only once it has finished', () => {
  const features = recognitionFeatures(grid, ai('failed', [[0, 0, 'done']]));
  assert.deepEqual(features.features.map(({ properties: { row, col } }) => [row, col]), [[0, 1], [1, 0]]);
  assert.equal(aiFinished(ai('pending', [])), false);
  assert.equal(aiFinished(ai('processing', [])), false);
  assert.equal(aiFinished(ai('failed', [])), true);
  assert.equal(aiFinished(ai('completed', [])), true);
});

test('every tile is a whole square, the one cut short at the edge too', () => {
  const ring = recognitionFeatures(grid, ai('pending', [])).features[2].geometry.coordinates[0];
  assert.equal(ring.length, 5);
  assert.deepEqual(ring[0], ring[4]);
  // row 1, col 0: pixels 0–100 across, 100–200 down (not 100–140)
  assert.deepEqual(ring[0], mercatorToLngLat(1000, 4800));
  assert.deepEqual(ring[2], mercatorToLngLat(1200, 4600));
});

test('counts the tiles recognised so far', () => {
  assert.equal(recognisedCount(ai('processing', [[0, 0, 'done'], [0, 1, 'processing'], [1, 0, 'done']])), 2);
  assert.equal(recognisedCount(ai('pending', [])), 0);
});

test('read again while tiles are left, even once the backend has marked the task failed', () => {
  const left = (taskStatus) => {
    const read = ai(taskStatus, [[0, 0, 'done']]);
    return keepReading(read, recognitionFeatures(grid, read));
  };
  assert.equal(left('pending'), true);
  assert.equal(left('processing'), true);
  assert.equal(left('failed'), true);
  assert.equal(left('completed'), false);
  const allDone = ai('processing', [[0, 0, 'done'], [0, 1, 'done'], [1, 0, 'done']]);
  assert.equal(keepReading(allDone, recognitionFeatures(grid, allDone)), false);
});

/* ─── Reading the backend ───────────────────────────────────────── */

const task = (split_status) => ({ id: 't1', name: '2026-10-21 14:02', split_status, ai_status: 'waiting', created_by_id: null, created_at: '2026-10-21T06:02:00.000Z' });

// Answers the backend's calls by path; a path left out answers 404
function backend(answers) {
  globalThis.fetch = async (url) => {
    const path = new URL(url).pathname;
    return path in answers ? new Response(JSON.stringify(answers[path]), { status: 200 }) : new Response('{"message":"Not Found"}', { status: 404 });
  };
}
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

test('a map waiting to be cut has nothing to draw yet, and is read again', async () => {
  backend({ '/tasks/t1': task('waiting') });
  assert.deepEqual(await readTileProgress('t1'), { progress: null, again: true });
});

test('a map being cut shows the cells not cut yet, the imagery cut so far and the whole image, read again until cut', async () => {
  backend({ '/tasks/t1': task('active'), '/tasks/t1/tiles/cut': cutting });
  const { progress, again } = await readTileProgress('t1');
  assert.deepEqual(states(progress.features), ['uncut']);
  assert.equal(progress.recognised, null);
  assert.deepEqual(progress.bounds, grid.bounds);
  assert.deepEqual(progress.imagery, cutImagery(cutting));
  assert.equal(again, true);
  backend({ '/tasks/t1': task('failed'), '/tasks/t1/tiles/cut': cutting });
  assert.equal((await readTileProgress('t1')).again, false);
});

test('a cut map shows the tiles still to recognise and how many are recognised', async () => {
  backend({ '/tasks/t1': task('completed'), '/tasks/t1/tiles/cut': grid, '/tasks/t1/ai/progress': ai('processing', [[0, 0, 'done'], [0, 1, 'processing']]) });
  const { progress, again } = await readTileProgress('t1');
  assert.deepEqual(states(progress.features), ['processing', 'pending']);
  assert.equal(progress.recognised, 1);
  assert.equal(progress.imagery, null);
  assert.equal(progress.retryable, false);
  assert.equal(again, true);
});
