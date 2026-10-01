import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lastMapZoom, mapCameraFor, rememberMapCamera } from '../app/utils/mapCamera.ts';

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
