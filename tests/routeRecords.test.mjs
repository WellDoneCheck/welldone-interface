import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findSourceMap, mapHref, resolveCheckRoute, resolveMapRoute } from '../app/utils/routeRecords.ts';
import {
  defaultRecordName,
  findWell,
  getLatestFinishedRecord,
  getLatestRecord,
  importName,
  MAP_RECORDS,
  wellsOf,
} from '../app/data/mapRecords.ts';
import { EXPORT_WELLS } from '../app/data/exportWells.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const byStatus = (status) => MAP_RECORDS.filter((record) => record.status === status);
const doneMap = byStatus('done').find((record) => record.id !== getLatestFinishedRecord().id);
const doneWell = wellsOf(doneMap.id)[4];

/* ─── Imported maps and their wells ─────────────────────────────── */

test('imported maps are identified by uuid, apart from their wells', () => {
  for (const record of MAP_RECORDS) assert.match(record.id, UUID);
  assert.equal(new Set(MAP_RECORDS.map((record) => record.id)).size, MAP_RECORDS.length);
  assert.equal(findWell(doneMap.id), undefined, 'a map is not a well');
});

test('a map has wells as far as it has been recognised', () => {
  for (const record of byStatus('done')) assert.equal(wellsOf(record.id).length, 105);
  for (const record of byStatus('recognizing')) assert.equal(wellsOf(record.id).length, Math.round((105 * record.current) / record.total));
  for (const record of byStatus('cutting')) assert.equal(wellsOf(record.id).length, 0);
});

test('every well belongs to its map and has an id of its own', () => {
  const wells = MAP_RECORDS.flatMap((record) => wellsOf(record.id));
  assert.equal(new Set(wells.map((well) => well.id)).size, wells.length);
  for (const record of MAP_RECORDS) for (const well of wellsOf(record.id)) assert.equal(well.recordId, record.id);
  assert.equal(wellsOf(getLatestFinishedRecord().id)[0].id, 'SW-2023-A001');
});

test('the export page wells are the wells of the finished 2023 map', () => {
  const wells = wellsOf(getLatestFinishedRecord().id);
  assert.deepEqual(EXPORT_WELLS.map((well) => well.id), wells.map((well) => well.id));
  for (const well of EXPORT_WELLS) assert.equal(well.mapRecordId, getLatestFinishedRecord().id);
});

/* ─── Map page ──────────────────────────────────────────────────── */

test('map: a map opened from the import page shows its wells with none selected', () => {
  const view = resolveMapRoute(doneMap.id, null, null);
  assert.equal(view.record.id, doneMap.id);
  assert.equal(view.wells.length, 105);
  assert.equal(view.well, null);
  assert.equal(view.openCardOnArrival, false);
  assert.equal(view.cardOpenAtStart, false);
});

test('map: a well asked for is selected and its card opens on arrival', () => {
  const view = resolveMapRoute(doneMap.id, doneWell.id, null);
  assert.equal(view.well.id, doneWell.id);
  assert.equal(view.openCardOnArrival, true);
  assert.equal(view.cardOpenAtStart, false);
});

test('map: coming back from the check page opens the card at once', () => {
  assert.equal(resolveMapRoute(doneMap.id, doneWell.id, 'check').cardOpenAtStart, true);
});

test('map: a well of another map is not selected', () => {
  const other = wellsOf(getLatestFinishedRecord().id)[0];
  assert.equal(resolveMapRoute(doneMap.id, other.id, 'check').well, null);
});

test('map: a map still being cut opens with no pins', () => {
  const view = resolveMapRoute(byStatus('cutting')[0].id, null, null);
  assert.deepEqual(view.wells, []);
  assert.equal(view.well, null);
});

test('map: no or unknown map falls back to the newest finished map', () => {
  for (const id of [null, 'no-such-map']) {
    const view = resolveMapRoute(id, null, 'check');
    assert.equal(view.record.id, getLatestFinishedRecord().id);
    assert.equal(view.cardOpenAtStart, false);
  }
});

/* ─── Check page ────────────────────────────────────────────────── */

test('check: a well links back to its pin in its map with the card open', () => {
  const view = resolveCheckRoute(doneWell.id);
  assert.equal(view.record.id, doneWell.id);
  assert.equal(view.backHref, `/map?record=${doneMap.id}&well=${doneWell.id}&from=check`);
  assert.equal(view.backHref, `${mapHref(doneWell)}&from=check`);
});

test('check: an export page well links back to its pin in the map it came from', () => {
  const well = EXPORT_WELLS[42];
  assert.equal(resolveCheckRoute(well.id).backHref, `/map?record=${well.mapRecordId}&well=${well.id}&from=check`);
});

test('check: no or unknown well falls back to the first well of the newest finished map', () => {
  for (const id of [null, 'no-such-well']) assert.equal(resolveCheckRoute(id).record.id, 'SW-2023-A001');
});

test('a well is found in the map it came from', () => {
  assert.equal(findSourceMap(doneWell.id).id, doneMap.id);
  assert.equal(findSourceMap('no-such-well'), undefined);
});

/* ─── Names ─────────────────────────────────────────────────────── */

test('an imported map is named after when it came in, not after its wells', () => {
  assert.equal(defaultRecordName(getLatestRecord()), '2023/10/11 16:40 匯入');
  assert.equal(importName('2026-09-30 14:32:05'), '2026/09/30 14:32 匯入');
});

test('maps imported on the same day get different names', () => {
  const names = MAP_RECORDS.map(defaultRecordName);
  assert.equal(new Set(names).size, names.length);
});

test('the latest map is still the first one listed, though it has no wells yet', () => {
  assert.equal(getLatestRecord().id, MAP_RECORDS[0].id);
  assert.equal(getLatestRecord().status, 'cutting');
  assert.equal(getLatestFinishedRecord().status, 'done');
});
