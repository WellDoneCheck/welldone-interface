// Imported maps (one per drone flight) listed on the import page, and the wells recognised in each, shown as pins
// on the map page. Placeholder data until both come from the backend; the wells stand on the test sites in
// testWellSites.ts.
import { DETECTED_WELL_SITES } from './testWellSites';

export type RecordStatus = 'done' | 'recognizing' | 'cutting';

// An imported map: id is its uuid, as the backend gives it
export interface RecordItem {
  id: string;
  timestamp: string;
  current: number;
  total: number;
  status: RecordStatus;
  statusLabel: string;
  progress: number;
}

// A well recognised in an imported map
export interface MapWell {
  id: string;
  // its position, and the same as text ('23.83012, 120.46023')
  latitude: number;
  longitude: number;
  coordinates: string;
  // when the map it was found in came in
  timestamp: string;
  // the imported map it was found in
  recordId: string;
}

export interface YearGroup {
  year: string;
  records: RecordItem[];
}

const YEARS = ['2023', '2022', '2021', '2020'];
const TOTAL_TILES = 300;
// Import times within a year, newest first like the list
const IMPORT_TIMES = ['16:40', '13:20', '09:10'];
// Each year's imports, in that order
const IMPORT_IDS: Record<string, string[]> = {
  '2023': ['0145424d-939e-4a03-9057-fed5923bae6b', '8b6d12b3-a3d0-45b1-bdce-1cb35e941a26', '560fcc22-4296-4290-9555-6a69f9caaea9'],
  '2022': ['175cb5a2-80b7-4af7-af45-8ac840a4ab08', '5e3b09be-5939-43c6-95fb-bf0719a24dbe', 'd19d5362-a7ab-445e-bb36-17f3017f0687'],
  '2021': ['439573bb-5575-4bc9-a75d-2993f78610a4', '1772ce3d-7142-471c-881c-f419536c88e9', '87eda35a-ba0c-4779-9898-8e9d3c571f9e'],
  '2020': ['11ddab81-36be-4d68-b6ef-5fe0bc1bd159', 'eff7b59f-fc41-4620-b2e3-fa9e8b391d5d', 'e71d0c8b-3c8d-4258-a2c6-5113feae5c24'],
};

// An imported map (or a monitor batch) is named after when it came in until someone renames it: '2023/10/11 16:40 匯入'.
// Not after its well: a well keeps its own id (SW-2023-A01).
export function importName(dateTime: string): string {
  return `${dateTime.slice(0, 16).replaceAll('-', '/')} 匯入`;
}

export const defaultRecordName = (record: Pick<RecordItem, 'timestamp'>) => importName(record.timestamp);

function buildYearGroup(year: string): YearGroup {
  const doneLabel = year === '2023' ? '已完成 (二次驗證 2/300)' : '已完成';
  const statuses: Pick<RecordItem, 'current' | 'status' | 'statusLabel' | 'progress'>[] = [
    { current: 300, status: 'cutting', statusLabel: '正在切圖中', progress: 16.3 },
    { current: 20, status: 'recognizing', statusLabel: '正在辨識中', progress: 75.3 },
    { current: 300, status: 'done', statusLabel: doneLabel, progress: 100 },
  ];

  return {
    year,
    records: statuses.map((state, index) => ({
      ...state,
      id: IMPORT_IDS[year][index],
      timestamp: `${year}-10-11 ${IMPORT_TIMES[index]}:00`,
      total: TOTAL_TILES,
    })),
  };
}

export const YEAR_GROUPS: YearGroup[] = YEARS.map(buildYearGroup);

const ALL_RECORDS = YEAR_GROUPS.flatMap((group) => group.records);

// Every imported map
export const MAP_RECORDS: RecordItem[] = ALL_RECORDS;

export function findRecord(id: string | undefined): RecordItem | undefined {
  return ALL_RECORDS.find((record) => record.id === id);
}

// How many of the detected sites have been recognised in a map. Every import flew the same strip: a finished one has
// a well at every site, one still being recognised only as many as its share of tiles recognised, one still being cut
// none yet.
function recognisedCount(record: RecordItem): number {
  if (record.status === 'done') return DETECTED_WELL_SITES.length;
  if (record.status === 'recognizing') return Math.round((DETECTED_WELL_SITES.length * record.current) / record.total);
  return 0;
}

// Well ids go by year and series: A for a finished map's wells, B for one still being recognised ('SW-2023-A001')
function buildWells(record: RecordItem): MapWell[] {
  const year = record.timestamp.slice(0, 4);
  const series = record.status === 'done' ? 'A' : 'B';
  return DETECTED_WELL_SITES.slice(0, recognisedCount(record)).map((site, index) => ({
    id: `SW-${year}-${series}${String(index + 1).padStart(3, '0')}`,
    ...site,
    coordinates: `${site.latitude.toFixed(5)}, ${site.longitude.toFixed(5)}`,
    timestamp: record.timestamp,
    recordId: record.id,
  }));
}

const WELLS_BY_RECORD = new Map(ALL_RECORDS.map((record) => [record.id, buildWells(record)]));

// The wells recognised so far in an imported map (none for an unknown id)
export function wellsOf(recordId: string): MapWell[] {
  return WELLS_BY_RECORD.get(recordId) ?? [];
}

export function findWell(id: string | undefined): MapWell | undefined {
  for (const wells of WELLS_BY_RECORD.values()) {
    const well = wells.find((candidate) => candidate.id === id);
    if (well) return well;
  }
  return undefined;
}

// Newest by timestamp; the first one listed wins a tie
function newest(records: RecordItem[]): RecordItem {
  return records.reduce((latest, record) => (record.timestamp > latest.timestamp ? record : latest));
}

export function getLatestRecord(): RecordItem {
  return newest(ALL_RECORDS);
}

// The newest map finished recognising (all its wells found): the map page's map when none is asked for
export function getLatestFinishedRecord(): RecordItem {
  return newest(ALL_RECORDS.filter((record) => record.status === 'done'));
}
