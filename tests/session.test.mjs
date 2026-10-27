import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { clearSession, decodeSession, getSession, startSession, subscribeToSession } from '../app/utils/session.ts';

// A stand-in for the browser's localStorage
const stored = new Map();
globalThis.localStorage = {
  getItem: (key) => (stored.has(key) ? stored.get(key) : null),
  setItem: (key, value) => stored.set(key, String(value)),
  removeItem: (key) => stored.delete(key),
};

const NOW = Date.UTC(2026, 9, 20, 8, 0);
const HOUR = 60 * 60 * 1000;

// A token shaped like the backend's (only the payload is read; the signature is not checked in the browser)
function makeToken(payload) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.signature`;
}

const payload = { sub: 'uuid-1', username: 'chen.chihyuan', role: 'operator', isDefaultPassword: false, exp: (NOW + 8 * HOUR) / 1000 };

beforeEach(() => clearSession());

test('a token tells who is logged in and until when', () => {
  assert.deepEqual(decodeSession(makeToken(payload), NOW), {
    token: makeToken(payload),
    userId: 'uuid-1',
    username: 'chen.chihyuan',
    role: 'operator',
    isDefaultPassword: false,
    expiresAt: NOW + 8 * HOUR,
  });
});

test('an expired or malformed token is no session', () => {
  assert.equal(decodeSession(makeToken({ ...payload, exp: NOW / 1000 }), NOW), null);
  assert.equal(decodeSession('not-a-token', NOW), null);
  assert.equal(decodeSession(makeToken({ ...payload, exp: undefined }), NOW), null);
});

test('logging in saves the token so a reload stays logged in', () => {
  startSession(makeToken(payload), NOW);
  assert.equal(stored.get('skywell:token'), makeToken(payload));
  assert.equal(getSession(NOW).username, 'chen.chihyuan');
});

test('logging out forgets the token', () => {
  startSession(makeToken(payload), NOW);
  clearSession();
  assert.equal(getSession(NOW), null);
  assert.equal(stored.has('skywell:token'), false);
});

test('a session ends once its token expires', () => {
  startSession(makeToken(payload), NOW);
  assert.equal(getSession(NOW + 8 * HOUR), null);
  assert.equal(stored.has('skywell:token'), false);
});

test('noticing an expired token tells no listener, since React notices it while rendering', () => {
  startSession(makeToken(payload), NOW);
  let calls = 0;
  const unsubscribe = subscribeToSession(() => calls++);
  assert.equal(getSession(NOW + 8 * HOUR), null);
  unsubscribe();
  assert.equal(calls, 0);
});

test('an expired token is not kept', () => {
  assert.equal(startSession(makeToken({ ...payload, exp: NOW / 1000 }), NOW), null);
  assert.equal(stored.has('skywell:token'), false);
});

test('listeners hear of logging in and out', () => {
  let calls = 0;
  const unsubscribe = subscribeToSession(() => calls++);
  startSession(makeToken(payload), NOW);
  clearSession();
  unsubscribe();
  startSession(makeToken(payload), NOW);
  assert.equal(calls, 2);
});
