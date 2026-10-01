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

// Web Mercator: a point's place in the world at zoom 0, from 0 to 1 (west to east, north to south)
function worldPoint(longitude: number, latitude: number): { x: number; y: number } {
  const sin = Math.sin((latitude * Math.PI) / 180);
  return { x: (longitude + 180) / 360, y: 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI) };
}

// Where a point is on screen (from the map's top-left) with the map at a camera, as MapLibre would draw it (512-pixel
// tiles): for placing something before the map itself has started
export function projectWithCamera(camera: MapCamera, size: { width: number; height: number }, point: { longitude: number; latitude: number }): { x: number; y: number } {
  const worldSize = 512 * 2 ** camera.zoom;
  const centre = worldPoint(camera.center[0], camera.center[1]);
  const target = worldPoint(point.longitude, point.latitude);
  const [offsetX, offsetY] = camera.offset ?? [0, 0];
  return {
    x: size.width / 2 + offsetX + (target.x - centre.x) * worldSize,
    y: size.height / 2 + offsetY + (target.y - centre.y) * worldSize,
  };
}
