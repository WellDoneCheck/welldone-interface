// Frames are kept decoded only around the one asked for, more of them on the side the page is heading, so memory
// stays flat however far it is scrolled and turning back still finds the frames just passed
export const FRAMES_AHEAD = 30;
export const FRAMES_BEHIND = 8;

export type Direction = 1 | -1;

export function isInFrameWindow(index: number, target: number, direction: Direction): boolean {
  const offset = (index - target) * direction;
  return offset >= -FRAMES_BEHIND && offset <= FRAMES_AHEAD;
}

// The frames to have decoded, most needed first: the one asked for, those ahead of it, then those behind
export function frameWindow(target: number, direction: Direction, frameCount: number): number[] {
  const offsets = [0];
  for (let i = 1; i <= FRAMES_AHEAD; i++) offsets.push(i);
  for (let i = 1; i <= FRAMES_BEHIND; i++) offsets.push(-i);
  return offsets.map((offset) => target + offset * direction).filter((index) => index >= 0 && index < frameCount);
}

// Of the frames at hand, the one closest to the target (undefined when there are none)
export function nearestFrame(frames: Iterable<number>, target: number): number | undefined {
  let nearest: number | undefined;
  for (const frame of frames) {
    if (nearest === undefined || Math.abs(frame - target) < Math.abs(nearest - target)) nearest = frame;
  }
  return nearest;
}
