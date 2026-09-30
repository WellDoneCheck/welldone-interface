// The map record and the well each account last opened, so the navbar can take them back there.
// A visit counts for VISIT_TTL_MS after it was made; after that it is treated as never made.
// Kept in localStorage per account until the backend stores it (docs/last-visit-api.md); only this file changes then.
// Where storage is missing or blocked (private mode, the server…), nothing is remembered.

export type VisitedPage = 'map' | 'check';

export const VISIT_TTL_MS = 12 * 60 * 60 * 1000;
// Expired visits disappear from the navbar within this long even when nothing else happens
const EXPIRY_CHECK_MS = 60 * 1000;
const PAGES: VisitedPage[] = ['map', 'check'];

interface StoredVisit {
  recordId: string;
  visitedAt: number;
}

// Who is logged in (set by SiteChrome); visits belong to them
let account: string | null = null;
// Pages opened while nobody is logged in: kept for whoever logs in next in this tab
let unsaved: Partial<Record<VisitedPage, string>> = {};
const listeners = new Set<() => void>();

const storageKey = (user: string, page: VisitedPage) => `skywell:${user}:last-${page}-record`;
const notify = () => listeners.forEach((listener) => listener());

// The page's address for that record, e.g. /map?record=SW-2023-A01
export function visitHref(page: VisitedPage, recordId: string): string {
  return `/${page}?record=${encodeURIComponent(recordId)}`;
}

function save(user: string, page: VisitedPage, recordId: string, now: number): void {
  const visit: StoredVisit = { recordId, visitedAt: now };
  try {
    localStorage.setItem(storageKey(user, page), JSON.stringify(visit));
  } catch {
    // storage blocked: nothing is remembered
  }
}

function load(user: string, page: VisitedPage): StoredVisit | null {
  try {
    const visit = JSON.parse(localStorage.getItem(storageKey(user, page)) ?? 'null') as StoredVisit | null;
    return typeof visit?.recordId === 'string' && typeof visit.visitedAt === 'number' ? visit : null;
  } catch {
    return null;
  }
}

// Called on log in (the account name) and log out (null)
export function setVisitAccount(next: string | null, now = Date.now()): void {
  account = next;
  if (next) PAGES.forEach((page) => unsaved[page] && save(next, page, unsaved[page], now));
  unsaved = {};
  notify();
}

export function rememberVisit(page: VisitedPage, recordId: string, now = Date.now()): void {
  if (account) save(account, page, recordId, now);
  else unsaved[page] = recordId;
  notify();
}

// Where the logged-in user can go back to on that page, or null: logged out, never visited, or the visit has expired
export function lastVisitHref(page: VisitedPage, now = Date.now()): string | null {
  if (!account) return null;
  const visit = load(account, page);
  return visit && now - visit.visitedAt < VISIT_TTL_MS ? visitHref(page, visit.recordId) : null;
}

// For useSyncExternalStore: visits in this tab, in other tabs (storage event), and visits expiring over time
export function subscribeToVisits(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  const expiryCheck = setInterval(listener, EXPIRY_CHECK_MS);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
    clearInterval(expiryCheck);
  };
}
