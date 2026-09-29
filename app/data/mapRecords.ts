// Imported map records shared by the import page (list) and the map page (display).
// Placeholder data until records come from the backend.

export type RecordStatus = 'done' | 'recognizing' | 'cutting';

export interface RecordItem {
  id: string;
  timestamp: string;
  coordinates: string;
  current: number;
  total: number;
  status: RecordStatus;
  statusLabel: string;
  progress: number;
  // where its pin stands on the map photo: the pin's top-left corner in % of the photo's width and height
  pin: { left: number; top: number };
}

export interface YearGroup {
  year: string;
  records: RecordItem[];
}

const YEARS = ['2023', '2022', '2021', '2020'];
// Pin spots on the map photo, one per record in order (the first is the Figma pin). All sit left of the well card and
// clear of the navbar above and the shortcuts in the bottom-left corner.
const PIN_SPOTS = [
  { left: 17.263, top: 19.601 },
  { left: 30, top: 30 },
  { left: 9, top: 42 },
  { left: 24, top: 52 },
  { left: 36, top: 18 },
  { left: 14, top: 66 },
  { left: 33, top: 44 },
  { left: 27, top: 72 },
  { left: 6, top: 24 },
  { left: 38, top: 60 },
  { left: 20, top: 36 },
  { left: 37, top: 76 },
];
const TOTAL_TILES = 300;

function buildYearGroup(year: string, yearIndex: number): YearGroup {
  const doneLabel = year === '2023' ? '已完成 (二次驗證 2/300)' : '已完成';
  const timestamp = `${year}-10-11 00:00:00`;
  const statuses: Pick<RecordItem, 'current' | 'status' | 'statusLabel' | 'progress'>[] = [
    { current: 300, status: 'cutting', statusLabel: '正在切圖中', progress: 16.3 },
    { current: 20, status: 'recognizing', statusLabel: '正在辨識中', progress: 75.3 },
    { current: 300, status: 'done', statusLabel: doneLabel, progress: 100 },
  ];

  return {
    year,
    records: statuses.map((state, index) => {
      const order = yearIndex * statuses.length + index;
      return {
        ...state,
        id: `SW-${year}-A0${index + 1}`,
        timestamp,
        total: TOTAL_TILES,
        coordinates: `${(23.456 + order * 0.011).toFixed(3)}, ${(120.123 + order * 0.007).toFixed(3)}`,
        pin: PIN_SPOTS[order % PIN_SPOTS.length],
      };
    }),
  };
}

export const YEAR_GROUPS: YearGroup[] = YEARS.map(buildYearGroup);

const ALL_RECORDS = YEAR_GROUPS.flatMap((group) => group.records);

// Every record with a pin on the map
export const MAP_RECORDS: RecordItem[] = ALL_RECORDS;

export function findRecord(id: string | undefined): RecordItem | undefined {
  return ALL_RECORDS.find((record) => record.id === id);
}

// Newest by timestamp; the first one listed wins a tie
export function getLatestRecord(): RecordItem {
  return ALL_RECORDS.reduce((latest, record) => (record.timestamp > latest.timestamp ? record : latest));
}
