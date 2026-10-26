import { type Direction, frameWindow, isInFrameWindow, nearestFrame } from './frameWindow';

const MAX_FETCHES = 6;
const MAX_DECODES = 8;

interface FramePlayerOptions {
  // Frames past this are not played (the caller covers them)
  frameCount: number;
  sharpUrl: (index: number) => string;
  lightUrl: (index: number) => string;
  draw: (bitmap: ImageBitmap) => void;
}

interface Decoded {
  bitmap: ImageBitmap;
  sharp: boolean;
}

const fetchBlob = async (url: string): Promise<Blob> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.blob();
};

// Plays an image sequence through a canvas. Frames are decoded off the main thread (createImageBitmap) before they
// are drawn, so a frame change is only a draw. Every light frame is fetched up front and decoded around the frame
// asked for; the sharp frame (twice as slow to decode, and fetched first) only for the frame asked for, once the light
// ones around it are in: while the page moves, frames pass too fast to tell the two apart. Until the frame asked for
// is decoded the one closest to it stays drawn, and a frame decoded too late (the page has moved on) is dropped, so
// scrolling either way never shows an empty canvas or a frame left behind
export class FramePlayer {
  private readonly light = new Map<number, Blob>();
  private readonly sharp = new Map<number, Blob>();
  private readonly sharpFailed = new Set<number>();
  private readonly fetching = new Set<number>();
  private readonly decoding = new Set<number>();
  private readonly decoded = new Map<number, Decoded>();
  private target = 0;
  private direction: Direction = 1;
  private drawn: { index: number; sharp: boolean } | null = null;
  private disposed = false;

  constructor(private readonly options: FramePlayerOptions) {}

  // Every light frame, onLoaded called as each comes in (or fails)
  async loadLight(onLoaded: () => void): Promise<void> {
    const indexes = Array.from({ length: this.options.frameCount }, (_, index) => index);
    await Promise.all(
      indexes.map(async (index) => {
        try {
          const blob = await fetchBlob(this.options.lightUrl(index));
          if (!this.disposed) this.light.set(index, blob);
        } catch {
          // the frame is skipped: its neighbours stand in
        }
        onLoaded();
      }),
    );
    this.update();
  }

  show(index: number): void {
    const target = Math.min(Math.max(0, index), this.options.frameCount - 1);
    if (target !== this.target) this.direction = target > this.target ? 1 : -1;
    this.target = target;
    this.update();
  }

  dispose(): void {
    this.disposed = true;
    for (const { bitmap } of this.decoded.values()) bitmap.close();
    this.decoded.clear();
    this.light.clear();
    this.sharp.clear();
  }

  private update(): void {
    if (this.disposed) return;
    this.dropOutside();
    this.drawNearest();
    const wanted = frameWindow(this.target, this.direction, this.options.frameCount);
    for (const index of wanted) this.decode(index, this.light.get(index), false);
    if (wanted.every((index) => this.decoded.has(index) || !this.light.has(index))) {
      this.fetchSharp(this.target);
      this.decode(this.target, this.sharp.get(this.target), true);
    }
  }

  private wanted(index: number): boolean {
    return isInFrameWindow(index, this.target, this.direction);
  }

  // A drawn frame stays on the canvas once its bitmap is closed: the canvas keeps its own copy
  private dropOutside(): void {
    for (const [index, { bitmap }] of this.decoded) {
      if (this.wanted(index)) continue;
      bitmap.close();
      this.decoded.delete(index);
    }
    for (const index of this.sharp.keys()) if (!this.wanted(index)) this.sharp.delete(index);
  }

  // Draws the decoded frame closest to the target when it is closer than the one drawn, or the drawn one once sharp
  private drawNearest(): void {
    const index = nearestFrame(this.decoded.keys(), this.target);
    if (index === undefined) return;
    const frame = this.decoded.get(index) as Decoded;
    const drawn = this.drawn;
    const closer = !drawn || Math.abs(index - this.target) < Math.abs(drawn.index - this.target);
    const sharpened = drawn?.index === index && frame.sharp && !drawn.sharp;
    if (!closer && !sharpened) return;
    this.options.draw(frame.bitmap);
    this.drawn = { index, sharp: frame.sharp };
  }

  private fetchSharp(index: number): void {
    if (this.sharp.has(index) || this.sharpFailed.has(index) || this.fetching.has(index)) return;
    if (this.fetching.size >= MAX_FETCHES) return;
    this.fetching.add(index);
    fetchBlob(this.options.sharpUrl(index))
      .then(
        (blob) => {
          if (!this.disposed && this.wanted(index)) this.sharp.set(index, blob);
        },
        () => this.sharpFailed.add(index),
      )
      .finally(() => {
        this.fetching.delete(index);
        this.update();
      });
  }

  // A light frame once; a sharp one over it
  private decode(index: number, source: Blob | undefined, sharp: boolean): void {
    const current = this.decoded.get(index);
    if (!source || current?.sharp || (current && !sharp)) return;
    if (this.decoding.has(index) || this.decoding.size >= MAX_DECODES) return;
    this.decoding.add(index);
    createImageBitmap(source)
      .then(
        (bitmap) => {
          if (this.disposed || !this.wanted(index) || this.decoded.get(index)?.sharp) {
            bitmap.close();
            return;
          }
          this.decoded.get(index)?.bitmap.close();
          this.decoded.set(index, { bitmap, sharp });
        },
        () => {
          // a frame that cannot be decoded is not tried again
          if (sharp) {
            this.sharp.delete(index);
            this.sharpFailed.add(index);
          } else {
            this.light.delete(index);
          }
        },
      )
      .finally(() => {
        this.decoding.delete(index);
        this.update();
      });
  }
}
