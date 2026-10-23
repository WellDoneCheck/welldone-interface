import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { changePassword, logIn } from '../app/utils/auth.ts';
import { clearSession, getSession } from '../app/utils/session.ts';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const tokenFor = (isDefaultPassword) =>
  `${encode({})}.${encode({ sub: 'u1', username: 'wu.jiaming', role: 'operator', isDefaultPassword, exp: Date.now() / 1000 + 3600 })}.s`;

// Answers each fetch with the next of these [status, body] pairs, and keeps what was asked
let answers = [];
let requests = [];
globalThis.fetch = async (url, init) => {
  requests.push({ path: new URL(url).pathname, method: init.method, body: init.body && JSON.parse(init.body) });
  const [status, body] = answers.shift();
  return new Response(body === undefined ? null : JSON.stringify(body), { status });
};

beforeEach(() => {
  clearSession();
  answers = [];
  requests = [];
});

test('logging in keeps the token and tells who logged in', async () => {
  answers = [[200, { access_token: tokenFor(true), isDefaultPassword: true }]];
  const session = await logIn('wu.jiaming', 'changeme');
  assert.deepEqual(requests, [{ path: '/auth/login', method: 'POST', body: { username: 'wu.jiaming', password: 'changeme' } }]);
  assert.equal(session.username, 'wu.jiaming');
  assert.equal(getSession().isDefaultPassword, true);
});

test('a wrong password throws the backend message and logs nobody in', async () => {
  answers = [[401, { statusCode: 401, message: '帳號或密碼錯誤' }]];
  await assert.rejects(logIn('wu.jiaming', 'nope123'), { status: 401, message: '帳號或密碼錯誤' });
  assert.equal(getSession(), null);
});

test('changing the password logs in again, so the new token no longer says default password', async () => {
  answers = [[200, { access_token: tokenFor(true) }]];
  await logIn('wu.jiaming', 'changeme');
  answers = [[200, { success: true }], [200, { access_token: tokenFor(false) }]];
  await changePassword('wu.jiaming', 'changeme', 'well2026ok');
  assert.deepEqual(requests.slice(1), [
    { path: '/users/me/password', method: 'PATCH', body: { currentPassword: 'changeme', newPassword: 'well2026ok' } },
    { path: '/auth/login', method: 'POST', body: { username: 'wu.jiaming', password: 'well2026ok' } },
  ]);
  assert.equal(getSession().isDefaultPassword, false);
});

test('a wrong current password keeps the user logged in', async () => {
  answers = [[200, { access_token: tokenFor(true) }]];
  await logIn('wu.jiaming', 'changeme');
  answers = [[401, { message: '目前密碼錯誤' }]];
  await assert.rejects(changePassword('wu.jiaming', 'wrong', 'well2026ok'), { status: 401 });
  assert.notEqual(getSession(), null);
});
