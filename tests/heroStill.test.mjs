import test from 'node:test';
import assert from 'node:assert/strict';
import { STILL_FROM_FRAME, STILL_START_SCALE, pinFold, stillScale } from '../app/utils/heroStill.ts';

const TOTAL = 496;

test('the still photo starts at the zoom of the frame it replaces and ends at full size', () => {
  assert.equal(stillScale(STILL_FROM_FRAME, TOTAL), STILL_START_SCALE);
  assert.equal(stillScale(TOTAL, TOTAL), 1);
  assert.ok(stillScale(458, TOTAL) > STILL_START_SCALE && stillScale(458, TOTAL) < 1);
});

test('a standing pin is shown as is', () => {
  assert.deepEqual(pinFold(0), { scale: 1, opacity: 1 });
});

test('the pin rises a little before folding away', () => {
  const peak = pinFold(0.25);
  assert.ok(peak.scale > 1);
  assert.equal(peak.opacity, 1);
});

test('past the rise the pin keeps shrinking', () => {
  assert.ok(pinFold(0.6).scale < pinFold(0.5).scale);
});

test('a folded pin is gone', () => {
  assert.deepEqual(pinFold(1), { scale: 0, opacity: 0 });
});
