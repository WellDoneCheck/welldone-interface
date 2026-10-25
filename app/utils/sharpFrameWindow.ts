// Sharp frames are kept only this many frames either side of the shown one;
// the rest are dropped so memory stays flat however far the page is scrolled
export const SHARP_FRAME_KEEP_RADIUS = 12;

export function isSharpFrameKept(index: number, shownFrame: number): boolean {
  return Math.abs(index - shownFrame) <= SHARP_FRAME_KEEP_RADIUS;
}
