import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldAlignSection } from '../app/utils/sectionAlign.ts';

const VH = 1000;

test('scrolling down to a stop with the section top near the top of the window aligns it', () => {
  assert.equal(shouldAlignSection(300, VH, true), true);
});

test('a section already at the top, or still low in the window, is left alone', () => {
  assert.equal(shouldAlignSection(1, VH, true), false);
  assert.equal(shouldAlignSection(600, VH, true), false);
});

test('a section scrolled past (on the way to the footer) is never pulled back', () => {
  assert.equal(shouldAlignSection(-400, VH, true), false);
});

test('scrolling up is never aligned', () => {
  assert.equal(shouldAlignSection(300, VH, false), false);
});
