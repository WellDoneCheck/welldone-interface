import { STILL_FROM_FRAME } from './heroStill';

// The hero starts once this many light frames (from the first) have loaded; the rest load behind it, a few at a time,
// so the intro does not wait for all of them and they do not crowd out the sharp frames
export const LIGHT_FRAMES_BEFORE_START = 30;
export const LIGHT_FRAMES_IN_FLIGHT = 4;

// The title rises and fades out between these frames
export const TITLE_HIDE_START_FRAME = 2;
export const TITLE_HIDE_END_FRAME = 20;

export function lightFramesBeforeStart(): number {
  return Math.min(LIGHT_FRAMES_BEFORE_START, STILL_FROM_FRAME);
}

// frameProgress is the scroll position counted in frames; past the end of the fade the title is gone, and with it the
// masked copy of the frames that lets the footage pass in front of it
export function isTitleShown(frameProgress: number): boolean {
  return frameProgress < TITLE_HIDE_END_FRAME;
}
