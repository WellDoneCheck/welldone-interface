// The map record and the well each account last opened, so the navbar can take them back there. Kept by the backend
// (Backend-SPEC §4.7: GET /me/last-visits, PUT /me/last-visits/:page), which only gives back visits from the last
// VISIT_TTL_MS whose record still exists; read once on log in, then kept here as they are made.
import { api } from './api';

export type VisitedPage = 'map' | 'check';

export const VISIT_TTL_MS = 12 * 60 * 60 * 1000;
// Expired visits disappear from the navbar within this long even when nothing else happens
const EXPIRY_CHECK_MS = 60 * 1000;
const PAGES: VisitedPage[] = ['map', 'check'];

interface Visit {
  recordId: string;
  visitedAt: number;
}

type Visits = Partial<Record<VisitedPage, Visit>>;

// Who is logged in (set by SiteChrome); visits belong to them
let account: string | null = null;
let visits: Visits = {};
// Pages opened while nobody is logged in: kept for whoever logs in next in this tab
let unsaved: Partial<Record<VisitedPage, string>> = {};
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

// The page's address for that record, e.g. /map?record=<map id>
export function visitHref(page: VisitedPage, recordId: string): string {
  return `/${page}?record=${encodeURIComponent(recordId)}`;
}

// Not remembered (e.g. a record the backend does not know: 400) is no reason to stop the page
function save(page: VisitedPage, recordId: string): Promise<void> {
  return api(`/me/last-visits/${page}`, { method: 'PUT', body: { recordId } }).then(
    () => undefined,
    () => undefined,
  );
}

type StoredVisits = Partial<Record<VisitedPage, { recordId: string; visitedAt: string }>>;

// The backend's visits, unless one made here since is newer
async function load(user: string): Promise<void> {
  const stored = await api<StoredVisits>('/me/last-visits').catch((): StoredVisits => ({}));
  if (account !== user) return;
  for (const page of PAGES) {
    const visit = stored[page];
    if (!visit) continue;
    const visitedAt = Date.parse(visit.visitedAt);
    const local = visits[page];
    if (!local || local.visitedAt < visitedAt) visits = { ...visits, [page]: { recordId: visit.recordId, visitedAt } };
  }
  notify();
}

// Called on log in (the account name) and log out (null); done once the account's visits have been read
export async function setVisitAccount(next: string | null, now = Date.now()): Promise<void> {
  account = next;
  visits = {};
  const pending = unsaved;
  unsaved = {};
  notify();
  if (!next) return;
  for (const page of PAGES) {
    const recordId = pending[page];
    if (recordId) visits = { ...visits, [page]: { recordId, visitedAt: now } };
  }
  await Promise.all(PAGES.map((page) => pending[page] && save(page, pending[page])));
  await load(next);
}

export function rememberVisit(page: VisitedPage, recordId: string, now = Date.now()): void {
  if (account) {
    visits = { ...visits, [page]: { recordId, visitedAt: now } };
    save(page, recordId);
  } else unsaved[page] = recordId;
  notify();
}

// Where the logged-in user can go back to on that page, or null: logged out, never visited, or the visit has expired
export function lastVisitHref(page: VisitedPage, now = Date.now()): string | null {
  const visit = account ? visits[page] : undefined;
  return visit && now - visit.visitedAt < VISIT_TTL_MS ? visitHref(page, visit.recordId) : null;
}

// For useSyncExternalStore: visits made here or read from the backend, and visits expiring over time
export function subscribeToVisits(listener: () => void): () => void {
  listeners.add(listener);
  const expiryCheck = setInterval(listener, EXPIRY_CHECK_MS);
  return () => {
    listeners.delete(listener);
    clearInterval(expiryCheck);
  };
}
