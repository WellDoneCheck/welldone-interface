import { findRecord, getLatestRecord, type RecordItem } from '../data/mapRecords';
import { findExportWell, formatCoordinates } from '../data/exportWells';
import type { CheckedWell } from '../components/CheckPage';

// The map and check pages read their well from the address (?record=<id>) in the browser, so both pages stay static:
// Next can then prefetch them whole and navigating between them never waits on the server (nor shows the loading screen)

export interface MapRouteView {
  record: RecordItem;
  openCardOnArrival: boolean;
  cardOpenAtStart: boolean;
}

// /map?record=<id> shows that imported map; without it (or with an unknown id) the latest map is shown.
// &from=check (the check page's back link) opens its card at once, so the well moves straight back into it.
export function resolveMapRoute(recordId: string | null, from: string | null): MapRouteView {
  const requested = findRecord(recordId ?? undefined);
  return {
    record: requested ?? getLatestRecord(),
    openCardOnArrival: requested !== undefined,
    cardOpenAtStart: requested !== undefined && from === 'check',
  };
}

export interface CheckRouteView {
  record: CheckedWell;
  backHref: string;
}

// Wells listed on the export page open on the check page too
function findExportedWell(id: string | undefined): CheckedWell | undefined {
  const well = findExportWell(id);
  return well && { id: well.id, coordinates: formatCoordinates(well), timestamp: well.capturedAt };
}

// /check?record=<id> checks that well (an imported map record or an export-page well);
// without it (or with an unknown id) the latest record is shown
export function resolveCheckRoute(recordId: string | null): CheckRouteView {
  const id = recordId ?? undefined;
  const exported = findRecord(id) ? undefined : findExportedWell(id);
  const record = exported ?? findRecord(id) ?? getLatestRecord();
  // back to the map: to this well with its card already open (so the well moves straight back into it), or to the
  // map itself for export-page wells, which have no pin there
  const backHref = exported ? '/map' : `/map?record=${record.id}&from=check`;
  return { record, backHref };
}
