import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createUser, setUserPassword } from '../app/utils/usersApi.ts';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

// Answers each fetch with the next of these [status, body] pairs, and keeps what was asked
let answers = [];
let requests = [];
globalThis.fetch = async (url, init) => {
  requests.push({ path: new URL(url).pathname, method: init.method, body: init.body && JSON.parse(init.body) });
  const [status, body] = answers.shift();
  return new Response(body === undefined ? null : JSON.stringify(body), { status });
};

beforeEach(() => {
  answers = [];
  requests = [];
});

const apiUser = { id: 'u1', username: 'lin.xiaoming', name: '林小明', role: 'viewer', is_default_password: true, last_login_at: null, created_at: '2026-10-30T00:00:00.000Z' };

test('a new account is created with the password the admin gave', async () => {
  answers = [[201, apiUser]];
  await createUser('lin.xiaoming', '林小明', 'viewer', 'temporary123');
  assert.deepEqual(requests, [
    { path: '/users', method: 'POST', body: { username: 'lin.xiaoming', name: '林小明', role: 'viewer', password: 'temporary123' } },
  ]);
});

test("an admin sets an account's password directly, not back to a default", async () => {
  answers = [[200, { success: true }]];
  await setUserPassword('u1', 'another456');
  assert.deepEqual(requests, [{ path: '/users/u1/password', method: 'PATCH', body: { password: 'another456' } }]);
});
