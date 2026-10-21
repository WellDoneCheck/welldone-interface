// The monitor page's figures: the backend's (GET /monitor/stats, Backend-SPEC §4.7) once logged in, as it only answers
// logged-in users; until then the simulated ones (data/monitor.ts)
import { api } from './api';
import type { MapWell, Verdict } from './wells';
import { RECOGNITION_ACCURACY, TREND, TREND_FIRST_DAY, VERIFIED_THIS_WEEK, type WellMarker, type WellStatus } from '../data/monitor';

export interface MonitorStats {
  // is a well / not verified yet / not a well
  wells: Record<WellStatus, number>;
  // % of the AI's wells verified to be wells; null while none has been verified
  accuracy: number | null;
  // verified to be wells since Monday 00:00, Taipei time
  verifiedThisWeek: number;
  // wells verified per day over the last 30 days, today last; firstDay 'YYYY-MM-DD' (Taipei)
  trend: { firstDay: string; counts: number[] };
}

export const fetchMonitorStats = () => api<MonitorStats>('/monitor/stats', { cache: 'no-store' });

// The backend's figures, or the simulated ones with these (live simulated) totals
export function monitorFigures(stats: MonitorStats | null, simulatedTotals: Record<WellStatus, number>): MonitorStats {
  return (
    stats ?? {
      wells: simulatedTotals,
      accuracy: RECOGNITION_ACCURACY,
      verifiedThisWeek: VERIFIED_THIS_WEEK,
      trend: { firstDay: TREND_FIRST_DAY, counts: TREND },
    }
  );
}

// The accuracy with at most one decimal (97.3, 100), or '—' while none has been verified
export const accuracyText = (accuracy: number | null) => (accuracy === null ? '—' : String(Number(accuracy.toFixed(1))));

const STATUS_OF: Record<Verdict | 'none', WellStatus> = { well: 'verified', 'not-well': 'rejected', none: 'pending' };

// The AI's confidence as a % with one decimal (it may come as 0–1 or as 0–100)
export function confidencePercent(confidence: number | null): number | null {
  if (confidence === null) return null;
  return Math.round((confidence <= 1 ? confidence * 100 : confidence) * 10) / 10;
}

// A well of the newest finished map as a marker on the monitor's map, coloured by its verdict
export function wellMarker(well: MapWell, verdict: Verdict | null): WellMarker {
  return {
    recordId: well.id,
    coordinates: well.coordinates,
    latitude: well.latitude,
    longitude: well.longitude,
    status: STATUS_OF[verdict ?? 'none'],
    confidence: confidencePercent(well.confidence),
  };
}
