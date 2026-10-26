import test from 'node:test';
import assert from 'node:assert/strict';
import { rememberTasks, rememberedTasks } from '../app/utils/taskCache.ts';

test('the maps read last are kept per user', () => {
  const tasks = { tasks: [{ id: 't1' }], progress: {} };
  rememberTasks('u1', tasks);
  assert.equal(rememberedTasks('u1'), tasks);
  assert.equal(rememberedTasks('u2'), null);
});

test('nobody logged in has none', () => {
  assert.equal(rememberedTasks(null), null);
});
