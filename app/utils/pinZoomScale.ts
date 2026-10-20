import type { ExpressionSpecification } from 'maplibre-gl';

// How large a well's pin is drawn at a map zoom, as a share of its full size: full from PIN_FULL_ZOOM in, halving
// every PIN_HALVING_ZOOMS levels further out, and never smaller than PIN_MIN_SCALE (still easy to click)
export const PIN_FULL_ZOOM = 17;
const PIN_HALVING_ZOOMS = 1.5;
export const PIN_MIN_SCALE = 0.15;

export function pinZoomScale(zoom: number): number {
  const scale = 2 ** ((zoom - PIN_FULL_ZOOM) / PIN_HALVING_ZOOMS);
  return Math.min(1, Math.max(PIN_MIN_SCALE, scale));
}

// The same sizes as a map style expression ('interpolate', exponential), so the map draws pins at them itself:
// from PIN_MIN_SCALE at the zoom where pins reach it, growing by `base` per zoom level, to full size at PIN_FULL_ZOOM
// (and held at either end). `size` multiplies both ends, e.g. the page's scale.
export function pinScaleExpression(size: number): ExpressionSpecification {
  const base = 2 ** (1 / PIN_HALVING_ZOOMS);
  const smallestAt = PIN_FULL_ZOOM + PIN_HALVING_ZOOMS * Math.log2(PIN_MIN_SCALE);
  return ['interpolate', ['exponential', base], ['zoom'], smallestAt, PIN_MIN_SCALE * size, PIN_FULL_ZOOM, size];
}
