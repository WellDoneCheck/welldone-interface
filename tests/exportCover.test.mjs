import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coveredPage, exportHref } from '../app/utils/exportCover.ts';

const paramsOf = (href) => new URL(href, 'http://site').searchParams;

test('the export address names its map and the page it is opened over', () => {
  const params = paramsOf(exportHref('task-1', '/check?record=W001'));
  assert.equal(params.get('record'), 'task-1');
  assert.equal(params.get('over'), '/check?record=W001');
});

test('without a map, the export address names only the page it is opened over', () => {
  assert.equal(paramsOf(exportHref(undefined, '/map')).has('record'), false);
});

test('reloaded, the sheet is over the check page it was opened from', () => {
  assert.deepEqual(coveredPage(paramsOf(exportHref('task-1', '/check?record=W001'))), { path: '/check', search: 'record=W001' });
});

test('reloaded, the sheet is over the compare page it was opened from', () => {
  assert.deepEqual(coveredPage(paramsOf(exportHref('task-1', '/compare?record=task-1'))), { path: '/compare', search: 'record=task-1' });
});

test('without a page it was opened over, the sheet is over its map', () => {
  assert.deepEqual(coveredPage(paramsOf('/export?record=task-1')), { path: '/map', search: 'record=task-1' });
  assert.deepEqual(coveredPage(paramsOf('/export')), { path: '/map', search: '' });
});

test('a page the sheet cannot be over is ignored for its map', () => {
  assert.deepEqual(coveredPage(paramsOf(exportHref('task-1', '//elsewhere.example/map'))), { path: '/map', search: 'record=task-1' });
  assert.deepEqual(coveredPage(paramsOf(exportHref('task-1', '/upload'))), { path: '/map', search: 'record=task-1' });
});
