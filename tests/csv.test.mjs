import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeCsv, parseCsv, toCsv } from '../app/utils/csv.ts';

test('splits rows and fields, dropping blank lines and carriage returns', () => {
  assert.deepEqual(parseCsv('a,b\r\n1,2\r\n\r\n3,4'), [['a', 'b'], ['1', '2'], ['3', '4']]);
});

test('keeps commas, doubled quotes and line breaks inside quoted fields', () => {
  assert.deepEqual(parseCsv('"x, y","say ""hi""","two\nlines"'), [['x, y', 'say "hi"', 'two\nlines']]);
});

test('keeps empty fields', () => {
  assert.deepEqual(parseCsv('a,,c'), [['a', '', 'c']]);
});

test('toCsv output parses back to the same rows', () => {
  const rows = [['編號', 'note'], ['A,1', 'he said "ok"']];
  assert.deepEqual(parseCsv(toCsv(rows).replace(/^﻿/, '')), rows);
});

test('decodes UTF-8 and drops its BOM', () => {
  assert.equal(decodeCsv(new TextEncoder().encode('﻿編號')), '編號');
});

test('falls back to Big5 when the bytes are not valid UTF-8', () => {
  assert.equal(decodeCsv(Uint8Array.from([0xbd, 0x73, 0xb8, 0xb9])), '編號');
});
