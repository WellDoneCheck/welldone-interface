// The aerial survey the map pages show: 彰化溪州 along the high-speed rail (splitter task 673f2606…), cut by the
// splitter into 5000×5000 px COG tiles (EPSG:3857, 2.47 cm per pixel) and served as map tiles by titiler.
// The survey is a strip running from the south-west to the north-east: of the 36 × 21 tile grid, only these are imaged.

export const IMAGERY_TASK_ID = '673f2606-0a27-4ca0-8285-13e300e8eaa3';

// Web Mercator metres: the grid's top-left corner and one tile's side (5000 px × 0.024652263 m)
const GRID_ORIGIN = { east: 13407956.5665, north: 2734044.1248 };
export const TILE_METRES = 5000 * 0.024652263004473;
const EARTH_RADIUS = 6378137;

// First and last imaged tile column of each grid row, top (north) row first
export const IMAGED_COLUMNS: [number, number][] = [
  [30, 35], [26, 35], [23, 34], [21, 30], [18, 27], [16, 25], [14, 23], [13, 21], [11, 18], [10, 16], [8, 15],
  [7, 13], [6, 11], [5, 10], [4, 8], [2, 7], [1, 6], [0, 5], [0, 4], [0, 3], [0, 2],
];

export interface LngLat {
  longitude: number;
  latitude: number;
}

const round6 = (value: number) => Math.round(value * 1e6) / 1e6;

export function mercatorToLngLat(east: number, north: number): LngLat {
  return {
    longitude: round6((east / EARTH_RADIUS) * (180 / Math.PI)),
    latitude: round6(Math.atan(Math.sinh(north / EARTH_RADIUS)) * (180 / Math.PI)),
  };
}

// A point in the grid, in tiles from its top-left corner (so a tile's centre is its column and row + 0.5)
export function gridPoint(column: number, row: number): LngLat {
  return mercatorToLngLat(GRID_ORIGIN.east + column * TILE_METRES, GRID_ORIGIN.north - row * TILE_METRES);
}

// [west, south, east, north] of the whole grid, for fitting the map to the survey
const lastRow = IMAGED_COLUMNS.length;
const lastColumn = Math.max(...IMAGED_COLUMNS.map(([, last]) => last)) + 1;
const northWest = gridPoint(0, 0);
const southEast = gridPoint(lastColumn, lastRow);
export const IMAGERY_BOUNDS: [number, number, number, number] = [northWest.longitude, southEast.latitude, southEast.longitude, northWest.latitude];
