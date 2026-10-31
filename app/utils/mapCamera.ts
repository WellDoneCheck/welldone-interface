// Where the map page's map was last left (centre and zoom), with the well selected then, so coming back from that
// well's check page shows the map just as it was. Kept in memory: gone on a reload, like the page's other state.

export interface MapCamera {
  center: [number, number];
  zoom: number;
  // where on screen the centre is put, from the map's middle (e.g. a well placed beside a card); the middle if left out
  offset?: [number, number];
}

// image: what the map looked like there (an object URL), once it has been drawn at rest
let left: { recordId: string; camera: MapCamera; image: string | null } | null = null;

// A new place drops the picture of the old one
export function rememberMapCamera(recordId: string, camera: MapCamera): void {
  if (left?.image) URL.revokeObjectURL(left.image);
  left = { recordId, camera, image: null };
}

// A picture of the map as drawn where it was last left with this well (kept only while that is still where it is)
export function rememberMapImage(recordId: string, image: Blob): void {
  if (left?.recordId !== recordId) return;
  if (left.image) URL.revokeObjectURL(left.image);
  left = { ...left, image: URL.createObjectURL(image) };
}

// Copies what a canvas shows (e.g. the map's, at its size on the page) into another, made the same size: the same
// one each time, as every canvas made holds its pixels until the browser gets round to freeing it (one a copy, a copy
// every few hundred milliseconds while the map is redrawn, runs into gigabytes)
export function copyCanvas(source: HTMLCanvasElement, into: HTMLCanvasElement): void {
  if (into.width !== source.clientWidth) into.width = source.clientWidth;
  if (into.height !== source.clientHeight) into.height = source.clientHeight;
  const context = into.getContext('2d')!;
  // cleared first, as a new canvas would be: the last copy must not show through where the map is see-through
  context.clearRect(0, 0, into.width, into.height);
  context.drawImage(source, 0, 0, into.width, into.height);
}

// The picture of the map as it was left with this well, or null (none drawn yet there, or left with another well)
export function mapImageFor(recordId: string): string | null {
  return left?.recordId === recordId ? left.image : null;
}

// The map as it was left with this well selected, or null (left with another well, or never left)
export function mapCameraFor(recordId: string): MapCamera | null {
  return left?.recordId === recordId ? left.camera : null;
}

// How close in the map was last left, whichever well was selected, or null (never left)
export function lastMapZoom(): number | null {
  return left?.camera.zoom ?? null;
}
