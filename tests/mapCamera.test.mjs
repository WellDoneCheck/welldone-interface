import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lastMapZoom, mapCameraFor, mapImageFor, projectWithCamera, rememberMapCamera, rememberMapImage } from '../app/utils/mapCamera.ts';

test('nothing is remembered before the map is left', () => {
  assert.equal(mapCameraFor('SW-2023-A01'), null);
});

test('the map comes back as it was left with the same well', () => {
  rememberMapCamera('SW-2023-A01', { center: [120.46, 23.83], zoom: 21 });
  assert.deepEqual(mapCameraFor('SW-2023-A01'), { center: [120.46, 23.83], zoom: 21 });
});

test('coming back to another well does not reuse the view', () => {
  rememberMapCamera('SW-2023-A01', { center: [120.46, 23.83], zoom: 21 });
  assert.equal(mapCameraFor('SW-2022-A03'), null);
});

test('the latest view is the one remembered', () => {
  rememberMapCamera('SW-2023-A01', { center: [120.46, 23.83], zoom: 21 });
  rememberMapCamera('SW-2023-A01', { center: [120.47, 23.84], zoom: 18 });
  assert.deepEqual(mapCameraFor('SW-2023-A01'), { center: [120.47, 23.84], zoom: 18 });
});

test('how close in the map was left is kept whichever well was selected', () => {
  rememberMapCamera('SW-2023-A001', { center: [120.46, 23.83], zoom: 21.5 });
  assert.equal(lastMapZoom(), 21.5);
  assert.equal(mapCameraFor('SW-2023-A045'), null, 'but not where it was, for another well');
});

test('a point at the camera centre is in the middle of the map, or where the offset puts it', () => {
  const camera = { center: [120.46, 23.83], zoom: 19 };
  assert.deepEqual(projectWithCamera(camera, { width: 1920, height: 1080 }, { longitude: 120.46, latitude: 23.83 }), { x: 960, y: 540 });
  const placed = projectWithCamera({ ...camera, offset: [-400, 60] }, { width: 1920, height: 1080 }, { longitude: 120.46, latitude: 23.83 });
  assert.deepEqual(placed, { x: 560, y: 600 });
});

test('points away from the centre are as far on screen as MapLibre puts them', () => {
  // at zoom 19 a 512-pixel world tile is 2^19 times wider: one degree of longitude is 512 * 2^19 / 360 pixels
  const camera = { center: [120.46, 23.83], zoom: 19 };
  const east = projectWithCamera(camera, { width: 1000, height: 1000 }, { longitude: 120.4601, latitude: 23.83 });
  assert.ok(Math.abs(east.x - 500 - (0.0001 * 512 * 2 ** 19) / 360) < 1e-6);
  assert.equal(east.y, 500);
  const north = projectWithCamera(camera, { width: 1000, height: 1000 }, { longitude: 120.46, latitude: 23.8301 });
  assert.ok(north.y < 500, 'north is up');
  // a metre north is about 1 / (2π · 6378137 · cos φ) of the world's height
  const metresPerPixel = (2 * Math.PI * 6378137 * Math.cos((23.83 * Math.PI) / 180)) / (512 * 2 ** 19);
  assert.ok(Math.abs((500 - north.y) * metresPerPixel - 0.0001 * 111320) < 0.05);
});

test('a picture of the map belongs to where it was drawn, and goes once the map moves on', () => {
  rememberMapCamera('SW-2023-A010', { center: [120.46, 23.83], zoom: 21 });
  assert.equal(mapImageFor('SW-2023-A010'), null, 'not drawn there yet');
  rememberMapImage('SW-2023-A010', new Blob(['map']));
  const image = mapImageFor('SW-2023-A010');
  assert.match(image, /^blob:/);
  assert.equal(mapImageFor('SW-2023-A045'), null, 'not for another well');
  rememberMapImage('SW-2023-A045', new Blob(['other']));
  assert.equal(mapImageFor('SW-2023-A010'), image, 'a picture for another well is not kept');
  rememberMapCamera('SW-2023-A010', { center: [120.461, 23.83], zoom: 21 });
  assert.equal(mapImageFor('SW-2023-A010'), null, 'moved on: the old picture is dropped');
});
