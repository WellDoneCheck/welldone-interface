import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canClearRecognition, canDelete, canRename, canRetry, canUpload, clearRecognition, displayName, givenName, importName, groupByYear, isFinished, pickMapTask, renameTask, retryRecognition, toRecord, uploadError } from '../app/utils/tasks.ts';

const task = (split_status, ai_status, extra = {}) => ({
  id: 'task-1',
  name: '2026-10-20 13:52',
  split_status,
  ai_status,
  created_by_id: 'user-1',
  created_at: '2026-10-20T05:52:00.000Z',
  ...extra,
});
const splitter = (status, extra = {}) => ({ status, ...extra });
const ai = (status, extra = {}) => ({ status, completedCount: 0, failedTiles: [], ...extra });
const progress = (splitterState, aiState = ai('pending')) => ({ splitter: splitterState, ai: aiState });
const stateOf = (record) => ({ status: record.status, statusLabel: record.statusLabel, progress: record.progress, tiles: record.tiles });

test('a task becomes a record with its time in Taipei', () => {
  const record = toRecord(task('waiting', 'waiting'));
  assert.equal(record.id, 'task-1');
  assert.equal(record.timestamp, '2026-10-20 13:52');
  assert.equal(record.createdAt, '2026-10-20T05:52:00.000Z');
  assert.equal(record.createdById, 'user-1');
});

test('before its progress is read, the task fields tell its stage', () => {
  assert.equal(toRecord(task('waiting', 'waiting')).statusLabel, '等待切圖');
  assert.equal(toRecord(task('active', 'waiting')).status, 'cutting');
  assert.equal(toRecord(task('failed', 'waiting')).statusLabel, '切圖失敗');
  assert.equal(toRecord(task('completed', 'waiting')).statusLabel, '等待辨識');
  assert.equal(toRecord(task('completed', 'active')).status, 'recognizing');
  assert.equal(toRecord(task('completed', 'completed')).status, 'done');
  assert.equal(toRecord(task('completed', 'failed')).statusLabel, '辨識失敗');
});

test('cutting shows the splitter progress and tiles', () => {
  const record = toRecord(task('active', 'waiting'), progress(splitter('processing', { progress: 37, completedCount: 212, totalCount: 574 })));
  assert.deepEqual(stateOf(record), { status: 'cutting', statusLabel: '正在切圖中', progress: 37, tiles: { done: 212, total: 574 } });
});

test('a task waiting in a queue shows its place', () => {
  assert.equal(toRecord(task('waiting', 'waiting'), progress(splitter('queued', { queuePosition: 2 }))).statusLabel, '等待切圖（第 2 位）');
  assert.equal(toRecord(task('completed', 'active'), progress(splitter('completed'), ai('queued', { queuePosition: 3 }))).statusLabel, '等待辨識（第 3 位）');
  assert.equal(toRecord(task('waiting', 'waiting'), progress(splitter('queued'))).statusLabel, '等待切圖');
});

test('once cut, the AI progress and tiles show', () => {
  const record = toRecord(task('completed', 'active'), progress(splitter('completed'), ai('processing', { completedCount: 20, totalCount: 300, progress: 6.7 })));
  assert.deepEqual(stateOf(record), { status: 'recognizing', statusLabel: '正在辨識中', progress: 6.7, tiles: { done: 20, total: 300 } });
});

test('a finished recognition says how many tiles failed', () => {
  const done = ai('completed', { completedCount: 300, totalCount: 300 });
  assert.equal(toRecord(task('completed', 'completed'), progress(splitter('completed'), done)).statusLabel, '已完成');
  const partly = { ...done, failedTiles: [{ row: 1, col: 2 }, { row: 3, col: 4 }] };
  assert.deepEqual(stateOf(toRecord(task('completed', 'completed'), progress(splitter('completed'), partly))), {
    status: 'done',
    statusLabel: '已完成（2 張小圖失敗）',
    progress: 100,
    tiles: { done: 300, total: 300 },
  });
});

test('once the backend tells the tiles not reached, the total is every tile: recognised, failed and not reached', () => {
  // the backend's own total counts only the tiles started on (121)
  const failed = ai('failed', { completedCount: 120, failedCount: 1, pendingCount: 29, totalCount: 121, progress: 100, updatedAtMs: 0 });
  assert.deepEqual(stateOf(toRecord(task('completed', 'failed'), progress(splitter('completed'), failed))), {
    status: 'failed',
    statusLabel: '辨識失敗',
    progress: 80,
    tiles: { done: 120, total: 150 },
  });
});

