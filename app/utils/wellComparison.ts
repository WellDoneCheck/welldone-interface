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

export interface WellComparison {
  // detected by the AI and on the legal register
  matched: { detected: GeoPoint; legal: GeoPoint; distance: number }[];
  // detected by the AI but no legal well within the tolerance
  unregistered: { detected: GeoPoint; nearestLegal: Nearest | null }[];
  // on the legal register but nothing detected within the tolerance
  missing: { legal: GeoPoint; nearestDetected: Nearest | null }[];
}

const EARTH_RADIUS_M = 6_371_000;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

// Great-circle (haversine) distance in metres
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

function nearestTo(point: GeoPoint, candidates: GeoPoint[]): Nearest | null {
  let nearest: Nearest | null = null;
  for (const candidate of candidates) {
    const distance = distanceMeters(point, candidate);
    if (!nearest || distance < nearest.distance) nearest = { point: candidate, distance };
  }
  return nearest;
}

// One-to-one matching: the closest detection/legal pairs within the tolerance are paired first
export function compareWells(detected: GeoPoint[], legal: GeoPoint[], toleranceMeters: number): WellComparison {
  const pairs: { detected: GeoPoint; legal: GeoPoint; distance: number }[] = [];
  for (const d of detected) {
    for (const l of legal) {
      const distance = distanceMeters(d, l);
      if (distance <= toleranceMeters) pairs.push({ detected: d, legal: l, distance });
    }
  }
  pairs.sort((a, b) => a.distance - b.distance);

  const pairedDetected = new Set<GeoPoint>();
  const pairedLegal = new Set<GeoPoint>();
  const matched = pairs.filter((pair) => {
    if (pairedDetected.has(pair.detected) || pairedLegal.has(pair.legal)) return false;
    pairedDetected.add(pair.detected);
    pairedLegal.add(pair.legal);
    return true;
  });

  return {
    matched,
    unregistered: detected.filter((d) => !pairedDetected.has(d)).map((d) => ({ detected: d, nearestLegal: nearestTo(d, legal) })),
    missing: legal.filter((l) => !pairedLegal.has(l)).map((l) => ({ legal: l, nearestDetected: nearestTo(l, detected) })),
  };
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
