import { test } from 'node:test';
import assert from 'node:assert/strict';
import { taipeiDateTime } from '../app/utils/taipeiTime.ts';

test('backend times show in Taipei time (UTC+8)', () => {
  assert.equal(taipeiDateTime('2026-10-20T05:52:00.000Z'), '2026-10-20 13:52');
});

test('a time late in the UTC day falls on the next Taipei day', () => {
  assert.equal(taipeiDateTime('2026-12-31T16:30:00.000Z'), '2027-01-01 00:30');
});
