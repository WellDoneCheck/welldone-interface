import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onEachRest } from '../app/utils/mapRest.ts';

// a map's events: fire(type) calls its listeners, idle included
function fakeMap() {
  const listeners = new Map();
  return {
    on: (type, listener) => listeners.set(type, [...(listeners.get(type) ?? []), listener]),
    off: (type, listener) => listeners.set(type, (listeners.get(type) ?? []).filter((each) => each !== listener)),
    fire: (type, event) => (listeners.get(type) ?? []).forEach((listener) => listener(event)),
    count: () => [...listeners.values()].reduce((sum, each) => sum + each.length, 0),
  };
}

test('the first rest of the map is reported once', () => {
  const map = fakeMap();
  let rests = 0;
  onEachRest(map, () => rests++);
  map.fire('idle');
  map.fire('idle');
  assert.equal(rests, 1);
});

test('two asking for a draw at rest do not keep each other going (the idles after their draws are no new rest)', () => {
  const map = fakeMap();
  let rests = 0;
  // each draw asked for comes to rest again: an idle, with no change in between
  onEachRest(map, () => rests++);
  onEachRest(map, () => rests++);
  for (let frame = 0; frame < 10; frame++) map.fire('idle');
  assert.equal(rests, 2);
});

test('a move, resize, new data or style change makes the next idle a new rest', () => {
  for (const change of ['move', 'resize', 'sourcedata', 'styledata']) {
    const map = fakeMap();
    let rests = 0;
    onEachRest(map, () => rests++);
    map.fire('idle');
    map.fire(change, {});
    map.fire('idle');
    assert.equal(rests, 2, change);
  }
});

test('a source only saying it has finished loading is no change', () => {
  const map = fakeMap();
  let rests = 0;
  onEachRest(map, () => rests++);
  map.fire('idle');
  map.fire('sourcedata', { sourceDataType: 'idle' });
  map.fire('idle');
  assert.equal(rests, 1);
});

test('stopping takes all its listeners off the map', () => {
  const map = fakeMap();
  const stop = onEachRest(map, () => {});
  stop();
  assert.equal(map.count(), 0);
});
