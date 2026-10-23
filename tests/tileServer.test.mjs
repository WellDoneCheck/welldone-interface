import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorizeTile, BASEMAP_MAX_ZOOM, BASEMAP_TILES } from '../app/utils/tileServer.ts';
import { clearSession, startSession } from '../app/utils/session.ts';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = `${encode({})}.${encode({ sub: 'u', username: 'root', role: 'root', isDefaultPassword: false, exp: Date.now() / 1000 + 3600 })}.s`;
const imagery = { tiles: ['http://backend:3000/tasks/t1/tiles/{z}/{x}/{y}.png'], bounds: [120, 23, 121, 24], minzoom: 12, maxzoom: 22 };

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

test("the backend's tiles are asked for with the token, the electronic map's without", () => {
  startSession(token);
  assert.deepEqual(authorizeTile('http://backend:3000/tasks/t1/tiles/16/1/2.png', imagery), {
    url: 'http://backend:3000/tasks/t1/tiles/16/1/2.png',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.deepEqual(authorizeTile(tileUrl(BASEMAP_TILES, 16, 1, 2), imagery), { url: tileUrl(BASEMAP_TILES, 16, 1, 2) });
  assert.deepEqual(authorizeTile('http://backend:3000.evil.example/x.png', imagery), { url: 'http://backend:3000.evil.example/x.png' });
});

test('without imagery or a login, tiles go without a token', () => {
  startSession(token);
  assert.equal(authorizeTile('http://backend:3000/tasks/t1/tiles/16/1/2.png', null).headers, undefined);
  clearSession();
  assert.equal(authorizeTile('http://backend:3000/tasks/t1/tiles/16/1/2.png', imagery).headers, undefined);
});
