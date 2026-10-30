import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CPU_HISTORY_LENGTH } from '../app/utils/monitorLive.ts';
import { liveService, liveServices, nextReading } from '../app/utils/monitorServices.ts';

const GB = 1024 ** 3;
const check = (code, usage = { cpuPercent: 12.5, memoryUsedBytes: 0.5 * GB, memoryLimitBytes: 2 * GB }) => ({
  code,
  up: true,
  latencyMs: 3,
  usage,
});

test("a backend check reads as a service row with its container's load", () => {
  assert.deepEqual(liveService(check('splitter')), {
    name: '切圖服務',
    code: 'welldone-splitter',
    up: true,
    cpuBase: 0,
    cpu: [12.5],
    memory: { usedGb: 0.5, totalGb: 2 },
  });
});

test('a service down or without a container shows no load', () => {
  const down = liveService({ code: 'ai', up: false, latencyMs: null, usage: null });
  assert.equal(down.up, false);
  assert.deepEqual(down.cpu, []);
  assert.equal(down.memory, null);
});

test('each check adds a CPU reading after the ones before, keeping the latest few', () => {
  let services = [];
  for (let reading = 1; reading <= CPU_HISTORY_LENGTH + 3; reading++) {
    services = liveServices([check('postgres', { cpuPercent: reading, memoryUsedBytes: GB, memoryLimitBytes: 4 * GB })], services);
  }
  const [postgres] = services;
  assert.equal(postgres.cpu.length, CPU_HISTORY_LENGTH);
  assert.equal(postgres.cpu.at(-1), CPU_HISTORY_LENGTH + 3);
  assert.equal(postgres.cpu[0], 4);
});

test('readings stay with their own service and a check without a load starts them over', () => {
  const first = liveServices([check('postgres'), check('titiler')], []);
  const next = liveServices([check('postgres', null), check('titiler')], first);
  assert.deepEqual(next[0].cpu, []);
  assert.deepEqual(next[1].cpu, [12.5, 12.5]);
});

test("the queue's Redis is not shown, leaving the five rows the panel has room for", () => {
  const codes = ['backend', 'postgres', 'redis', 'splitter', 'titiler', 'ai'];
  const rows = liveServices(
    codes.map((code) => check(code)),
    [],
  );
  assert.deepEqual(
    rows.map((row) => row.code),
    ['welldone-backend', 'welldone-postgres', 'welldone-splitter', 'welldone-titiler', 'welldone-ai'],
  );
});

const T0 = Date.UTC(2026, 9, 30, 8, 0);
const down = (code) => ({ code, up: false, latencyMs: null, usage: null });

test('the first read logs only the services that are down', () => {
  const reading = nextReading(null, [check('backend'), down('ai')], T0);
  assert.deepEqual(
    reading.events.map((event) => [event.id, event.title, event.at]),
    [['service-event-1', '服務離線：模型辨識服務', T0]],
  );
  assert.equal(reading.nextEventNumber, 2);
});

test('nothing changing logs nothing; a service coming back is logged on top', () => {
  const first = nextReading(null, [check('backend'), down('ai')], T0);
  const same = nextReading(first, [check('backend'), down('ai')], T0 + 5000);
  assert.deepEqual(same.events.map((event) => event.id), ['service-event-1']);

  const back = nextReading(same, [check('backend'), check('ai', null)], T0 + 10000);
  assert.deepEqual(
    back.events.map((event) => [event.id, event.title]),
    [
      ['service-event-2', '服務恢復：模型辨識服務'],
      ['service-event-1', '服務離線：模型辨識服務'],
    ],
  );
});

test('all up from the start: no events', () => {
  assert.deepEqual(nextReading(null, [check('backend'), check('postgres')], T0).events, []);
});
