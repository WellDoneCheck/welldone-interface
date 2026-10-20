// Whether what lies behind the navbar logo's "Well" is light, as reported by a map drawn there (TileMap), so the word
// can turn dark over it. null: nothing reported, the navbar decides by itself.

// Brighter than this on average (relative luminance, 0 black to 1 white) counts as light
const LIGHT_LUMINANCE = 0.55;

// Premultiplied RGBA pixels (as read from a WebGL canvas) over an opaque background colour: are they light on average?
export function isLightBackdrop(pixels: Uint8Array, background: [number, number, number]): boolean {
  let total = 0;
  const count = pixels.length / 4;
  for (let i = 0; i < pixels.length; i += 4) {
    const cover = 1 - pixels[i + 3] / 255;
    const [r, g, b] = [0, 1, 2].map((channel) => (pixels[i + channel] + background[channel] * cover) / 255);
    total += 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  return count > 0 && total / count > LIGHT_LUMINANCE;
}

let reported: { source: object | null; light: boolean | null } = { source: null, light: null };
const listeners = new Set<() => void>();

// A map says what is behind the word (null: it no longer knows, e.g. it has gone or no longer lies behind the logo).
// A null only clears what that same map said.
export function reportLogoBackdrop(source: object, light: boolean | null): void {
  if (light === null && source !== reported.source) return;
  const next = light === null ? { source: null, light: null } : { source, light };
  if (next.source === reported.source && next.light === reported.light) return;
  reported = next;
  listeners.forEach((listener) => listener());
}

export function logoBackdropIsLight(): boolean | null {
  return reported.light;
}

export function subscribeToLogoBackdrop(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
