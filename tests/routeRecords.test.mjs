import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCheckRoute, resolveMapRoute } from '../app/utils/routeRecords.ts';
import { getLatestRecord, MAP_RECORDS } from '../app/data/mapRecords.ts';
import { EXPORT_WELLS } from '../app/data/exportWells.ts';

const mapRecord = MAP_RECORDS.find((record) => record.id !== getLatestRecord().id);
const exportOnlyWell = EXPORT_WELLS.find((well) => !MAP_RECORDS.some((record) => record.id === well.id));

test('map: a known record is shown and its card opens on arrival', () => {
  const view = resolveMapRoute(mapRecord.id, null);
  assert.equal(view.record.id, mapRecord.id);
  assert.equal(view.openCardOnArrival, true);
  assert.equal(view.cardOpenAtStart, false);
});

test('map: coming back from the check page opens the card at once', () => {
  assert.equal(resolveMapRoute(mapRecord.id, 'check').cardOpenAtStart, true);
});

test('map: no or unknown record falls back to the latest map with the card closed', () => {
  for (const id of [null, 'no-such-well']) {
    const view = resolveMapRoute(id, 'check');
    assert.equal(view.record.id, getLatestRecord().id);
    assert.equal(view.openCardOnArrival, false);
    assert.equal(view.cardOpenAtStart, false);
  }
});

test('check: a map record links back to its pin with the card open', () => {
  const view = resolveCheckRoute(mapRecord.id);
  assert.equal(view.record.id, mapRecord.id);
  assert.equal(view.backHref, `/map?record=${mapRecord.id}&from=check`);
});

test('check: an export-only well links back to the plain map', () => {
  const view = resolveCheckRoute(exportOnlyWell.id);
  assert.equal(view.record.id, exportOnlyWell.id);
  assert.equal(view.backHref, '/map');
});

test('check: no record falls back to the latest record', () => {
  assert.equal(resolveCheckRoute(null).record.id, getLatestRecord().id);
});
