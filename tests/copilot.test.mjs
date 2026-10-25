import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { actionsForPage, askCopilot, fetchSuggestions, splitDetail } from '../app/utils/copilot.ts';
import { COPILOT_SUGGESTIONS } from '../app/data/copilot.ts';
import { API_URL } from '../app/utils/api.ts';
import { startSession } from '../app/utils/session.ts';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = `${encode({})}.${encode({ sub: 'u', username: 'v', role: 'viewer', isDefaultPassword: false, exp: Date.now() / 1000 + 3600 })}.s`;

// Answers the next fetch with this status and body, and keeps what was asked
let requests = [];
function respond(status, body) {
  globalThis.fetch = async (url, init) => {
    requests.push({ url, init });
    return new Response(JSON.stringify(body), { status });
  };
}

beforeEach(() => {
  requests = [];
  startSession(token);
});

test('a question is posted to the backend, and its answer becomes the reply', async () => {
  respond(200, {
    text: '找到 2026 年雲林縣的地圖：雲林 A 區',
    details: ['水井數：7 口'],
    actions: [{ label: '開啟地圖', to: '/map?record=t1' }],
    suggestions: [],
    matchedId: 'map-lookup',
    score: 1,
  });
  const reply = await askCopilot('2026的雲林');
  const [{ url, init }] = requests;
  assert.equal(url, `${API_URL}/copilot/ask`);
  assert.equal(init.method, 'POST');
  assert.equal(init.body, '{"question":"2026的雲林"}');
  assert.deepEqual(reply, {
    text: '找到 2026 年雲林縣的地圖：雲林 A 區',
    details: ['水井數：7 口'],
    actions: [{ label: '開啟地圖', to: '/map?record=t1' }],
    suggestions: [],
  });
});

test('the questions offered when the backend is not sure come with the reply', async () => {
  respond(200, { text: '我不太確定您的意思，您是想問：', suggestions: ['水井辨識進度如何？'], matchedId: null, score: 0 });
  assert.deepEqual((await askCopilot('天氣')).suggestions, ['水井辨識進度如何？']);
});

test('a failed call is told in the reply instead of thrown', async () => {
  respond(400, { message: ['question must be shorter than or equal to 200 characters'] });
  assert.deepEqual(await askCopilot('井'), { text: '抱歉，question must be shorter than or equal to 200 characters' });

  globalThis.fetch = async () => {
    throw new TypeError('fetch failed');
  };
  assert.deepEqual(await askCopilot('井'), { text: '抱歉，無法連線到伺服器' });
});

test('details read as a label and a value with either colon, or as plain text', () => {
  assert.deepEqual(splitDetail('座標：23.8421, 120.5134'), { label: '座標', value: '23.8421, 120.5134' });
  assert.deepEqual(splitDetail('信賴度: 94.2%'), { label: '信賴度', value: '94.2%' });
  assert.deepEqual(splitDetail('SW-2026-A001：距離 12 公尺'), { label: 'SW-2026-A001', value: '距離 12 公尺' });
  assert.equal(splitDetail('23.8421, 120.5134 附近有沒有水井？'), null);
  assert.equal(splitDetail('建議派遣巡查員前往現場核實。'), null);
});

const EXPORT = { label: '前往匯出頁', to: '/export' };
const COMPARE = { label: '前往合法井比對', to: '/compare' };
const MAP = { label: '前往地圖', to: '/map' };

test('a button to export or compare goes to the map on screen, and shows only on a map page', () => {
  assert.deepEqual(actionsForPage([EXPORT, COMPARE], '/map', 't1'), [
    { label: '前往匯出頁', to: '/export?record=t1' },
    { label: '前往合法井比對', to: '/compare?record=t1' },
  ]);
  // without ?record= the map page shows the newest finished map, as the export page does
  assert.deepEqual(actionsForPage([EXPORT], '/map', null), [EXPORT]);
  assert.deepEqual(actionsForPage([EXPORT, COMPARE], '/monitor', null), []);
  // on the check page ?record= is a well code, not a map
  assert.deepEqual(actionsForPage([EXPORT], '/check', 'SW-2026-A001'), []);
});

test('a button to the map page goes to the map on screen, and is offered on other pages too', () => {
  assert.deepEqual(actionsForPage([MAP], '/export', 't1'), [{ label: '前往地圖', to: '/map?record=t1' }]);
  assert.deepEqual(actionsForPage([MAP], '/monitor', null), [MAP]);
});

test('a button to the page already open is left out', () => {
  assert.deepEqual(actionsForPage([EXPORT, MAP], '/export', 't1'), [{ label: '前往地圖', to: '/map?record=t1' }]);
  assert.deepEqual(actionsForPage([MAP], '/map', 't1'), []);
});

test('buttons to a given map or well, or to other pages, stay as they are', () => {
  const given = [
    { label: '在地圖上開啟', to: '/map?record=t2&well=SW-2026-A001' },
    { label: '前往監控頁', to: '/monitor' },
  ];
  assert.deepEqual(actionsForPage(given, '/map', 't1'), given);
  assert.deepEqual(actionsForPage(given, '/monitor', null), [given[0]]);
});

test('the quick questions come from the backend, for the page and, on a map page, the map on screen', async () => {
  respond(200, { suggestions: ['溪州有多少疑似未登記的井？', '溪州有哪些地圖？', '如何匯出辨識結果？'] });
  assert.deepEqual(await fetchSuggestions('/map', 't1'), ['溪州有多少疑似未登記的井？', '溪州有哪些地圖？', '如何匯出辨識結果？']);
  assert.equal(requests[0].url, `${API_URL}/copilot/suggestions?page=%2Fmap&record=t1`);
});

test('off a map page the record (there a well code) is not sent', async () => {
  respond(200, { suggestions: ['水井辨識進度如何？'] });
  await fetchSuggestions('/check', 'SW-2026-A001');
  assert.equal(requests[0].url, `${API_URL}/copilot/suggestions?page=%2Fcheck`);
});

test('the fixed quick questions stand in when the backend cannot be asked', async () => {
  respond(500, { message: 'boom' });
  assert.deepEqual(await fetchSuggestions('/', null), COPILOT_SUGGESTIONS);
});
