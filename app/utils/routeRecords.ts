import { findRecord, findWell, getLatestFinishedRecord, wellsOf, type MapWell, type RecordItem } from '../data/mapRecords';
import type { CheckedWell } from '../components/CheckPage';

// The map and check pages read their map and well from the address in the browser, so both pages stay static:
// Next can then prefetch them whole and navigating between them never waits on the server (nor shows the loading screen)

export interface MapRouteView {
  // the imported map shown, and the wells recognised in it (its pins)
  record: RecordItem;
  wells: MapWell[];
  // the well selected, whose card opens; null when none is asked for (e.g. opening the map from the import page)
  well: MapWell | null;
  openCardOnArrival: boolean;
  cardOpenAtStart: boolean;
}

// /map?record=<map id> shows that imported map with its wells; without it (or with an unknown id) the newest finished
// map. &well=<id> selects one of its wells and opens its card; &from=check (the check page's back link) opens it at
// once, so the well moves straight back into it.
export function resolveMapRoute(recordId: string | null, wellId: string | null, from: string | null): MapRouteView {
  const record = findRecord(recordId ?? undefined) ?? getLatestFinishedRecord();
  const wells = wellsOf(record.id);
  const well = wells.find((candidate) => candidate.id === wellId) ?? null;
  return { record, wells, well, openCardOnArrival: well !== null, cardOpenAtStart: well !== null && from === 'check' };
}

// The map page with a well of it selected (its card open)
export function mapHref(well: Pick<MapWell, 'id' | 'recordId'>): string {
  return `/map?record=${well.recordId}&well=${encodeURIComponent(well.id)}`;
}

export interface CheckRouteView {
  record: CheckedWell;
  backHref: string;
}

// The imported map a well was found in
export function findSourceMap(wellId: string): RecordItem | undefined {
  return findRecord(findWell(wellId)?.recordId);
}

// /check?record=<well id> checks that well; without it (or with an unknown id) the first well of the newest finished
// map. Back to the map: to this well in its map, with its card already open (so the well moves straight back into it).
export function resolveCheckRoute(wellId: string | null): CheckRouteView {
  const well = findWell(wellId ?? undefined) ?? wellsOf(getLatestFinishedRecord().id)[0];
  return { record: well, backHref: `${mapHref(well)}&from=check` };
}