test('an AI marked failed but still sending tiles in is still recognising, until it stops for a while', () => {
  const NOW = Date.UTC(2026, 9, 21, 6, 0);
  const marked = (secondsAgo, pendingCount = 29) =>
    toRecord(
      task('completed', 'failed'),
      progress(splitter('completed'), ai('failed', { completedCount: 120, failedCount: 1, pendingCount, updatedAtMs: NOW - secondsAgo * 1000 })),
      NOW,
    );
  assert.equal(marked(25).statusLabel, '正在辨識中');
  assert.equal(isFinished(marked(25)), false);
  assert.equal(marked(10 * 60).statusLabel, '辨識失敗');
  assert.equal(isFinished(marked(10 * 60)), true);
  // nothing left to recognise: it really has stopped
  assert.equal(marked(25, 0).statusLabel, '辨識失敗');
});

test('completed with tiles never sent to the AI is not complete, and can be retried', () => {
  // the backend completes it once the one tile retried is done
  const partly = ai('completed', { completedCount: 2, failedCount: 0, pendingCount: 148, retryable: true, updatedAtMs: 0 });
  const record = toRecord(task('completed', 'completed'), progress(splitter('completed'), partly));
  assert.deepEqual(stateOf(record), { status: 'failed', statusLabel: '辨識未完成（148 張未辨識）', progress: 1, tiles: { done: 2, total: 150 } });
  assert.equal(record.retryable, true);
  assert.equal(isFinished(record), true);
});

test('a map the splitter cut no tiles from (no data in the image) is shown as having no data, not as done', () => {
  const empty = ai('completed', { completedCount: 0, failedCount: 0, pendingCount: 0, retryable: false, updatedAtMs: 0 });
  const record = toRecord(task('completed', 'completed'), progress(splitter('completed'), empty));
  assert.deepEqual(stateOf(record), { status: 'failed', statusLabel: '影像沒有資料', progress: 0, tiles: null });
  assert.equal(record.retryable, false);
});

test('a retry is offered only once recognition has stopped with tiles left', () => {
  const NOW = Date.UTC(2026, 9, 21, 6, 0);
  const read = (status, extra) =>
    toRecord(task('completed', 'active'), progress(splitter('completed'), ai(status, { completedCount: 1, failedCount: 1, updatedAtMs: 0, ...extra })), NOW);
  assert.equal(read('failed', { pendingCount: 3, retryable: true }).retryable, true);
  // still sending tiles in: the backend would refuse it
  assert.equal(read('failed', { pendingCount: 3, retryable: true, updatedAtMs: NOW - 20_000 }).retryable, false);
  assert.equal(read('completed', { pendingCount: 0, retryable: false }).retryable, false);
  assert.equal(read('processing', {}).retryable, false);
  assert.equal(toRecord(task('completed', 'failed')).retryable, false);
});

test('a retry sends every failed and unreached tile (no body), or only the tiles given, and only operators and admins may', async () => {
  const sent = [];
  globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  globalThis.fetch = async (url, init) => {
    sent.push({ path: new URL(url).pathname, method: init.method, body: init.body });
    return new Response('{"tileCount":148}', { status: 202 });
  };
  await retryRecognition('task-1');
  assert.deepEqual(sent, [{ path: '/tasks/task-1/ai/retry', method: 'POST', body: undefined }]);
  await retryRecognition('task-1', [{ row: 2, col: 1 }]);
  assert.deepEqual(sent[1], { path: '/tasks/task-1/ai/retry', method: 'POST', body: '{"tiles":[{"row":2,"col":1}]}' });
  assert.equal(canRetry('operator'), true);
  assert.equal(canRetry('admin'), true);
  assert.equal(canRetry('viewer'), false);
});

test('a recognised tile has its results cleared, by an admin or root only', async () => {
  const sent = [];
  globalThis.fetch = async (url, init) => {
    sent.push({ path: new URL(url).pathname, method: init.method });
    return new Response('{"removedWellCount":3}', { status: 200 });
  };
  await clearRecognition('task-1', { row: 2, col: 1 });
  assert.deepEqual(sent, [{ path: '/tasks/task-1/ai/tiles/2/1', method: 'DELETE' }]);
  assert.equal(canClearRecognition('root'), true);
  assert.equal(canClearRecognition('admin'), true);
  assert.equal(canClearRecognition('operator'), false);
  assert.equal(canClearRecognition('viewer'), false);
});

