import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_SCALE, UNZOOMED, panBy, zoomAt } from '../app/utils/imageZoom.ts';

test('zooming about the middle keeps the image centred', () => {
  assert.deepEqual(zoomAt(UNZOOMED, 2, { x: 0, y: 0 }, 600), { scale: 2, x: 0, y: 0 });
});

test('zooming about a point keeps that point under it', () => {
  // the point 100px right of the middle stays 100px right of it: x - (x - 0) * 2
  assert.deepEqual(zoomAt(UNZOOMED, 2, { x: 100, y: -50 }, 600), { scale: 2, x: -100, y: 50 });
});

test('zoom stays between 1x and the most', () => {
  assert.equal(zoomAt(UNZOOMED, 0.5, { x: 0, y: 0 }, 600).scale, 1);
  assert.equal(zoomAt(UNZOOMED, 99, { x: 0, y: 0 }, 600).scale, MAX_SCALE);
});

test('the image always covers the frame: zooming back out recentres it', () => {
  const zoomed = zoomAt(UNZOOMED, 2, { x: 300, y: 300 }, 600);
  assert.deepEqual(zoomed, { scale: 2, x: -300, y: -300 });
  assert.deepEqual(zoomAt(zoomed, 1, { x: 0, y: 0 }, 600), { scale: 1, x: 0, y: 0 });
});

test('dragging moves the image no further than its edge', () => {
  const zoomed = { scale: 2, x: 0, y: 0 };
  assert.deepEqual(panBy(zoomed, 50, -20, 600), { scale: 2, x: 50, y: -20 });
  // at 2x a 600px frame shows half the image: it moves at most 300px either way
  assert.deepEqual(panBy(zoomed, 1000, -1000, 600), { scale: 2, x: 300, y: -300 });
  assert.deepEqual(panBy(UNZOOMED, 80, 80, 600), UNZOOMED);
});
