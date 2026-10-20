// Names people give imported map files (each map record is one), shared by the import, map, check and compare pages.
// A file without one is named after when it came in (defaultRecordName). Kept in localStorage until the backend stores
// it; where storage is blocked, names last until the page is reloaded.
import { defaultRecordName, type RecordItem } from '../data/mapRecords';

type Names = Record<string, string>;

const STORAGE_KEY = 'skywell:record-names';
const NO_NAMES: Names = {};

// read from storage on first use, then kept here; a new object on every change, as useSyncExternalStore expects
let names: Names | null = null;
const listeners = new Set<() => void>();

function load(): Names {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return stored && typeof stored === 'object' ? (stored as Names) : {};
  } catch {
    return {};
  }
}

export function getRecordNames(): Names {
  names ??= load();
  return names;
}

// The server knows no names: pages render the default ones there, and the browser fills in the rest
export const getServerRecordNames = () => NO_NAMES;

export function recordName(record: Pick<RecordItem, 'id' | 'timestamp'>, from: Names = getRecordNames()): string {
  return from[record.id] ?? defaultRecordName(record);
}

// A blank name goes back to the default one
export function renameRecord(id: string, name: string): void {
  const next = { ...getRecordNames() };
  const trimmed = name.trim();
  if (trimmed) next[id] = trimmed;
  else delete next[id];
  names = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  } catch {
    // storage blocked: the name lasts until the page is reloaded
  }
  listeners.forEach((listener) => listener());
}

// For useSyncExternalStore: renames in this tab and in other tabs (storage event)
export function subscribeToRecordNames(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    names = load();
    listener();
  };
  listeners.add(listener);
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}
