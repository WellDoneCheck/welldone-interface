// How far an imported map has got, tile by tile, drawn over the map: while the splitter cuts it, the tiles not cut yet
// (the ones cut show their imagery); after that, the tiles the AI has still to recognise (Backend-SPEC §4.2
// AiTileProgress). Where the tiles are comes from the backend's `tiles/cut`: the tiles the splitter has written (none is
// cut where the imagery is blank) and those it found blank, placed with the map's own geotransform. The splitter does
// not tell which tile it is cutting, only which it has done.
import { api } from './api';
import type { Task } from './tasks';
import type { Imagery } from './tileServer';

export type AiTileStatus = 'pending' | 'processing' | 'done' | 'failed';
// as drawn: not cut yet (while cutting), or still to recognise (not reached yet, being recognised, failed)
export type TileState = 'uncut' | Exclude<AiTileStatus, 'done'>;

// GET /tasks/:id/ai/progress; only the fields the site uses. Lists only the tiles the AI has started on.
export interface AiTileProgress {
  taskStatus: 'pending' | 'processing' | 'completed' | 'failed';
  tiles: { row: number; col: number; status: AiTileStatus }[];
}

type Cell = { row: number; col: number };

// GET /tasks/:id/tiles/cut
export interface TileGrid {
  // GDAL geotransform in EPSG:3857: [originE, pixelWidth, 0, originN, 0, -pixelHeight]
  geoTransform: number[];
  // px; tiles at the image's right and bottom edges are cut short of it
  tileSize: number;
  // the whole image, WGS84 [west, south, east, north]
  bounds: [number, number, number, number];
  rows: number;
  cols: number;
  // cut, with imagery
  tiles: Cell[];
  // done, but blank: no tile
  empty: Cell[];
  // the imagery cut so far (its address changes with every tile cut); null before the first
  imagery: { tiles: [string]; minzoom: number; maxzoom: number } | null;
}

const taskPath = (taskId: string) => `/tasks/${encodeURIComponent(taskId)}`;
export const fetchSplitStatus = async (taskId: string) => (await api<Task>(taskPath(taskId))).split_status;
export const fetchTileGrid = (taskId: string) => api<TileGrid>(`${taskPath(taskId)}/tiles/cut`);
export const fetchAiTiles = (taskId: string) => api<AiTileProgress>(`${taskPath(taskId)}/ai/progress`);

const EARTH_RADIUS = 6378137;
const DEGREES = 180 / Math.PI;

// EPSG:3857 metres to [longitude, latitude]
export function mercatorToLngLat(e: number, n: number): [number, number] {
  return [(e / EARTH_RADIUS) * DEGREES, (2 * Math.atan(Math.exp(n / EARTH_RADIUS)) - Math.PI / 2) * DEGREES];
}

// A tile's whole square, an edge tile's too, as a closed ring of [longitude, latitude]
function tileSquare({ geoTransform: [originE, pixelWidth, , originN, , pixelHeight], tileSize }: TileGrid, row: number, col: number) {
  const point = (px: number, py: number) => mercatorToLngLat(originE + px * pixelWidth, originN + py * pixelHeight);
  const [x, y] = [col * tileSize, row * tileSize];
  return [point(x, y), point(x + tileSize, y), point(x + tileSize, y + tileSize), point(x, y + tileSize), point(x, y)];
}

export type TileFeatures = GeoJSON.FeatureCollection<GeoJSON.Polygon, { state: TileState; row: number; col: number }>;

const cellKey = ({ row, col }: Cell) => `${row}/${col}`;

function tileFeatures(grid: TileGrid, tiles: { cell: Cell; state: TileState }[]): TileFeatures {
  return {
    type: 'FeatureCollection',
    features: tiles.map(({ cell, state }) => ({
      type: 'Feature',
      properties: { state, row: cell.row, col: cell.col },
      geometry: { type: 'Polygon', coordinates: [tileSquare(grid, cell.row, cell.col)] },
    })),
  };
}

const SIDES = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

