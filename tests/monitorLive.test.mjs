import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CPU_HISTORY_LENGTH,
  createSnapshot,
  currentCpu,
  defaultTaskName,
  eventTitle,
  formatAgo,
  loadLevel,
  minutesLeft,
  nextSnapshot,
  renameTask,
  serviceLevel,
  systemHealth,
  taskName,
} from '../app/utils/monitorLive.ts';

const T0 = Date.UTC(2026, 8, 30, 8, 0);
const MINUTE = 60 * 1000;
// Random numbers repeating a fixed list, so updates are reproducible
const sequence = (...values) => {
  let index = 0;
  return () => values[index++ % values.length];
};
const steady = () => 0.5;

// Runs updates until `done` holds, or fails after `limit` of them
function runUntil(snapshot, done, random = steady, limit = 200) {
  for (let step = 1; step <= limit; step++) {
    snapshot = nextSnapshot(snapshot, T0 + step * 5000, random);
    if (done(snapshot)) return snapshot;
  }
  assert.fail(`not reached in ${limit} updates`);
}

test('the first snapshot is the same wherever it is made at the same time', () => {
  assert.deepEqual(createSnapshot(T0), createSnapshot(T0));
});

test('events and batches keep how long ago they happened', () => {
  const snapshot = createSnapshot(T0);
  assert.equal(formatAgo(snapshot.now - snapshot.events[0].at), '6 分鐘前');
  assert.equal(formatAgo(snapshot.now - snapshot.tasks[0].createdAt), '6 分鐘前');
});

test('a batch is named after when it was created until renamed', () => {
  assert.equal(defaultTaskName(new Date(2026, 8, 30, 14, 5).getTime()), '2026/09/30 14:05 匯入');
  const snapshot = createSnapshot(T0);
  const running = snapshot.tasks.find((task) => task.id === 'task-218');
  assert.equal(taskName(running), defaultTaskName(T0 - 14 * MINUTE));
  // one sample batch was already renamed
  assert.equal(taskName(snapshot.tasks.find((task) => task.id === 'task-216')), '嘉義沿海測繪');
});

test('renaming a batch renames it in its events too; a blank name goes back to the date', () => {
  const snapshot = createSnapshot(T0);
  const renamed = renameTask(snapshot, 'task-218', '  雲林航照  ');
  assert.equal(taskName(renamed.tasks.find((task) => task.id === 'task-218')), '雲林航照');
  const started = renamed.events.find((event) => event.task?.id === 'task-218');
  assert.equal(eventTitle(started, renamed.tasks), '開始辨識：雲林航照');
  const cleared = renameTask(renamed, 'task-218', '   ');
  assert.equal(taskName(cleared.tasks.find((task) => task.id === 'task-218')), defaultTaskName(T0 - 14 * MINUTE));
});

test('an event keeps the name its batch had once the batch is no longer listed', () => {
  const snapshot = createSnapshot(T0);
  const event = snapshot.events.find((candidate) => candidate.task?.id === 'task-216');
  assert.equal(eventTitle(event, []), '批次完成：嘉義沿海測繪');
});

test('formats how long ago', () => {
  assert.equal(formatAgo(20 * 1000), '剛剛');
  assert.equal(formatAgo(8 * MINUTE), '8 分鐘前');
  assert.equal(formatAgo(3 * 60 * MINUTE), '3 小時前');
  assert.equal(formatAgo(2 * 24 * 60 * MINUTE), '2 天前');
});

test('load levels: below 80% fine, from 80% a look, from 90% overloaded', () => {
  assert.equal(loadLevel(79.9), 'good');
  assert.equal(loadLevel(80), 'warning');
  assert.equal(loadLevel(90), 'critical');
});

test('a service is as bad as the worse of its CPU and memory', () => {
  const service = { cpu: [20], memoryUsedGb: 3.7, memoryTotalGb: 4 };
  assert.equal(serviceLevel(service), 'critical');
  assert.equal(serviceLevel({ ...service, memoryUsedGb: 1 }), 'good');
});

