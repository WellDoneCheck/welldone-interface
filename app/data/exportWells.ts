// Wells recognised by the AI, listed on the export page.
// Placeholder data until wells come from the backend; they stand on the test sites in testWellSites.ts.
import { DETECTED_WELL_SITES } from './testWellSites';
import { YEAR_GROUPS } from './mapRecords';

export type WellVerdict = 'well' | 'not-well';

export interface ExportWell {
  id: string;
  latitude: number;
  longitude: number;
  capturedAt: string;
  // the imported map (a map record's id) it was found in
  mapRecordId: string;
  // null until someone has verified the recognition
  verdict: WellVerdict | null;
}

const VERIFIED_COUNT = 100;
const PENDING_COUNT = 5;
// The 2023 map finished recognising: these are its wells (same ids and sites as in mapRecords.ts)
const SOURCE_MAP = YEAR_GROUPS.find((group) => group.year === '2023')!.records.find((record) => record.status === 'done')!.id;

function buildWell(index: number, verdict: WellVerdict | null): ExportWell {
  const day = String((index % 28) + 1).padStart(2, '0');
  return {
    id: `SW-2023-A${String(index + 1).padStart(3, '0')}`,
    ...DETECTED_WELL_SITES[index],
    capturedAt: `2023-10-${day} 14:30`,
    mapRecordId: SOURCE_MAP,
    verdict,
  };
}

// Every ninth verified well turned out not to be a well
export const EXPORT_WELLS: ExportWell[] = [
  ...Array.from({ length: VERIFIED_COUNT }, (_, index) => buildWell(index, index % 9 === 3 ? 'not-well' : 'well')),
  ...Array.from({ length: PENDING_COUNT }, (_, index) => buildWell(VERIFIED_COUNT + index, null)),
];

export function findExportWell(id: string | undefined): ExportWell | undefined {
  return EXPORT_WELLS.find((well) => well.id === id);
}

export function formatCoordinates(well: ExportWell): string {
  return `${well.latitude.toFixed(5)}, ${well.longitude.toFixed(5)}`;
}
