import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { holdFile, readFileAhead } from '../app/utils/sharedFile.ts';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

// Answers every read with a small image, and keeps what was asked and which reads were stopped
let reads = [];
beforeEach(() => {
  reads = [];
  globalThis.fetch = async (url, init) => {
    reads.push({ url, signal: init.signal });
    return new Response(new Blob(['png']), { status: 200 });
  };
});

test('a file shown in two places at once is read once, at one address', async () => {
  const strip = holdFile('/wells/2/image?size=702');
  const compare = holdFile('/wells/2/image?size=702');
  assert.equal(await strip.url, await compare.url);
  assert.equal(reads.length, 1);
  strip.release();
  compare.release();
});

test('the read goes on while anyone still holds the file, and stops once nobody does', async () => {
  const strip = holdFile('/wells/3/image?size=702');
  const compare = holdFile('/wells/3/image?size=702');
  strip.release();
  strip.release();
  assert.equal(reads[0].signal.aborted, false);
  compare.release();
  assert.equal(reads[0].signal.aborted, true);
});

test('a file held again after everyone let go is read again', async () => {
  const first = holdFile('/wells/4/image?size=702');
  await first.url;
  first.release();
  const again = holdFile('/wells/4/image?size=702');
  await again.url;
  assert.equal(reads.length, 2);
  again.release();
});

test('a file read ahead is asked for at once, and one that cannot be read is let go quietly', async () => {
  globalThis.fetch = async (url, init) => {
    reads.push({ url, signal: init.signal });
    return new Response('{"message":"Not Found"}', { status: 404 });
  };
  readFileAhead('/wells/5/image?size=702');
  assert.equal(reads.length, 1);
  assert.match(reads[0].url, /\/wells\/5\/image\?size=702$/);
  // a failed read surfaces nowhere (an unhandled rejection would fail this test)
  await new Promise((resolve) => setTimeout(resolve, 0));
});
