// Whether each well is a well, as people verify it on the check and export pages, shared by those pages and the map
// page's export shortcut (its verified / pending counts). Kept over the placeholder verdicts (exportWells.ts) in
// localStorage until the backend stores them; where storage is blocked, they last until the page is reloaded.
import type { WellVerdict } from '../data/exportWells';

type Verdicts = Record<string, WellVerdict>;

const STORAGE_KEY = 'skywell:well-verdicts';
const NO_VERDICTS: Verdicts = {};

// read from storage on first use, then kept here; a new object on every change, as useSyncExternalStore expects
let verdicts: Verdicts | null = null;
const listeners = new Set<() => void>();

function load(): Verdicts {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return stored && typeof stored === 'object' ? (stored as Verdicts) : {};
  } catch {
    return {};
  }
}

export function getWellVerdicts(): Verdicts {
  verdicts ??= load();
  return verdicts;
}

// The server knows none: pages render the placeholder verdicts there, and the browser fills in the rest
export const getServerWellVerdicts = () => NO_VERDICTS;

// A well's verdict: as verified here, or else as it came (null: not verified yet)
export function verdictOf(well: { id: string; verdict?: WellVerdict | null }, from: Verdicts = getWellVerdicts()): WellVerdict | null {
  return from[well.id] ?? well.verdict ?? null;
}

export function setWellVerdict(id: string, verdict: WellVerdict): void {
  verdicts = { ...getWellVerdicts(), [id]: verdict };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(verdicts));
  } catch {
    // storage blocked: the verdict lasts until the page is reloaded
  }
  listeners.forEach((listener) => listener());
}

// How many of these wells have been verified, and how many are still waiting
export function countVerdicts(wells: { id: string; verdict?: WellVerdict | null }[], from: Verdicts = getWellVerdicts()) {
  const verified = wells.filter((well) => verdictOf(well, from) !== null).length;
  return { verified, pending: wells.length - verified };
}

// For useSyncExternalStore: verdicts given in this tab and in other tabs (storage event)
export function subscribeToWellVerdicts(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    verdicts = load();
    listener();
  };
  listeners.add(listener);
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}
