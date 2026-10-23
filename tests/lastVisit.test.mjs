import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { lastVisitHref, rememberVisit, setVisitAccount, visitHref, VISIT_TTL_MS } from '../app/utils/lastVisit.ts';

const HOUR = 60 * 60 * 1000;
const T0 = Date.UTC(2026, 8, 30, 8, 0);

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

// A stand-in for the backend's /me/last-visits: what each account has stored, and the PUTs made
let stored = {};
let puts = [];
let failing = false;
let account = null;
function backend() {
  globalThis.fetch = async (url, init = {}) => {
    if (failing) throw new TypeError('offline');
    const page = new URL(url).pathname.split('/')[3];
    if (init.method === 'PUT') {
      const { recordId } = JSON.parse(init.body);
      puts.push({ page, recordId });
      stored[account] = { ...stored[account], [page]: { recordId, visitedAt: new Date(T0).toISOString() } };
      return new Response(null, { status: 204 });
    }
    return new Response(JSON.stringify(stored[account] ?? {}), { status: 200 });
  };
}
const logIn = (user, now = T0) => {
  account = user;
  return setVisitAccount(user, now);
};
// lets the PUTs made in the background land
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(async () => {
  stored = {};
  puts = [];
  failing = false;
  backend();
  account = null;
  await setVisitAccount(null);
});

test('visits are kept for twelve hours', () => {
  assert.equal(VISIT_TTL_MS, 12 * HOUR);
});

test('logged in, nothing visited yet: no way back to either page', async () => {
  await logIn('admin');
  assert.equal(lastVisitHref('map', T0), null);
  assert.equal(lastVisitHref('check', T0), null);
});

test('remembers the last record of each page separately, and tells the backend', async () => {
  await logIn('admin');
  rememberVisit('map', 'map-1', T0);
  rememberVisit('map', 'map-2', T0);
  assert.equal(lastVisitHref('map', T0), '/map?record=map-2');
  assert.equal(lastVisitHref('check', T0), null);

  rememberVisit('check', 'SW-2026-A002', T0);
  assert.equal(lastVisitHref('check', T0), '/check?record=SW-2026-A002');
  await settle();
  assert.deepEqual(puts, [
    { page: 'map', recordId: 'map-1' },
    { page: 'map', recordId: 'map-2' },
    { page: 'check', recordId: 'SW-2026-A002' },
  ]);
});

test('logging in reads the visits the backend kept', async () => {
  stored.admin = { map: { recordId: 'map-1', visitedAt: new Date(T0).toISOString() } };
  await logIn('admin', T0 + HOUR);
  assert.equal(lastVisitHref('map', T0 + HOUR), '/map?record=map-1');
  assert.equal(lastVisitHref('check', T0 + HOUR), null);
});

test('a visit expires twelve hours after it was made, and visiting again restarts the clock', async () => {
  await logIn('admin');
  rememberVisit('map', 'map-1', T0);
  assert.equal(lastVisitHref('map', T0 + 12 * HOUR - 1), '/map?record=map-1');
  assert.equal(lastVisitHref('map', T0 + 12 * HOUR), null);

  rememberVisit('map', 'map-1', T0 + 11 * HOUR);
  assert.equal(lastVisitHref('map', T0 + 20 * HOUR), '/map?record=map-1');
});

test('each account only sees its own visits, and nothing shows once logged out', async () => {
  await logIn('alice');
  rememberVisit('check', 'SW-2026-A001', T0);
  await settle();
  account = null;
  await setVisitAccount(null, T0);
  assert.equal(lastVisitHref('check', T0), null);

  await logIn('bob');
  assert.equal(lastVisitHref('check', T0), null);

  await logIn('alice');
  assert.equal(lastVisitHref('check', T0), '/check?record=SW-2026-A001');
});

test('the page open before logging in is kept for the account that logs in', async () => {
  rememberVisit('map', 'map-1', T0);
  await logIn('admin');
  assert.equal(lastVisitHref('map', T0), '/map?record=map-1');
  assert.deepEqual(puts, [{ page: 'map', recordId: 'map-1' }]);
});

test('record ids are escaped in the address', () => {
  assert.equal(visitHref('check', 'A&B 1'), '/check?record=A%26B%201');
});

test('an unreachable backend only means nothing is remembered from before', async () => {
  failing = true;
  await logIn('admin');
  assert.equal(lastVisitHref('map', T0), null);
  assert.doesNotThrow(() => rememberVisit('map', 'map-1', T0));
  await settle();
  assert.equal(lastVisitHref('map', T0), '/map?record=map-1');
});
