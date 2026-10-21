// Whether each well is a well, as people verify it on the check and export pages (PATCH /wells/:id/verdict,
// Backend-SPEC §4.5). The verdicts given here are also kept in this tab, by well code, over the ones the wells came
// with, so every page (the map's pins, the export page and its counts) shows a verdict as soon as it is given.
import { api } from './api';
import type { Role } from './session';
import type { MapWell, Verdict } from './wells';

type Verdicts = Record<string, Verdict>;

const NO_VERDICTS: Verdicts = {};

// a new object on every change, as useSyncExternalStore expects
let verdicts: Verdicts = NO_VERDICTS;
const listeners = new Set<() => void>();

export const getWellVerdicts = (): Verdicts => verdicts;

// The server knows none: pages render the verdicts the wells came with there
export const getServerWellVerdicts = () => NO_VERDICTS;

// A well's verdict: as verified here, or else as it came (null: not verified yet)
export function verdictOf(well: { id: string; verdict?: Verdict | null }, from: Verdicts = getWellVerdicts()): Verdict | null {
  return from[well.id] ?? well.verdict ?? null;
}

// What a well's verification looks like wherever it shows (map pins, the export page's sections and tags, the check
// page's buttons): not verified yet, verified to be a well, verified not to be one
export type VerdictLook = Verdict | 'pending';
export const VERDICT_COLOR: Record<VerdictLook, string> = {
  pending: '#BC5646',
  // the site's teal, as the export button
  well: '#62A4A7',
  'not-well': '#8A8F8C',
};
export const lookOf = (verdict: Verdict | null): VerdictLook => verdict ?? 'pending';

// Viewers only look (§3)
export const canVerify = (role: Role) => role !== 'viewer';

// Throws the backend's message when it is not saved
export async function saveVerdict(well: Pick<MapWell, 'id' | 'wellId'>, verdict: Verdict): Promise<void> {
  await api(`/wells/${well.wellId}/verdict`, { method: 'PATCH', body: { verdict } });
  verdicts = { ...verdicts, [well.id]: verdict };
  listeners.forEach((listener) => listener());
}

// How many of these wells have been verified, and how many are still waiting
export function countVerdicts(wells: { id: string; verdict?: Verdict | null }[], from: Verdicts = getWellVerdicts()) {
  const verified = wells.filter((well) => verdictOf(well, from) !== null).length;
  return { verified, pending: wells.length - verified };
}

// For useSyncExternalStore: verdicts given in this tab
export function subscribeToWellVerdicts(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
