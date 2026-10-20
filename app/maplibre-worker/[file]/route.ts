import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// MapLibre's web worker and the module it imports, served straight from the installed package (so they always match
// its version). The bundler does not pick up the worker, which MapLibre loads from next to its own script; TileMap
// points MapLibre here instead.
const FILES = new Set(['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']);
const PACKAGE_DIST = join(process.cwd(), 'node_modules', 'maplibre-gl', 'dist');

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!FILES.has(file)) return new Response('Not found', { status: 404 });
  return new Response(await readFile(join(PACKAGE_DIST, file)), {
    headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'public, max-age=86400' },
  });
}
