import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { lastVisitHref, rememberVisit, setVisitAccount, visitHref, VISIT_TTL_MS } from '../app/utils/lastVisit.ts';

const HOUR = 60 * 60 * 1000;
const T0 = Date.UTC(2026, 8, 30, 8, 0);

// A stand-in for the browser's localStorage
function memoryStorage() {
  const items = new Map();
  return {
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => items.set(key, String(value)),
  };
}

beforeEach(() => {
  globalThis.localStorage = memoryStorage();
  setVisitAccount(null);
});

test('visits are kept for twelve hours', () => {
  assert.equal(VISIT_TTL_MS, 12 * HOUR);
});

test('logged in, nothing visited yet: no way back to either page', () => {
  setVisitAccount('admin', T0);
  assert.equal(lastVisitHref('map', T0), null);
  assert.equal(lastVisitHref('check', T0), null);
});

test('remembers the last record of each page separately', () => {
  setVisitAccount('admin', T0);
  rememberVisit('map', 'SW-2023-A01', T0);
  rememberVisit('map', 'SW-2022-A03', T0);
  assert.equal(lastVisitHref('map', T0), '/map?record=SW-2022-A03');
  assert.equal(lastVisitHref('check', T0), null);

  rememberVisit('check', 'SW-2021-A02', T0);
  assert.equal(lastVisitHref('check', T0), '/check?record=SW-2021-A02');
});

test('a visit expires twelve hours after it was made, and visiting again restarts the clock', () => {
  setVisitAccount('admin', T0);
  rememberVisit('map', 'SW-2023-A01', T0);
  assert.equal(lastVisitHref('map', T0 + 12 * HOUR - 1), '/map?record=SW-2023-A01');
  assert.equal(lastVisitHref('map', T0 + 12 * HOUR), null);

  rememberVisit('map', 'SW-2023-A01', T0 + 11 * HOUR);
  assert.equal(lastVisitHref('map', T0 + 20 * HOUR), '/map?record=SW-2023-A01');
});

test('each account only sees its own visits, and nothing shows once logged out', () => {
  setVisitAccount('alice', T0);
  rememberVisit('check', 'SW-2023-A01', T0);
  setVisitAccount(null, T0);
  assert.equal(lastVisitHref('check', T0), null);

  setVisitAccount('bob', T0);
  assert.equal(lastVisitHref('check', T0), null);

  setVisitAccount('alice', T0);
  assert.equal(lastVisitHref('check', T0), '/check?record=SW-2023-A01');
});

test('the page open before logging in is kept for the account that logs in', () => {
  rememberVisit('map', 'SW-2022-A01', T0);
  setVisitAccount('admin', T0);
  assert.equal(lastVisitHref('map', T0), '/map?record=SW-2022-A01');
});

test('record ids are escaped in the address', () => {
  assert.equal(visitHref('check', 'A&B 1'), '/check?record=A%26B%201');
});

test('blocked, missing or corrupted storage counts as never visited', () => {
  setVisitAccount('admin', T0);
  globalThis.localStorage.setItem('skywell:admin:last-map-record', '{not json');
  assert.equal(lastVisitHref('map', T0), null);

  globalThis.localStorage = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
  };
  assert.doesNotThrow(() => rememberVisit('map', 'SW-2023-A01', T0));
  assert.equal(lastVisitHref('map', T0), null);

  delete globalThis.localStorage;
  assert.equal(lastVisitHref('map', T0), null);
});
