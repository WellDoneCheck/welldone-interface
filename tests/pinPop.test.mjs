import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PIN_POP_MS, popDelay, popDuration, popOrder, unsettledIds } from '../app/utils/pinPop.ts';

test('the map\'s first pins all pop in', () => {
  assert.deepEqual(unsettledIds(['A001', 'A002'], new Set()), ['A001', 'A002']);
});

test('later, only the pins new to the map pop in', () => {
  assert.deepEqual(unsettledIds(['A001', 'A002', 'A003'], new Set(['A001', 'A002'])), ['A003']);
});

test('a pin taken off pops nothing in', () => {
  assert.deepEqual(unsettledIds(['A001'], new Set(['A001', 'A002'])), []);
});

test('pins popping in together go one after another', () => {
  assert.equal(popDelay(0, 3), 0);
  assert.equal(popDelay(1, 3), 60);
  assert.equal(popDelay(2, 3), 120);
  assert.equal(popDuration(3), 120 + PIN_POP_MS);
});

test('a lone pin pops in at once', () => {
  assert.equal(popDelay(0, 1), 0);
  assert.equal(popDuration(1), PIN_POP_MS);
});

test('a whole map of pins still all start within the stagger limit', () => {
  assert.equal(popDelay(200, 201), 1200);
  assert.ok(popDelay(1, 201) < 60);
});

const screen = { width: 1000, height: 800 };

test('pins on screen pop in nearest to the focus first, spreading out from it', () => {
  const pins = [
    { id: 'far', x: 900, y: 700 },
    { id: 'focus', x: 500, y: 400 },
    { id: 'near', x: 550, y: 420 },
  ];
  assert.deepEqual(popOrder(pins, { x: 500, y: 400 }, screen, 50).onScreen, ['focus', 'near', 'far']);
});

test('pins off screen do not pop in: the map draws them at once', () => {
  const pins = [
    { id: 'on', x: 100, y: 100 },
    { id: 'left', x: -200, y: 100 },
    { id: 'below', x: 100, y: 1200 },
  ];
  assert.deepEqual(popOrder(pins, { x: 0, y: 0 }, screen, 50), { onScreen: ['on'], offScreen: ['left', 'below'] });
});

test('a pin standing just outside the screen, within the margin, still pops in', () => {
  assert.deepEqual(popOrder([{ id: 'edge', x: -30, y: 400 }], { x: 0, y: 0 }, screen, 50).onScreen, ['edge']);
});
