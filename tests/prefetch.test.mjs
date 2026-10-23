import test from 'node:test';
import assert from 'node:assert/strict';
import { prefetch } from '../app/components/useBackend.ts';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test('reading ahead reads once, hands back the read under way, and nothing once read', async () => {
  let reads = 0;
  const load = async () => {
    reads += 1;
    return 'view';
  };
  const first = prefetch('prefetch:once', load);
  assert.ok(first instanceof Promise);
  // clicked while still being read: the same read to wait for
  assert.equal(prefetch('prefetch:once', load), first);
  assert.equal(reads, 1);
  await first;
  assert.equal(prefetch('prefetch:once', load), null);
  assert.equal(reads, 1);
});

test('a failed read ahead settles (a link waiting on it goes on) and can be tried again', async () => {
  let reads = 0;
  const failing = async () => {
    reads += 1;
    throw new Error('offline');
  };
  await prefetch('prefetch:failed', failing);
  await tick();
  assert.ok(prefetch('prefetch:failed', failing) instanceof Promise);
  assert.equal(reads, 2);
});
