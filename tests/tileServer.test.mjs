import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BASEMAP_MAX_ZOOM, BASEMAP_TILES } from '../app/utils/tileServer.ts';

// The tile address MapLibre would request for zoom z, column x, row y
const tileUrl = (template, z, x, y) => template.replace('{z}', z).replace('{x}', x).replace('{y}', y);

test("the electronic map's WMTS takes the row before the column", () => {
  // 溪州 at zoom 16 is column 54698, row 28298
  assert.equal(tileUrl(BASEMAP_TILES, 16, 54698, 28298), 'https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/16/28298/54698');
});

test('the electronic map is drawn from its own tiles no closer in than zoom 20', () => {
  // it has no tiles past zoom 20: asking for them would leave the map blank close in
  assert.equal(BASEMAP_MAX_ZOOM, 20);
});
