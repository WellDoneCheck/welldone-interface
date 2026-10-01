import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { getRecordNames, recordName, renameRecord } from '../app/utils/recordNames.ts';

const record = { id: 'SW-2023-A01', timestamp: '2023-10-11 16:40:00' };

// A stand-in for the browser's localStorage
const stored = new Map();
globalThis.localStorage = {
  getItem: (key) => (stored.has(key) ? stored.get(key) : null),
  setItem: (key, value) => stored.set(key, String(value)),
};

beforeEach(() => renameRecord(record.id, ''));

test('a map file is named after when it came in until renamed', () => {
  assert.equal(recordName(record), '2023/10/11 16:40 匯入');
});

test('a new name is trimmed, shown everywhere and saved', () => {
  renameRecord(record.id, '  雲林航照 A 區 ');
  assert.equal(recordName(record), '雲林航照 A 區');
  assert.deepEqual(JSON.parse(stored.get('skywell:record-names')), { [record.id]: '雲林航照 A 區' });
});

test('a blank name goes back to the date', () => {
  renameRecord(record.id, '雲林航照');
  renameRecord(record.id, '   ');
  assert.equal(recordName(record), '2023/10/11 16:40 匯入');
  assert.equal(record.id in getRecordNames(), false);
});

test('renaming hands out new names, so pages see the change', () => {
  const before = getRecordNames();
  renameRecord(record.id, '雲林航照');
  assert.notEqual(getRecordNames(), before);
  assert.equal(getRecordNames(), getRecordNames());
});
