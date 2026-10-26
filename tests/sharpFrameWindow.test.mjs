import test from 'node:test';
import assert from 'node:assert/strict';
import { SHARP_FRAME_KEEP_RADIUS, isSharpFrameKept } from '../app/utils/sharpFrameWindow.ts';

test('frames near the shown one are kept, on either side', () => {
  assert.equal(isSharpFrameKept(100, 100), true);
  assert.equal(isSharpFrameKept(100 + SHARP_FRAME_KEEP_RADIUS, 100), true);
  assert.equal(isSharpFrameKept(100 - SHARP_FRAME_KEEP_RADIUS, 100), true);
});

test('frames further away are dropped', () => {
  assert.equal(isSharpFrameKept(100 + SHARP_FRAME_KEEP_RADIUS + 1, 100), false);
  assert.equal(isSharpFrameKept(100 - SHARP_FRAME_KEEP_RADIUS - 1, 100), false);
});

test('the frames showFrame fetches ahead and behind stay inside the window', () => {
  // showFrame fetches 4 ahead and 2 behind
  assert.equal(isSharpFrameKept(104, 100), true);
  assert.equal(isSharpFrameKept(98, 100), true);
});
