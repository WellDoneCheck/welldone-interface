import test from 'node:test';
import assert from 'node:assert/strict';
import { LIGHT_FRAMES_BEFORE_START, TITLE_HIDE_END_FRAME, isTitleShown, lightFramesBeforeStart } from '../app/utils/heroFrames.ts';
import { STILL_FROM_FRAME } from '../app/utils/heroStill.ts';

test('the hero waits for only the first light frames, never past the still photo', () => {
  assert.equal(lightFramesBeforeStart(), Math.min(LIGHT_FRAMES_BEFORE_START, STILL_FROM_FRAME));
  assert.ok(lightFramesBeforeStart() < STILL_FROM_FRAME);
});

test('the title is shown until its fade ends', () => {
  assert.equal(isTitleShown(0), true);
  assert.equal(isTitleShown(TITLE_HIDE_END_FRAME - 0.1), true);
  assert.equal(isTitleShown(TITLE_HIDE_END_FRAME), false);
  assert.equal(isTitleShown(300), false);
});
