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
}

export interface YearGroup {
  year: string;
  records: RecordItem[];
}

const YEARS = ['2023', '2022', '2021', '2020'];
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
      };
    }),
  };
}

export const YEAR_GROUPS: YearGroup[] = YEARS.map(buildYearGroup);

const ALL_RECORDS = YEAR_GROUPS.flatMap((group) => group.records);

export function findRecord(id: string | undefined): RecordItem | undefined {
  return ALL_RECORDS.find((record) => record.id === id);
}

// Newest by timestamp; the first one listed wins a tie
export function getLatestRecord(): RecordItem {
  return ALL_RECORDS.reduce((latest, record) => (record.timestamp > latest.timestamp ? record : latest));
}
