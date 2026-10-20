import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findStaticRoutes } from '../scripts/devRoutes.mjs';

function makeApp(pagePaths) {
  const appDir = mkdtempSync(join(tmpdir(), 'app-'));
  for (const pagePath of pagePaths) {
    const file = join(appDir, pagePath);
    mkdirSync(join(file, '..'), { recursive: true });
    writeFileSync(file, '');
  }
  return appDir;
}

test('lists the root and nested pages', () => {
  const appDir = makeApp(['page.tsx', 'map/page.tsx', 'dev/loading/page.tsx', 'map/layout.tsx']);
  assert.deepEqual(findStaticRoutes(appDir), ['/', '/dev/loading', '/map']);
});

test('skips dynamic segments, parallel slots, intercepting routes and private folders', () => {
  const appDir = makeApp([
    'page.tsx',
    'dev/status/[code]/page.tsx',
    '@modal/page.tsx',
    '@modal/(.)export/page.tsx',
    '@modal/[...catchAll]/page.tsx',
    '_lib/page.tsx',
  ]);
  assert.deepEqual(findStaticRoutes(appDir), ['/']);
});

test('route groups add nothing to the URL', () => {
  const appDir = makeApp(['(marketing)/about/page.tsx']);
  assert.deepEqual(findStaticRoutes(appDir), ['/about']);
});

test('finds this app\'s pages', () => {
  assert.deepEqual(findStaticRoutes('app'), ['/', '/check', '/compare', '/dev/loading', '/export', '/map', '/monitor', '/upload']);
});
