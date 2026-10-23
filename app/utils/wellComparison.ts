import { toCsv } from './csv';

export interface GeoPoint {
  id: string;
  latitude: number;
  longitude: number;
}

export interface Nearest {
  point: GeoPoint;
  distance: number;
}

// The comparison of a map's recognised wells with its legal well register (worked out by the backend: wellRegistry.ts)
export interface WellComparison {
  // detected by the AI and on the legal register
  matched: { detected: GeoPoint; legal: GeoPoint; distance: number }[];
  // detected by the AI but no legal well within the tolerance
  unregistered: { detected: GeoPoint; nearestLegal: Nearest | null }[];
  // on the legal register but nothing detected within the tolerance
  missing: { legal: GeoPoint; nearestDetected: Nearest | null }[];
}

const CSV_HEADER = ['類別', '辨識編號', '辨識緯度', '辨識經度', '合法井編號', '合法井緯度', '合法井經度', '距離(公尺)', '登記處理'];
const pointFields = (point: GeoPoint | undefined) => (point ? [point.id, String(point.latitude), String(point.longitude)] : ['', '', '']);
const meters = (distance: number | undefined) => (distance === undefined ? '' : String(Math.round(distance)));

// Every result on its own row; for unmatched wells the nearest well on the other side is listed with its distance.
// Suspected unregistered wells listed in toRegisterIds (detection ids) are marked 待登記.
export function buildComparisonCsv(comparison: WellComparison, toRegisterIds: ReadonlySet<string> = new Set()): string {
  return toCsv([
    CSV_HEADER,
    ...comparison.matched.map((m) => ['合法已辨識', ...pointFields(m.detected), ...pointFields(m.legal), meters(m.distance), '']),
    ...comparison.unregistered.map((u) => [
      '疑似未登記',
      ...pointFields(u.detected),
      ...pointFields(u.nearestLegal?.point),
      meters(u.nearestLegal?.distance),
      toRegisterIds.has(u.detected.id) ? '待登記' : '',
    ]),
    ...comparison.missing.map((m) => ['清冊未辨識', ...pointFields(m.nearestDetected?.point), ...pointFields(m.legal), meters(m.nearestDetected?.distance), '']),
  ]);
}
