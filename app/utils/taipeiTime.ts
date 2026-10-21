// The backend's times are UTC ISO strings (Backend-SPEC §1); the site shows them in Taipei time, which has no daylight
// saving, so it is always UTC+8.
const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;

// '2026-10-20T05:52:00.000Z' -> '2026-10-20 13:52'
export function taipeiDateTime(iso: string): string {
  return new Date(new Date(iso).getTime() + TAIPEI_OFFSET_MS).toISOString().slice(0, 16).replace('T', ' ');
}
