// Wells the AI recognised in an imported map (Backend-SPEC §4.5), shown as pins on the map page
import { api } from './api';
import type { Task } from './tasks';
import { taipeiDateTime } from './taipeiTime';

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
}

export function toMapWell(well: WellView, task: Pick<Task, 'created_at'>): MapWell {
  return {
    id: well.code,
    wellId: well.id,
    latitude: well.latitude,
    longitude: well.longitude,
    coordinates: `${well.latitude.toFixed(5)}, ${well.longitude.toFixed(5)}`,
    timestamp: taipeiDateTime(task.created_at),
    recordId: well.task_id,
    verdict: well.verdict,
    confidence: well.confidence,
  };
}

export async function fetchWells(task: Pick<Task, 'id' | 'created_at'>): Promise<MapWell[]> {
  const wells = await api<WellView[]>(`/wells?taskId=${encodeURIComponent(task.id)}`);
  return wells.map((well) => toMapWell(well, task));
}

// The well's aerial photo, cut from its map around it (a PNG, size px square)
export const wellImageUrl = (well: Pick<MapWell, 'wellId'>, size: number) => `/wells/${well.wellId}/image?size=${size}`;
