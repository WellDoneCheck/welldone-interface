import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PIN_FULL_ZOOM, PIN_MIN_SCALE, pinScaleExpression, pinZoomScale } from '../app/utils/pinZoomScale.ts';

test('pins are full size close in', () => {
  assert.equal(pinZoomScale(PIN_FULL_ZOOM), 1);
  assert.equal(pinZoomScale(19), 1, 'no larger than full size when zoomed further in');
});

test('pins halve every one and a half zoom levels further out', () => {
  assert.equal(pinZoomScale(PIN_FULL_ZOOM - 1.5), 0.5);
  assert.equal(pinZoomScale(PIN_FULL_ZOOM - 3), 0.25);
  assert.ok(Math.abs(pinZoomScale(PIN_FULL_ZOOM - 0.75) - Math.SQRT1_2) < 1e-9);
});

test('the further out, the smaller, down to a clickable minimum', () => {
  assert.ok(pinZoomScale(13) < pinZoomScale(14) && pinZoomScale(14) < pinZoomScale(16));
  assert.equal(pinZoomScale(8), PIN_MIN_SCALE);
});

// What MapLibre's exponential interpolation gives at a zoom, for a ['interpolate', ['exponential', base], ...] expression
function evaluate([, [, base], , lowZoom, low, highZoom, high], zoom) {
  if (zoom <= lowZoom) return low;
  if (zoom >= highZoom) return high;
  const t = (base ** (zoom - lowZoom) - 1) / (base ** (highZoom - lowZoom) - 1);
  return low + (high - low) * t;
}

test('the map style expression draws pins at the same sizes', () => {
  for (const zoom of [8, 12.5, 13, 14, 14.7, 15.5, 16, 17, 19, 21]) {
    assert.ok(Math.abs(evaluate(pinScaleExpression(1), zoom) - pinZoomScale(zoom)) < 1e-9, `zoom ${zoom}`);
  }
  assert.ok(Math.abs(evaluate(pinScaleExpression(0.8), 14) - 0.8 * pinZoomScale(14)) < 1e-9);
});
