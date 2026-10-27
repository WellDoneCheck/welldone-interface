import { test } from 'node:test';
import assert from 'node:assert/strict';
import { asWebp, authorizeTile, BASEMAP_MAX_ZOOM, BASEMAP_TILES, taskCoverUrl, throughSite } from '../app/utils/tileServer.ts';
import { clearSession, startSession } from '../app/utils/session.ts';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = `${encode({})}.${encode({ sub: 'u', username: 'root', role: 'root', isDefaultPassword: false, exp: Date.now() / 1000 + 3600 })}.s`;
const site = 'http://site.local';

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

test("the backend's tiles are asked for through the site, keeping their path and query", () => {
  assert.equal(throughSite('http://backend:3000/tasks/t1/tiles/{z}/{x}/{y}.png', site), 'http://site.local/backend/tasks/t1/tiles/{z}/{x}/{y}.png');
  assert.equal(throughSite('https://api.example/tasks/t1/tiles/cut/{z}/{x}/{y}.png?v=3', site), 'http://site.local/backend/tasks/t1/tiles/cut/{z}/{x}/{y}.png?v=3');
});

test("the backend's tiles are asked for as WebP, keeping the rest of the address", () => {
  assert.equal(asWebp('http://backend:3000/tasks/t1/tiles/{z}/{x}/{y}.png'), 'http://backend:3000/tasks/t1/tiles/{z}/{x}/{y}.webp');
  assert.equal(asWebp('http://backend:3000/tasks/t1/tiles/cut/{z}/{x}/{y}.png?v=3'), 'http://backend:3000/tasks/t1/tiles/cut/{z}/{x}/{y}.webp?v=3');
  // only the tile's own extension: a .png elsewhere in the address stays
  assert.equal(asWebp('http://png.example/a.png/tiles/{z}/{x}/{y}.jpg'), 'http://png.example/a.png/tiles/{z}/{x}/{y}.jpg');
});

test("the backend's tiles are asked for with the token, the electronic map's without", () => {
  startSession(token);
  assert.deepEqual(authorizeTile('http://site.local/backend/tasks/t1/tiles/16/1/2.png', site), {
    url: 'http://site.local/backend/tasks/t1/tiles/16/1/2.png',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.deepEqual(authorizeTile(tileUrl(BASEMAP_TILES, 16, 1, 2), site), { url: tileUrl(BASEMAP_TILES, 16, 1, 2) });
  assert.deepEqual(authorizeTile('http://site.local.evil.example/backend/x.png', site), { url: 'http://site.local.evil.example/backend/x.png' });
  assert.equal(authorizeTile('http://site.local/backend-other/x.png', site).headers, undefined);
});

test('without a login, tiles go without a token', () => {
  clearSession();
  assert.equal(authorizeTile('http://site.local/backend/tasks/t1/tiles/16/1/2.png', site).headers, undefined);
});

test("a map's cover is the backend's WebP cut around its centre", () => {
  assert.equal(taskCoverUrl('task 1'), '/tasks/task%201/tiles/cover');
});