test('the system needs a look while a batch has failed, and counts it', () => {
  const snapshot = createSnapshot(T0);
  const calm = { ...snapshot, services: snapshot.services.map((service) => ({ ...service, cpu: [30] })) };
  assert.deepEqual(systemHealth(calm), { level: 'warning', issues: 1 });
  const fixed = { ...calm, tasks: calm.tasks.filter((task) => task.state !== 'failed') };
  assert.deepEqual(systemHealth(fixed), { level: 'good', issues: 0 });
  const overloaded = { ...fixed, services: fixed.services.with(0, { ...fixed.services[0], cpu: [95] }) };
  assert.deepEqual(systemHealth(overloaded), { level: 'critical', issues: 1 });
});

test('each update adds one CPU reading per service, within 0–100%', () => {
  let snapshot = createSnapshot(T0);
  for (let step = 1; step <= 50; step++) snapshot = nextSnapshot(snapshot, T0 + step * 5000, sequence(1, 1, 0.9));
  for (const service of snapshot.services) {
    assert.equal(service.cpu.length, CPU_HISTORY_LENGTH);
    assert.ok(currentCpu(service) >= 0 && currentCpu(service) <= 100);
    assert.ok(service.memoryUsedGb <= service.memoryTotalGb);
  }
});

test('the running batch moves on and tells how long it has left', () => {
  const snapshot = createSnapshot(T0);
  const running = snapshot.tasks.find((task) => task.state === 'running');
  // 660 images left at 36 per 5-second update: 92 seconds
  assert.equal(minutesLeft(running), 2);
  const next = nextSnapshot(snapshot, T0 + 5000, steady);
  assert.equal(next.tasks.find((task) => task.id === running.id).processed, running.processed + running.rate);
});

test('a finished batch adds its wells to be checked, logs it, and the queued batch starts', () => {
  const start = createSnapshot(T0);
  const finished = runUntil(start, (snapshot) => snapshot.tasks.find((task) => task.id === 'task-218').state === 'done');
  const task = finished.tasks.find((task) => task.id === 'task-218');
  assert.equal(task.processed, task.images);
  assert.equal(finished.totals.pending, start.totals.pending + task.found);
  assert.equal(finished.tasks.find((task) => task.id === 'task-219').state, 'running');
  const titles = finished.events.slice(0, 3).map((event) => eventTitle(event, finished.tasks));
  assert.ok(titles.includes(`批次完成：${defaultTaskName(T0 - 14 * MINUTE)}`));
  assert.ok(titles.includes(`開始辨識：${defaultTaskName(T0 - 6 * MINUTE)}`));
});

test('a new batch is queued once none waits, so the page keeps moving', () => {
  const started = runUntil(createSnapshot(T0), (snapshot) => snapshot.tasks.find((task) => task.id === 'task-219').state === 'running');
  const queued = started.tasks[0];
  assert.equal(queued.id, 'task-220');
  assert.equal(queued.state, 'queued');
  assert.equal(eventTitle(started.events[0], started.tasks), `新批次排入：${defaultTaskName(queued.createdAt)}`);
});

test('a service going into overload is logged, and so is its recovery', () => {
  const snapshot = createSnapshot(T0);
  const busy = { ...snapshot, services: [{ ...snapshot.services[0], cpuBase: 95, cpu: Array(CPU_HISTORY_LENGTH).fill(88) }] };
  // 88% jumps to 94.4%
  const overloaded = nextSnapshot(busy, T0 + 5000, sequence(1, 0.5));
  assert.equal(serviceLevel(overloaded.services[0]), 'critical');
  assert.ok(overloaded.events.some((event) => event.level === 'critical' && event.title === '服務過載：水井後端服務'));
  // and drops back to 72.5%
  const calming = { ...overloaded, services: [{ ...overloaded.services[0], cpuBase: 10 }] };
  const recovered = nextSnapshot(calming, T0 + 10000, sequence(0, 0.5));
  assert.ok(recovered.events.some((event) => event.level === 'good' && event.title === '負載恢復正常：水井後端服務'));
});

test('events get unique ids and the list stays short', () => {
  let snapshot = createSnapshot(T0);
  for (let step = 1; step <= 300; step++) snapshot = nextSnapshot(snapshot, T0 + step * 5000, sequence(0.9, 0.1, 0.5, 0.3));
  const ids = snapshot.events.map((event) => event.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(snapshot.events.length <= 20);
  assert.ok(snapshot.tasks.length <= 6);
});
