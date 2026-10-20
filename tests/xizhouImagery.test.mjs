import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gridPoint, IMAGED_COLUMNS, IMAGERY_BOUNDS, TILE_METRES } from '../app/data/xizhouImagery.ts';
import { DETECTED_WELL_SITES } from '../app/data/testWellSites.ts';
import { EXPORT_WELLS } from '../app/data/exportWells.ts';
import { getLatestFinishedRecord, wellsOf } from '../app/data/mapRecords.ts';

// Metres between two points (flat, fine over a few km)
const metres = (a, b) =>
  Math.hypot((a.latitude - b.latitude) * 111320, (a.longitude - b.longitude) * 111320 * Math.cos((a.latitude * Math.PI) / 180));

test('tile corners match what gdalinfo reports for the cut tiles', () => {
  // tile_0_85000.tif: upper left 120°26′44.60″E, 23°49′25.58″N
  const first = gridPoint(0, 17);
  assert.ok(Math.abs(first.longitude - (120 + 26 / 60 + 44.6 / 3600)) < 1e-5);
  assert.ok(Math.abs(first.latitude - (23 + 49 / 60 + 25.58 / 3600)) < 1e-5);
  // tile_165000_10000.tif: upper left 120°28′56.15″E, 23°50′20.28″N
  const last = gridPoint(33, 2);
  assert.ok(Math.abs(last.longitude - (120 + 28 / 60 + 56.15 / 3600)) < 1e-5);
  assert.ok(Math.abs(last.latitude - (23 + 50 / 60 + 20.28 / 3600)) < 1e-5);
});

test('the imaged strip is the 154 cut tiles', () => {
  assert.equal(IMAGED_COLUMNS.reduce((sum, [first, last]) => sum + last - first + 1, 0), 154);
});

test('every test well stands on an imaged tile, away from the strip edge', () => {
  for (const site of DETECTED_WELL_SITES) {
    const [west, , , north] = IMAGERY_BOUNDS;
    const column = metres({ latitude: site.latitude, longitude: west }, site) / TILE_METRES / Math.cos((site.latitude * Math.PI) / 180);
    const row = metres({ latitude: north, longitude: site.longitude }, site) / TILE_METRES / Math.cos((site.latitude * Math.PI) / 180);
    const [first, last] = IMAGED_COLUMNS[Math.floor(row)];
    assert.ok(Math.floor(column) > first && Math.floor(column) < last, `${site.latitude}, ${site.longitude} is on an edge tile`);
  }
});

test('detected wells are over 100 m apart, like the old placeholder grid', () => {
  let closest = Infinity;
  for (let i = 0; i < DETECTED_WELL_SITES.length; i++) {
    for (let j = i + 1; j < DETECTED_WELL_SITES.length; j++) closest = Math.min(closest, metres(DETECTED_WELL_SITES[i], DETECTED_WELL_SITES[j]));
  }
  assert.ok(closest > 100, `closest pair is ${closest.toFixed(1)} m`);
});

test('export wells and map wells stand on the test sites', () => {
  assert.equal(EXPORT_WELLS.length, DETECTED_WELL_SITES.length);
  assert.deepEqual({ latitude: EXPORT_WELLS[0].latitude, longitude: EXPORT_WELLS[0].longitude }, DETECTED_WELL_SITES[0]);
  const [first] = wellsOf(getLatestFinishedRecord().id);
  assert.deepEqual({ latitude: first.latitude, longitude: first.longitude }, DETECTED_WELL_SITES[0]);
  assert.equal(first.coordinates, `${DETECTED_WELL_SITES[0].latitude.toFixed(5)}, ${DETECTED_WELL_SITES[0].longitude.toFixed(5)}`);
});
