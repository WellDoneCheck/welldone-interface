import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canReadServerLogs, lineLevel, logPagePath, MAX_SHOWN_LINES, withNewLines } from '../app/utils/serverLogs.ts';

const everything = { text: '', level: null };

test('a log opens at its end, then follows from where the last page stopped', () => {
  assert.equal(logPagePath('backend', everything, null), '/server-logs/backend');
  assert.equal(logPagePath('splitter', everything, { file: '2026/10.log', next: 1820 }), '/server-logs/splitter?file=2026%2F10.log&after=1820');
});

test('a filtered log asks the backend for the matching lines only', () => {
  assert.equal(logPagePath('backend', { text: 'task 7', level: 'error' }, null), '/server-logs/backend?q=task+7&level=error');
});

test('following keeps the newest lines only', () => {
  const shown = Array.from({ length: MAX_SHOWN_LINES }, (_, i) => `old ${i}`);
  const lines = withNewLines(shown, { lines: ['new'] });
  assert.equal(lines.length, MAX_SHOWN_LINES);
  assert.equal(lines[0], 'old 1');
  assert.equal(lines.at(-1), 'new');
});

test('lines read as errors or warnings as the backend filters them', () => {
  assert.equal(lineLevel('[Nest] 1  - ERROR [ExceptionsHandler] boom'), 'error');
  assert.equal(lineLevel('2026/10/29 11:16:50 [Task] Split failed: no space'), 'error');
  assert.equal(lineLevel('[Nest] 1  - WARN [Queue] slow job'), 'warn');
  assert.equal(lineLevel('[Nest] 1  - LOG [Tasks] created'), null);
});

test('only root reads the servers\' logs', () => {
  assert.equal(canReadServerLogs('root'), true);
  assert.equal(canReadServerLogs('admin'), false);
  assert.equal(canReadServerLogs('operator'), false);
  assert.equal(canReadServerLogs('viewer'), false);
});
