import { test } from 'node:test';
import assert from 'node:assert/strict';
import { copyCanvas, lastMapZoom, mapCameraFor, mapImageFor, rememberMapCamera, rememberMapImage } from '../app/utils/mapCamera.ts';

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

function fakeCanvas({ width = 300, height = 150, clientWidth = 0, clientHeight = 0 } = {}) {
  const canvas = { width, height, clientWidth, clientHeight, draws: [], resizes: 0 };
  canvas.getContext = () => ({
    clearRect: (...args) => canvas.draws.push(['clear', ...args]),
    drawImage: (...args) => canvas.draws.push(args),
  });
  return new Proxy(canvas, {
    set(target, key, value) {
      if (key === 'width' || key === 'height') target.resizes += 1;
      target[key] = value;
      return true;
    },
  });
}

test('a copy of the map is drawn into the canvas given, at the map\'s size on the page', () => {
  const map = fakeCanvas({ width: 2400, height: 1600, clientWidth: 1200, clientHeight: 800 });
  const picture = fakeCanvas();
  copyCanvas(map, picture);
  assert.equal(picture.width, 1200);
  assert.equal(picture.height, 800);
  assert.deepEqual(picture.draws[0], ['clear', 0, 0, 1200, 800]);
  assert.equal(picture.draws[1][0], map);
});

test('copying again at the same size reuses the canvas, cleared first, as it is (no resize)', () => {
  const map = fakeCanvas({ clientWidth: 1200, clientHeight: 800 });
  const picture = fakeCanvas();
  copyCanvas(map, picture);
  const resizes = picture.resizes;
  copyCanvas(map, picture);
  assert.equal(picture.resizes, resizes);
  assert.deepEqual(picture.draws.map((draw) => draw[0]), ['clear', map, 'clear', map]);
});
