import test from 'node:test';
import assert from 'node:assert/strict';
import { FRAMES_AHEAD, FRAMES_BEHIND, frameWindow, isInFrameWindow, nearestFrame } from '../app/utils/frameWindow.ts';

test('the window reaches further ahead than behind, whichever way the page is heading', () => {
  assert.equal(isInFrameWindow(100 + FRAMES_AHEAD, 100, 1), true);
  assert.equal(isInFrameWindow(100 + FRAMES_AHEAD + 1, 100, 1), false);
  assert.equal(isInFrameWindow(100 - FRAMES_BEHIND, 100, 1), true);
  assert.equal(isInFrameWindow(100 - FRAMES_BEHIND - 1, 100, 1), false);
  // scrolling back: ahead is the lower frames
  assert.equal(isInFrameWindow(100 - FRAMES_AHEAD, 100, -1), true);
  assert.equal(isInFrameWindow(100 + FRAMES_BEHIND, 100, -1), true);
  assert.equal(isInFrameWindow(100 + FRAMES_BEHIND + 1, 100, -1), false);
});

test('the frame asked for comes first, then those ahead, then those behind', () => {
  const forward = frameWindow(100, 1, 420);
  assert.deepEqual(forward.slice(0, 3), [100, 101, 102]);
  assert.equal(forward[FRAMES_AHEAD + 1], 99);
  assert.equal(forward.length, 1 + FRAMES_AHEAD + FRAMES_BEHIND);
  assert.deepEqual(frameWindow(100, -1, 420).slice(0, 3), [100, 99, 98]);
});

test('the window stays inside the frames', () => {
  const start = frameWindow(2, -1, 420);
  assert.ok(start.every((index) => index >= 0));
  assert.deepEqual(start.slice(0, 3), [2, 1, 0]);
  assert.ok(frameWindow(418, 1, 420).every((index) => index < 420));
  assert.ok(frameWindow(418, 1, 420).every((index) => isInFrameWindow(index, 418, 1)));
});

test('the nearest frame at hand stands in, either side', () => {
  assert.equal(nearestFrame([90, 104, 120], 100), 104);
  assert.equal(nearestFrame([90, 120], 100), 90);
  assert.equal(nearestFrame([], 100), undefined);
});
