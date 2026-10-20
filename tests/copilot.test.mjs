import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COPILOT_SUGGESTIONS, replyTo } from '../app/data/copilot.ts';

const FALLBACK_TEXT = replyTo('').text;

test('every suggested question gets a real (non-fallback) reply', () => {
  for (const suggestion of COPILOT_SUGGESTIONS) {
    assert.notEqual(replyTo(suggestion).text, FALLBACK_TEXT, suggestion);
  }
});

test('suggested questions each lead to a different reply', () => {
  const replies = new Set(COPILOT_SUGGESTIONS.map((suggestion) => replyTo(suggestion).text));
  assert.equal(replies.size, COPILOT_SUGGESTIONS.length);
});
