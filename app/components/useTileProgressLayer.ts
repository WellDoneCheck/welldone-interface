'use client';

import { useEffect, useState } from 'react';
import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import { countStates, readTileProgress, type TileProgress, type TileState } from '../utils/tileProgress';

// How often the tiles are read again while the map is cut or recognised, and how long the tiles the AI is at take to
// fade in or out (they pulse)
const POLL_MS = 5000;
const PULSE_MS = 800;

const SOURCE = 'tile-progress';
// the tiles at rest, the ones being recognised (on their own, as only a whole layer's opacity can be animated) and the
// grid's lines
const FILL_LAYER = 'tile-progress';
const ACTIVE_LAYER = 'tile-progress-active';
const LINE_LAYER = 'tile-progress-line';
const LAYERS = [FILL_LAYER, ACTIVE_LAYER, LINE_LAYER];
// drawn under the map page's pins
const BELOW = 'wells';

// The states' colours: the site's teal for being recognised, brick red for failed, grey (the ink, faint) for not cut or
// not reached yet
export const TILE_COLOR: Record<TileState, string> = { uncut: '#2C322F', processing: '#62A4A7', failed: '#BC5646', pending: '#2C322F' };
const TILE_OPACITY: Record<Exclude<TileState, 'processing'>, number> = { uncut: 0.18, failed: 0.45, pending: 0.18 };
const PULSE_OPACITY = [0.2, 0.65];

// The map's tiles, read again every POLL_MS while it is cut or recognised (readTileProgress); null until there is
// something to draw. A failed read is tried again.
function useTileProgress(taskId: string): TileProgress | null {
  const [read, setRead] = useState<{ taskId: string; progress: TileProgress } | null>(null);

  useEffect(() => {
    let current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () =>
      readTileProgress(taskId).then(
        ({ progress, again }) => {
          if (!current) return;
          if (progress) setRead({ taskId, progress });
          if (again) timer = setTimeout(refresh, POLL_MS);
        },
        () => {
          if (current) timer = setTimeout(refresh, POLL_MS);
        },
      );
    refresh();
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [taskId]);

  return read?.taskId === taskId ? read.progress : null;
}

function addLayers(map: MapLibreMap) {
  const below = map.getLayer(BELOW) ? BELOW : undefined;
  map.addSource(SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  const state: ExpressionSpecification = ['get', 'state'];
  map.addLayer(
    {
      id: FILL_LAYER,
      type: 'fill',
      source: SOURCE,
      filter: ['!=', state, 'processing'],
      paint: {
        'fill-color': ['match', state, 'failed', TILE_COLOR.failed, TILE_COLOR.pending],
        'fill-opacity': ['match', state, 'failed', TILE_OPACITY.failed, TILE_OPACITY.pending],
      },
    },
    below,
  );
  map.addLayer(
    {
      id: ACTIVE_LAYER,
      type: 'fill',
      source: SOURCE,
      filter: ['==', state, 'processing'],
      paint: { 'fill-color': TILE_COLOR.processing, 'fill-opacity': PULSE_OPACITY[1], 'fill-opacity-transition': { duration: PULSE_MS, delay: 0 } },
    },
    below,
  );
  map.addLayer(
    {
      id: LINE_LAYER,
      type: 'line',
      source: SOURCE,
      paint: {
        'line-color': ['match', state, 'processing', TILE_COLOR.processing, 'failed', TILE_COLOR.failed, '#FFFFFF'],
        'line-opacity': ['match', state, 'processing', 1, 'failed', 0.9, 0.5],
        'line-width': ['match', state, 'processing', 2.5, 'failed', 2, 1],
      },
    },
    below,
  );
}

function removeLayers(map: MapLibreMap) {
  // (a removed map has no style left: getLayer finds nothing)
  for (const id of LAYERS) if (map.getLayer(id)) map.removeLayer(id);
  if (map.getSource(SOURCE)) map.removeSource(SOURCE);
}

export interface TileProgressLayer {
  // how many tiles are drawn in each state (null while none are)
  counts: Record<TileState, number> | null;
  // tiles the AI has recognised (null until known, and while cutting): changes as it may have found more wells
  recognised: number | null;
  // the whole image (null until known), to show it before it can be seen
  bounds: TileProgress['bounds'] | null;
  // the imagery cut so far, while cutting
  imagery: TileProgress['imagery'];
}

// How far an imported map has got, tile by tile, over the map: the tiles not cut yet while it is cut, then the tiles
// the AI has still to recognise, each coloured by its state (the ones it is at pulse); a tile it has recognised is
// taken off. Taken off the map when the page goes (the map may stay for the next: SurveyMap).
export function useTileProgressLayer(map: MapLibreMap | null, taskId: string): TileProgressLayer {
  const progress = useTileProgress(taskId);
  const features = progress?.features ?? null;

  useEffect(() => {
    if (!map) return;
    addLayers(map);
    return () => removeLayers(map);
  }, [map]);

  useEffect(() => {
    if (map && features) (map.getSource(SOURCE) as GeoJSONSource | undefined)?.setData(features);
  }, [map, features]);

  const counts = features && features.features.length > 0 ? countStates(features) : null;
  const pulsing = map !== null && (counts?.processing ?? 0) > 0;
  useEffect(() => {
    if (!map || !pulsing) return;
    let bright = true;
    const timer = setInterval(() => {
      bright = !bright;
      if (map.getLayer(ACTIVE_LAYER)) map.setPaintProperty(ACTIVE_LAYER, 'fill-opacity', PULSE_OPACITY[bright ? 1 : 0]);
    }, PULSE_MS);
    return () => clearInterval(timer);
  }, [map, pulsing]);

  return { counts, recognised: progress?.recognised ?? null, bounds: progress?.bounds ?? null, imagery: progress?.imagery ?? null };
}
