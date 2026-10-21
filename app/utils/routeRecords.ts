import { api } from './api';
import { toCapture, type Capture, type TimelineEntry } from './captures';
import { pickMapTask, type Task } from './tasks';
import { fetchImagery, type Imagery } from './tileServer';
import { fetchWells, toMapWell, type MapWell, type WellView } from './wells';

// The map and check pages read their map and well from the address in the browser, so both pages stay static (Next
// can then prefetch them whole), and then read them from the backend

// The imported map the map page shows, with the wells recognised in it (its pins) and its imagery (null until it has
// been cut)
export interface MapView {
  task: Task;
  wells: MapWell[];
  imagery: Imagery | null;
}

// /map?record=<map id> shows that imported map; without it (or with an unknown id) the newest finished one
export async function loadMapView(recordId: string | null): Promise<MapView> {
  const task = pickMapTask(await api<Task[]>('/tasks'), recordId);
  if (!task) throw new Error('還沒有辨識完成的地圖，請先到上傳頁面匯入影像');
  const [wells, imagery] = await Promise.all([fetchWells(task), fetchImagery(task.id).catch(() => null)]);
  return { task, wells, imagery };
}

export interface MapRouteWell {
  // the well selected, whose card opens; null when none is asked for (e.g. opening the map from the import page)
  well: MapWell | null;
  openCardOnArrival: boolean;
  cardOpenAtStart: boolean;
}

// &well=<id> selects one of the map's wells and opens its card; &from=check (the check page's back link) opens it at
// once, so the well moves straight back into it
export function resolveMapWell(wells: MapWell[], wellId: string | null, from: string | null): MapRouteWell {
  const well = wells.find((candidate) => candidate.id === wellId) ?? null;
  return { well, openCardOnArrival: well !== null, cardOpenAtStart: well !== null && from === 'check' };
}

// The map page with a well of it selected (its card open)
export function mapHref(well: { id: string; recordId: string }): string {
  return `/map?record=${well.recordId}&well=${encodeURIComponent(well.id)}`;
}

// What the check page shows: the well, the map it was found in, and its captures (the same spot in every imported map)
export interface CheckView {
  well: MapWell;
  task: Task;
  captures: Capture[];
  // back to this well in its map, with its card already open (so the well moves straight back into it)
  backHref: string;
}

// The first well of the newest finished map, when the address names none
async function firstWell(): Promise<{ well: MapWell; task: Task }> {
  const { task, wells } = await loadMapView(null);
  if (!wells.length) throw new Error('最新的地圖沒有辨識到水井');
  return { well: wells[0], task };
}

async function wellByCode(code: string): Promise<{ well: MapWell; task: Task }> {
  const view = await api<WellView>(`/wells/code/${encodeURIComponent(code)}`);
  const task = await api<Task>(`/tasks/${view.task_id}`);
  return { well: toMapWell(view, task), task };
}

// /check?record=<well code> checks that well; without it the first well of the newest finished map
export async function loadCheckView(code: string | null): Promise<CheckView> {
  const { well, task } = code ? await wellByCode(code) : await firstWell();
  const timeline = await api<TimelineEntry[]>(`/wells/${well.wellId}/timeline`);
  return { well, task, captures: timeline.map(toCapture), backHref: `${mapHref(well)}&from=check` };
}
