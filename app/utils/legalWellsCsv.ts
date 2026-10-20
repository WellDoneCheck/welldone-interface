import { parseCsv } from './csv';
import type { GeoPoint } from './wellComparison';

// Header names recognised for each column; Chinese names match anywhere in the header (e.g. 「水井編號」「緯度(WGS84)」),
// English names must match the whole header
const COLUMN_ALIASES = {
  id: ['編號', '井號', 'id', 'well_id', 'no'],
  latitude: ['緯度', 'lat', 'latitude'],
  longitude: ['經度', 'lng', 'lon', 'long', 'longitude'],
};

type Column = keyof typeof COLUMN_ALIASES;

export type LegalWellsParseResult =
  | { ok: true; wells: GeoPoint[]; skippedRows: number }
  | { ok: false; error: string };

const hasHan = (text: string) => /[一-鿿]/.test(text);

function findColumn(headers: string[], column: Column): number {
  const normalized = headers.map((header) => header.trim().toLowerCase());
  return normalized.findIndex((header) =>
    COLUMN_ALIASES[column].some((alias) => (hasHan(alias) ? header.includes(alias) : header === alias)),
  );
}

function parseCoordinate(value: string | undefined, limit: number): number | null {
  const number = Number(value?.trim());
  return value?.trim() && Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
}

// Legal well register (WGS84 degrees) → wells; rows without a usable coordinate are skipped and counted
export function parseLegalWellsCsv(text: string): LegalWellsParseResult {
  const [headers, ...rows] = parseCsv(text);
  if (!headers) return { ok: false, error: '檔案沒有內容' };

  const idColumn = findColumn(headers, 'id');
  const latitudeColumn = findColumn(headers, 'latitude');
  const longitudeColumn = findColumn(headers, 'longitude');
  if (latitudeColumn < 0 || longitudeColumn < 0) {
    return { ok: false, error: '找不到緯度／經度欄位，請確認標題列含有「緯度」「經度」（或 lat / lng）' };
  }

  const wells: GeoPoint[] = [];
  rows.forEach((row, index) => {
    const latitude = parseCoordinate(row[latitudeColumn], 90);
    const longitude = parseCoordinate(row[longitudeColumn], 180);
    if (latitude === null || longitude === null) return;
    const id = (idColumn >= 0 ? row[idColumn]?.trim() : '') || `第 ${index + 2} 列`;
    wells.push({ id, latitude, longitude });
  });

  if (wells.length === 0) return { ok: false, error: '沒有任何一列含有效的經緯度' };
  return { ok: true, wells, skippedRows: rows.length - wells.length };
}