// While cutting: the cells the splitter has not done yet next to (above, below, left or right of) one it has cut; the
// cut ones show their imagery instead. Which cells hold imagery is known only once the splitter gets to them, so the
// cells next to imagery stand in for those still to cut: a few of them may turn out blank, and a few still to cut may
// be left out.
export function uncutFeatures(grid: TileGrid): TileFeatures {
  const done = new Set([...grid.tiles, ...grid.empty].map(cellKey));
  const inGrid = ({ row, col }: Cell) => row >= 0 && row < grid.rows && col >= 0 && col < grid.cols;
  const uncut = new Map<string, Cell>();
  for (const tile of grid.tiles) {
    for (const [dRow, dCol] of SIDES) {
      const cell = { row: tile.row + dRow, col: tile.col + dCol };
      if (inGrid(cell) && !done.has(cellKey(cell))) uncut.set(cellKey(cell), cell);
    }
  }
  return tileFeatures(grid, [...uncut.values()].map((cell) => ({ cell, state: 'uncut' as const })));
}

// Once cut: the tiles the AI has still to recognise, each with its state (one it has not started on is pending); the
// ones it has recognised are left out
export function recognitionFeatures(grid: TileGrid, progress: AiTileProgress): TileFeatures {
  const states = new Map(progress.tiles.map((tile) => [cellKey(tile), tile.status]));
  const open: { cell: Cell; state: TileState }[] = [];
  for (const cell of grid.tiles) {
    const state = states.get(cellKey(cell)) ?? 'pending';
    if (state !== 'done') open.push({ cell, state });
  }
  return tileFeatures(grid, open);
}

// The imagery cut so far, as the map shows an imported map's
export function cutImagery(grid: TileGrid): Imagery | null {
  return grid.imagery && { ...grid.imagery, bounds: grid.bounds };
}

// How many tiles the AI has recognised: each may have added wells
export const recognisedCount = (progress: AiTileProgress) => progress.tiles.filter((tile) => tile.status === 'done').length;

// Worth reading again: tiles are left to recognise and the AI has not finished. A failed task counts as not finished:
// the backend marks it failed when it cannot reach the AI service for a while, though the AI may carry on and still
// send its tiles in.
// The AI has finished (or been marked failed): only then are the tiles it left open sent to it again (a retry)
export const aiFinished = (progress: AiTileProgress) => progress.taskStatus === 'completed' || progress.taskStatus === 'failed';

export function keepReading(progress: AiTileProgress, features: TileFeatures): boolean {
  return progress.taskStatus !== 'completed' && features.features.length > 0;
}

// How many tiles are drawn in each state, for the legend
export function countStates(features: TileFeatures): Record<TileState, number> {
  const counts: Record<TileState, number> = { uncut: 0, pending: 0, processing: 0, failed: 0 };
  for (const feature of features.features) counts[feature.properties.state] += 1;
  return counts;
}

export interface TileProgress {
  features: TileFeatures;
  // tiles the AI has recognised (null while cutting)
  recognised: number | null;
  // the whole image, to show it before it can be seen (while cutting)
  bounds: TileGrid['bounds'];
  // the imagery cut so far, while cutting (null: none yet, or cut: the imported map's own)
  imagery: Imagery | null;
  // the tiles left open can be sent to the AI again (aiFinished)
  retryable: boolean;
}

// The map's tiles as they are now (null: nothing to draw yet, not being cut), and whether to read them again: while
// it waits to be cut or is being cut, and while the AI has tiles left (keepReading)
export async function readTileProgress(taskId: string): Promise<{ progress: TileProgress | null; again: boolean }> {
  const split = await fetchSplitStatus(taskId);
  if (split === 'waiting') return { progress: null, again: true };
  if (split !== 'completed') {
    const grid = await fetchTileGrid(taskId);
    const progress = { features: uncutFeatures(grid), recognised: null, bounds: grid.bounds, imagery: cutImagery(grid), retryable: false };
    return { progress, again: split === 'active' };
  }
  const [grid, ai] = await Promise.all([fetchTileGrid(taskId), fetchAiTiles(taskId)]);
  const features = recognitionFeatures(grid, ai);
  const progress = { features, recognised: recognisedCount(ai), bounds: grid.bounds, imagery: null, retryable: aiFinished(ai) };
  return { progress, again: keepReading(ai, features) };
}
