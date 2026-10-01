// Test data: where the placeholder wells stand, spread over the imaged strip of the Xizhou survey (xizhouImagery.ts)
// so they sit on real imagery. Made-up positions, not recognition results; replaced once wells come from the backend.
import { gridPoint, IMAGED_COLUMNS, type LngLat } from './xizhouImagery';

// Deterministic pseudo-random number in [0, 1), so the sites are the same on the server and in the browser
function scatter(index: number, salt: number): number {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// Tiles away from the strip's edges (whose imagery may be cut off), north-east to south-west
const INNER_TILES = IMAGED_COLUMNS.flatMap(([first, last], row) =>
  Array.from({ length: Math.max(last - first - 1, 0) }, (_, index) => ({ column: first + 1 + index, row })),
);

// Near a tile's centre, nudged up to 5% of a tile (~5.6 m on the ground, where a tile is ~113 m) so the wells do not
// line up on a grid; wells in neighbouring tiles stay over 100 m apart
function siteIn(tile: { column: number; row: number }, index: number): LngLat {
  const nudge = (salt: number) => (scatter(index, salt) - 0.5) * 0.1;
  return gridPoint(tile.column + 0.5 + nudge(3), tile.row + 0.5 + nudge(4));
}

// The inner tiles in a scattered order, so consecutive wells are not neighbours
const SCATTERED_TILES = INNER_TILES.map((tile, index) => ({ tile, order: scatter(index, 5) }))
  .sort((a, b) => a.order - b.order)
  .map(({ tile }) => tile);

// One per recognised well on the export page (105 of the 118 inner tiles), each in its own tile
export const DETECTED_WELL_SITES: LngLat[] = SCATTERED_TILES.slice(0, 105).map(siteIn);
