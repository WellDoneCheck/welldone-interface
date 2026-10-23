import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chunkCount, chunkRange, chunkBytes, remainingChunks, sentBytes, retryable } from '../app/utils/chunkedUpload.ts';
import { ApiError } from '../app/utils/api.ts';

const MB = 1024 * 1024;

test('chunkCount: splits by chunk size, rounding up, at least one', () => {
  assert.equal(chunkCount(0, 10), 1);
  assert.equal(chunkCount(10, 10), 1);
  assert.equal(chunkCount(11, 10), 2);
  assert.equal(chunkCount(100 * MB, 16 * MB), 7);
});

test('chunkRange: clamps the last chunk to the file end', () => {
  assert.deepEqual(chunkRange(0, 25, 10), [0, 10]);
  assert.deepEqual(chunkRange(1, 25, 10), [10, 20]);
  assert.deepEqual(chunkRange(2, 25, 10), [20, 25]);
  // past the end stays at the end (empty range)
  assert.deepEqual(chunkRange(3, 25, 10), [25, 25]);
});

test('chunkBytes: the size of each chunk, the last one shorter', () => {
  assert.equal(chunkBytes(0, 25, 10), 10);
  assert.equal(chunkBytes(2, 25, 10), 5);
});

test('remainingChunks: the indices the server does not yet have, in order', () => {
  assert.deepEqual(remainingChunks(5, []), [0, 1, 2, 3, 4]);
  assert.deepEqual(remainingChunks(5, [0, 1, 2, 3, 4]), []);
  assert.deepEqual(remainingChunks(5, [1, 3]), [0, 2, 4]);
  // unordered or out-of-range held chunks are handled
  assert.deepEqual(remainingChunks(3, [2, 0, 9]), [1]);
});

test('sentBytes: the bytes already on the server from the chunks it holds', () => {
  assert.equal(sentBytes([], 25, 10), 0);
  assert.equal(sentBytes([0, 1], 25, 10), 20);
  // the short last chunk counts as its real size
  assert.equal(sentBytes([0, 1, 2], 25, 10), 25);
});

test('retryable: transient failures are retried, client errors are given up at once', () => {
  // network (status 0), server errors and 408/429 are worth another try
  assert.equal(retryable(new ApiError(0, '無法連線到伺服器')), true);
  assert.equal(retryable(new ApiError(500, 'x')), true);
  assert.equal(retryable(new ApiError(503, 'x')), true);
  assert.equal(retryable(new ApiError(408, 'x')), true);
  assert.equal(retryable(new ApiError(429, 'x')), true);
  // client errors would fail the same way again
  assert.equal(retryable(new ApiError(400, 'x')), false);
  assert.equal(retryable(new ApiError(401, 'x')), false);
  assert.equal(retryable(new ApiError(413, 'x')), false);
  // an unexpected (non-ApiError) failure is retried in case it was a glitch
  assert.equal(retryable(new Error('boom')), true);
});
