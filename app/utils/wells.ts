// Wells the AI recognised in an imported map (Backend-SPEC §4.5), shown as pins on the map page
import { api } from './api';
import type { Task } from './tasks';
import { taipeiDateTime } from './taipeiTime';
import type { Role } from './session';
import type { Imagery } from './tileServer';
import { saveVerdict } from './wellVerdicts';

export type Verdict = 'well' | 'not-well';

// A well as the backend sends it (WellView); only the fields the site uses
export interface WellView {
  id: number;
  // e.g. SW-2026-A001
  code: string;
  task_id: string;
  // null: not verified yet
  verdict: Verdict | null;
  // the AI's; null for a well added by hand
  confidence: number | null;
  // found by the AI, or added by hand
  source: 'ai' | 'manual';
  latitude: number;
  longitude: number;
}

export interface MapWell {
  // its code, as the site names and addresses it (SW-2026-A001)
  id: string;
  // the backend's own id, for its image and changes to it
  wellId: number;
  latitude: number;
  longitude: number;
  // the same as text ('23.83012, 120.46023')
  coordinates: string;
  // when the map it was found in came in: 'YYYY-MM-DD HH:mm', Taipei time
  timestamp: string;
  // the imported map it was found in
  recordId: string;
  verdict: Verdict | null;
  confidence: number | null;
  // added by hand (and so may be taken off again), not found by the AI
  manual: boolean;
}

export function toMapWell(well: WellView, task: Pick<Task, 'created_at'>): MapWell {
  return {
    id: well.code,
    wellId: well.id,
    latitude: well.latitude,
    longitude: well.longitude,
    coordinates: coordinatesText(well),
    timestamp: taipeiDateTime(task.created_at),
    recordId: well.task_id,
    verdict: well.verdict,
    confidence: well.confidence,
    manual: well.source === 'manual',
  };
}

// How sure the AI was that it is a well, as the site writes it ('AI 信心度 92%'); a well added by hand was not the AI's
export const confidenceText = (confidence: number | null) => (confidence === null ? '人工標記' : `AI 信心度 ${Math.round(confidence * 100)}%`);

type Point = Pick<MapWell, 'latitude' | 'longitude'>;

// A point as the site writes it ('23.83012, 120.46023')
export const coordinatesText = (point: Point) => `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;

// Web Mercator's sphere (EPSG:3857), in metres
const EARTH_RADIUS = 6378137;

// A WGS84 point in the backend's EPSG:3857 metres (e east, n north), as POST /wells takes it
export function toWebMercator({ latitude, longitude }: Point): { e: number; n: number } {
  const radians = Math.PI / 180;
  return { e: EARTH_RADIUS * longitude * radians, n: EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + (latitude * radians) / 2)) };
}

// Whether a point lies on a map's imagery (its WGS84 bounds), where a well can be placed by hand
export const isOnImagery = ([west, south, east, north]: Imagery['bounds'], { latitude, longitude }: Point) =>
  longitude >= west && longitude <= east && latitude >= south && latitude <= north;

// Adds a well by hand where it was placed on its map (Backend-SPEC §4.5): the backend gives it its code. Someone saw a
// well there, so it is verified as one. Throws the backend's message when it is not added or verified.
export async function addWell(taskId: string, point: Point): Promise<Pick<WellView, 'id' | 'code'>> {
  const well = await api<Pick<WellView, 'id' | 'code'>>('/wells', { method: 'POST', body: { taskId, ...toWebMercator(point) } });
  await saveVerdict({ id: well.code, wellId: well.id }, 'well');
  return well;
}

// Takes a well added by hand off its map (an operator only off a map they uploaded: canDelete). Throws the backend's
// message when it is not taken off.
export const removeWell = (well: Pick<MapWell, 'wellId'>) => api(`/wells/${well.wellId}`, { method: 'DELETE' });

// Viewers only look (§3)
export const canAddWell = (role: Role) => role !== 'viewer';

// A map's wells as the backend sends them
export const fetchWellViews = (taskId: string) => api<WellView[]>(`/wells?taskId=${encodeURIComponent(taskId)}`);

export async function fetchWells(task: Pick<Task, 'id' | 'created_at'>): Promise<MapWell[]> {
  const wells = await fetchWellViews(task.id);
  return wells.map((well) => toMapWell(well, task));
}

// The well's aerial photo, cut from its map around it (a PNG, size px square), radius metres each way (the backend's
// 15 when not given)
export const wellImageUrl = (well: Pick<MapWell, 'wellId'>, size: number, radius?: number) =>
  `/wells/${well.wellId}/image?size=${size}${radius ? `&radius=${radius}` : ''}`;
