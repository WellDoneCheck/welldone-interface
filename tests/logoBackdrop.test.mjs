import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLightBackdrop, logoBackdropIsLight, reportLogoBackdrop, subscribeToLogoBackdrop } from '../app/utils/logoBackdrop.ts';

const DARK_GREEN = [44, 50, 47];
const pixels = (...rgba) => Uint8Array.from(rgba.flat());

test('the light grey electronic map counts as light, the aerial imagery as dark', () => {
  assert.equal(isLightBackdrop(pixels([242, 242, 240, 255], [236, 236, 236, 255]), DARK_GREEN), true);
  assert.equal(isLightBackdrop(pixels([70, 95, 60, 255], [120, 130, 110, 255]), DARK_GREEN), false);
});

test('transparent pixels show the background behind the map', () => {
  assert.equal(isLightBackdrop(pixels([0, 0, 0, 0]), DARK_GREEN), false);
  assert.equal(isLightBackdrop(pixels([0, 0, 0, 0]), [250, 250, 250]), true);
});

test('half-covered pixels mix with the background (premultiplied colours)', () => {
  // white at half cover over black is mid grey: not light
  assert.equal(isLightBackdrop(pixels([128, 128, 128, 128]), [0, 0, 0]), false);
  // over white it is white
  assert.equal(isLightBackdrop(pixels([128, 128, 128, 128]), [255, 255, 255]), true);
});

test('no pixels: not light', () => {
  assert.equal(isLightBackdrop(new Uint8Array(0), DARK_GREEN), false);
});

test('a map clearing its report leaves what another map said', () => {
  const first = {};
  const second = {};
  let calls = 0;
  const unsubscribe = subscribeToLogoBackdrop(() => calls++);
  reportLogoBackdrop(first, true);
  assert.equal(logoBackdropIsLight(), true);
  reportLogoBackdrop(second, false);
  reportLogoBackdrop(first, null);
  assert.equal(logoBackdropIsLight(), false);
  reportLogoBackdrop(second, false);
  assert.equal(calls, 2, 'the same report again tells nobody');
  reportLogoBackdrop(second, null);
  assert.equal(logoBackdropIsLight(), null);
  unsubscribe();
});
