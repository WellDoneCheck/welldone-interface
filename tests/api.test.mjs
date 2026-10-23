import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { api, API_URL, ApiError, errorMessage, fileUrl } from '../app/utils/api.ts';
import { clearSession, getSession, startSession } from '../app/utils/session.ts';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = `${encode({})}.${encode({ sub: 'u', username: 'root', role: 'root', isDefaultPassword: false, exp: Date.now() / 1000 + 3600 })}.s`;

// Answers the next fetch with this status and body, and keeps what was asked
let requests = [];
function respond(status, body) {
  globalThis.fetch = async (url, init) => {
    requests.push({ url, init });
    return new Response(body === undefined ? null : typeof body === 'string' ? body : JSON.stringify(body), { status });
  };
}

beforeEach(() => {
  requests = [];
  startSession(token);
});

test('error messages read as one line, whether a string or a list', () => {
  assert.equal(errorMessage({ message: '帳號或密碼錯誤' }, 'x'), '帳號或密碼錯誤');
  assert.equal(errorMessage({ message: ['username 不可為空', 'password 太短'] }, 'x'), 'username 不可為空、password 太短');
  assert.equal(errorMessage(undefined, '請求失敗'), '請求失敗');
});

test('calls go to the backend with the token, and JSON both ways', async () => {
  respond(200, { id: 1 });
  assert.deepEqual(await api('/wells/1/verdict', { method: 'PATCH', body: { verdict: 'well' } }), { id: 1 });
  const [{ url, init }] = requests;
  assert.equal(url, `${API_URL}/wells/1/verdict`);
  assert.equal(init.method, 'PATCH');
  assert.equal(init.headers.Authorization, `Bearer ${token}`);
  assert.equal(init.headers['Content-Type'], 'application/json');
  assert.equal(init.body, '{"verdict":"well"}');
});

test('a form is sent as is, so the browser sets its multipart boundary', async () => {
  respond(201, { id: 'task' });
  const form = new FormData();
  await api('/tasks/upload', { method: 'POST', body: form });
  assert.equal(requests[0].init.body, form);
  assert.equal(requests[0].init.headers['Content-Type'], undefined);
});

test('an answer without a body is undefined', async () => {
  respond(204);
  assert.equal(await api('/me/last-visits/map', { method: 'PUT', body: { recordId: 'x' } }), undefined);
});

test('a failed call throws its status and message', async () => {
  respond(409, { statusCode: 409, message: '任務處理中，無法刪除' });
  await assert.rejects(api('/tasks/1', { method: 'DELETE' }), new ApiError(409, '任務處理中，無法刪除'));
});

test('a failed call without a message still says what failed', async () => {
  respond(502, '<html>Bad Gateway</html>');
  await assert.rejects(api('/tasks'), (error) => error.status === 502 && error.message === '請求失敗（502）');
});

test('a success that is not JSON (a web page, not the backend) says the API address is wrong', async () => {
  respond(200, '<!DOCTYPE html><html></html>');
  await assert.rejects(api('/auth/login', { method: 'POST', body: {} }), (error) => error.status === 200 && /NEXT_PUBLIC_API_URL/.test(error.message));
});

test('no answer at all is a connection error', async () => {
  globalThis.fetch = async () => {
    throw new TypeError('fetch failed');
  };
  await assert.rejects(api('/tasks'), (error) => error.status === 0 && error.message === '無法連線到伺服器');
});

test('a 401 logs the user out', async () => {
  respond(401, { message: 'Unauthorized' });
  await assert.rejects(api('/tasks'));
  assert.equal(getSession(), null);
});

test('a 401 the call expects (a wrong current password) keeps the user logged in', async () => {
  respond(401, { message: '目前密碼錯誤' });
  await assert.rejects(api('/users/me/password', { method: 'PATCH', body: {}, keepSessionOn401: true }), { status: 401 });
  assert.notEqual(getSession(), null);
});

test('file addresses carry the token for <img> and downloads', () => {
  assert.equal(fileUrl('/wells/1/ai-image/image'), `${API_URL}/wells/1/ai-image/image?token=${token}`);
  assert.equal(fileUrl('/wells/1/image?size=256'), `${API_URL}/wells/1/image?size=256&token=${token}`);
  clearSession();
  assert.equal(fileUrl('/wells/1/image'), `${API_URL}/wells/1/image`);
});
