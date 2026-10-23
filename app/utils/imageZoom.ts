// Zooming into a square image shown in a square frame of `size` px, the image filling the frame at scale 1: it is
// drawn scaled about the frame's middle, then moved by (x, y) px, and always covers the whole frame.

export interface ZoomView {
  scale: number;
  x: number;
  y: number;
}

export const MIN_SCALE = 1;
export const MAX_SCALE = 6;
export const UNZOOMED: ZoomView = { scale: 1, x: 0, y: 0 };

// (+ 0: no -0, which reads as a different value)
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)) + 0;

// Moved no further than keeps the image over the whole frame
function covering(view: ZoomView, size: number): ZoomView {
  const reach = ((view.scale - 1) * size) / 2;
  return { scale: view.scale, x: clamp(view.x, -reach, reach), y: clamp(view.y, -reach, reach) };
}

// Zoomed to `scale` (kept between MIN_SCALE and MAX_SCALE) with the point at `at` (px from the frame's middle) staying
// where it is
export function zoomAt(view: ZoomView, scale: number, at: { x: number; y: number }, size: number): ZoomView {
  const next = clamp(scale, MIN_SCALE, MAX_SCALE);
  const ratio = next / view.scale;
  return covering({ scale: next, x: at.x - (at.x - view.x) * ratio, y: at.y - (at.y - view.y) * ratio }, size);
}

// Dragged by (dx, dy) px
export function panBy(view: ZoomView, dx: number, dy: number, size: number): ZoomView {
  return covering({ scale: view.scale, x: view.x + dx, y: view.y + dy }, size);
}
