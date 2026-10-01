// Where the map page's map was last left (centre and zoom), with the well selected then, so coming back from that
// well's check page shows the map just as it was. Kept in memory: gone on a reload, like the page's other state.

export interface MapCamera {
  center: [number, number];
  zoom: number;
  // where on screen the centre is put, from the map's middle (e.g. a well placed beside a card); the middle if left out
  offset?: [number, number];
}

let left: { recordId: string; camera: MapCamera } | null = null;

export function rememberMapCamera(recordId: string, camera: MapCamera): void {
  left = { recordId, camera };
}

// The map as it was left with this well selected, or null (left with another well, or never left)
export function mapCameraFor(recordId: string): MapCamera | null {
  return left?.recordId === recordId ? left.camera : null;
}

// How close in the map was last left, whichever well was selected, or null (never left)
export function lastMapZoom(): number | null {
  return left?.camera.zoom ?? null;
}
