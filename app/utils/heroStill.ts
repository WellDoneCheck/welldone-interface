// From this frame (frame_0421) the camera all but holds still, so the hero swaps its frames for one still photo
// with the pin as its own image: nothing more to load or decode, and the pin can fold away smoothly both ways
export const STILL_FROM_FRAME = 420;
// The footage still creeps in 1.5% after that frame; the photo (the very last frame) zooms in to match
export const STILL_START_SCALE = 0.985;
// The pin stays up until the page goes on past the frames; then it folds away over this long
export const PIN_FOLD_MS = 900;
// Where the pin's tip stands on the photo and how wide it is, as fractions of the photo (measured on frame_0421)
export const PIN_TIP = { x: 1360 / 1920, y: 690 / 1080 };
export const PIN_WIDTH = 178 / 1920;

// Before folding, the pin first rises a little over this share of the fold
const PIN_RISE_SHARE = 0.25;
const PIN_RISE_SCALE = 1.08;
// ...and fades out over this last share
const PIN_FADE_SHARE = 0.3;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);
const easeInCubic = (t: number) => t * t * t;

// frameProgress is the scroll position counted in frames (fractional), so the zoom moves smoothly between frames
export function stillScale(frameProgress: number, totalFrames: number): number {
  const t = clamp01((frameProgress - STILL_FROM_FRAME) / (totalFrames - STILL_FROM_FRAME));
  return STILL_START_SCALE + (1 - STILL_START_SCALE) * t;
}

// How the pin looks part way (0 standing … 1 gone) through folding away; standing it up again plays this backwards
export function pinFold(progress: number): { scale: number; opacity: number } {
  const t = clamp01(progress);
  const scale =
    t < PIN_RISE_SHARE
      ? 1 + (PIN_RISE_SCALE - 1) * easeOutQuad(t / PIN_RISE_SHARE)
      : PIN_RISE_SCALE * (1 - easeInCubic((t - PIN_RISE_SHARE) / (1 - PIN_RISE_SHARE)));
  const opacity = 1 - clamp01((t - (1 - PIN_FADE_SHARE)) / PIN_FADE_SHARE);
  return { scale, opacity };
}