test('failed and finished tasks are no longer polled', () => {
  assert.equal(isFinished(toRecord(task('completed', 'completed'))), true);
  assert.equal(isFinished(toRecord(task('failed', 'waiting'))), true);
  assert.equal(isFinished(toRecord(task('completed', 'failed'))), true);
  assert.equal(isFinished(toRecord(task('completed', 'active'))), false);
  assert.equal(isFinished(toRecord(task('waiting', 'waiting'))), false);
});

test('the default name reads as an import time; a given name as it is', () => {
  assert.equal(displayName('2026-10-20 13:52'), '2026/10/20 13:52 匯入');
  assert.equal(displayName('溪州航照 A 區'), '溪州航照 A 區');
  assert.equal(displayName('2026-10-20 13:52 補拍'), '2026-10-20 13:52 補拍');
});

test('records are grouped by the year they came in, keeping their order', () => {
  const record = (id, created_at) => toRecord(task('completed', 'completed', { id, created_at }));
  const groups = groupByYear([record('a', '2026-03-01T00:00:00Z'), record('b', '2026-01-01T00:00:00Z'), record('c', '2025-12-31T17:00:00Z'), record('d', '2025-05-01T00:00:00Z')]);
  // 2025-12-31 17:00 UTC is already 2026 in Taipei
  assert.deepEqual(groups.map((group) => [group.year, group.records.map((r) => r.id)]), [['2026', ['a', 'b', 'c']], ['2025', ['d']]]);
  assert.deepEqual(groupByYear([]), []);
});

test('only TIFFs are uploaded, of any size', () => {
  assert.equal(uploadError({ name: 'survey.TIF' }), null);
  assert.equal(uploadError({ name: 'survey.tiff' }), null);
  assert.match(uploadError({ name: 'survey.geotiff' }), /格式錯誤/);
  assert.match(uploadError({ name: 'wells.csv' }), /格式錯誤/);
});

test('viewers only look; operators delete only their own maps', () => {
  assert.equal(canUpload('viewer'), false);
  assert.equal(canUpload('operator'), true);
  assert.equal(canRename('viewer'), false);
  assert.equal(canRename('operator'), true);
  const mine = { createdById: 'user-1' };
  const theirs = { createdById: 'user-2' };
  assert.equal(canDelete({ role: 'operator', userId: 'user-1' }, mine), true);
  assert.equal(canDelete({ role: 'operator', userId: 'user-1' }, theirs), false);
  assert.equal(canDelete({ role: 'admin', userId: 'user-1' }, theirs), true);
  assert.equal(canDelete({ role: 'root', userId: 'user-1' }, theirs), true);
  assert.equal(canDelete({ role: 'viewer', userId: 'user-1' }, mine), false);
});

test('a map still named after when it came in has no given name', () => {
  assert.equal(givenName('2026-10-20 13:52'), '');
  assert.equal(givenName('溪州南段'), '溪州南段');
});

test('renaming sends the trimmed name, and a blank one goes back to when the map came in', async () => {
  const sent = [];
  globalThis.fetch = async (url, init) => {
    sent.push({ url, init });
    return new Response(JSON.stringify(task('completed', 'completed', { name: JSON.parse(init.body).name })), { status: 200 });
  };
  assert.equal((await renameTask(task('completed', 'completed'), '  溪州南段 ')).name, '溪州南段');
  assert.equal((await renameTask(task('completed', 'completed'), '   ')).name, '2026-10-20 13:52');
  assert.match(sent[0].url, /\/tasks\/task-1\/name$/);
  assert.equal(sent[0].init.method, 'PATCH');
});

test('the map page shows the map asked for, or else the newest finished one', () => {
  const tasks = [
    task('active', 'waiting', { id: 'cutting' }),
    task('completed', 'completed', { id: 'newest-done' }),
    task('completed', 'completed', { id: 'older-done' }),
  ];
  assert.equal(pickMapTask(tasks, 'older-done').id, 'older-done');
  assert.equal(pickMapTask(tasks, 'cutting').id, 'cutting');
  assert.equal(pickMapTask(tasks, null).id, 'newest-done');
  assert.equal(pickMapTask(tasks, 'no-such-map').id, 'newest-done');
  assert.equal(pickMapTask([task('active', 'waiting')], null), undefined);
});

test('an imported map is named after when it came in', () => {
  assert.equal(importName('2026-09-30 14:32:05'), '2026/09/30 14:32 匯入');
});
