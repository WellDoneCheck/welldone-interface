'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import type { Map as MapLibreMap, MapMouseEvent, PaddingOptions, StyleSpecification, SymbolLayerSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { IMAGERY_BOUNDS } from '../data/xizhouImagery';
import { BASEMAP_ATTRIBUTION, BASEMAP_MAX_ZOOM, BASEMAP_TILES, IMAGERY_TILE_SIZE, IMAGERY_TILES } from '../utils/tileServer';
import { isLightBackdrop, reportLogoBackdrop } from '../utils/logoBackdrop';
import type { MapCamera } from '../utils/mapCamera';
import type { ViewportSize } from './pageFrame';

export type Bounds = [west: number, south: number, east: number, north: number];

// Where a point is on screen, in pixels from the map's top-left corner
export type Project = (point: { longitude: number; latitude: number }) => { x: number; y: number };

export interface MapView {
  // changes (a new function) whenever the map moves, so what is drawn over the map follows it
  project: Project;
  map: MapLibreMap;
}

// Where points are on screen for a map, again (a new function) whenever it moves. Only the component calling it draws
// again as the map is dragged, so keep it to the part that follows the map (markers, lines, a card on a marker).
export function useMapProject(map: MapLibreMap | null): Project {
  const [, setMoves] = useState(0);
  useEffect(() => {
    if (!map) return;
    // drawn within the map's own frame, so what follows the map does not trail it by a frame
    const onMove = () => flushSync(() => setMoves((count) => count + 1));
    map.on('move', onMove);
    return () => {
      map.off('move', onMove);
    };
  }, [map]);
  return ({ longitude, latitude }) => {
    if (!map) return { x: -9999, y: -9999 };
    const point = map.project([longitude, latitude]);
    return { x: point.x, y: point.y };
  };
}

// For a layer of many marks over the map (pins, markers and what hangs off them). While the map is only panned, the
// layer is slid along with it as a whole (a transform the browser moves without laying out or painting the marks
// again); the marks are placed afresh, with project, when the map comes to rest or its zoom changes.
// unitScale: screen pixels per pixel of the layer, for a layer inside a zoomed (scaled) page.
export function useMapLayer(map: MapLibreMap | null, unitScale = 1) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [, setPlacements] = useState(0);
  // where the map's centre was on screen when the marks were last placed
  const anchor = useRef<{ lngLat: [number, number]; x: number; y: number; zoom: number } | null>(null);

  useEffect(() => {
    if (!map) return;
    const place = () => setPlacements((count) => count + 1);
    const onMove = () => {
      const from = anchor.current;
      const layer = layerRef.current;
      // zooming: placed afresh within the map's own frame, so the marks do not trail the map by a frame
      if (!from || !layer || map.getZoom() !== from.zoom) return flushSync(place);
      const now = map.project(from.lngLat);
      layer.style.transform = `translate3d(${(now.x - from.x) / unitScale}px, ${(now.y - from.y) / unitScale}px, 0)`;
    };
    map.on('move', onMove);
    map.on('moveend', place);
    return () => {
      map.off('move', onMove);
      map.off('moveend', place);
    };
  }, [map, unitScale]);

  // after every placement: the marks are where they belong, so the layer stops sliding
  useLayoutEffect(() => {
    if (!map) return;
    const center = map.getCenter();
    const { x, y } = map.project(center);
    anchor.current = { lngLat: [center.lng, center.lat], x, y, zoom: map.getZoom() };
    if (layerRef.current) layerRef.current.style.transform = '';
  });

  const project: Project = ({ longitude, latitude }) => {
    if (!map) return { x: -9999, y: -9999 };
    const point = map.project([longitude, latitude]);
    return { x: point.x, y: point.y };
  };
  return { project, layerRef };
}

/* ─── Icon layers ───────────────────────────────────────────────── */

// An icon drawn once on a canvas for an icon layer, at twice its size on the page so it stays sharp on dense screens
export interface Icon {
  image: ImageData;
  pixelRatio: number;
}

export function drawIcon(side: number, draw: (context: CanvasRenderingContext2D) => void): Icon {
  const pixelRatio = 2;
  const canvas = document.createElement('canvas');
  canvas.width = side * pixelRatio;
  canvas.height = side * pixelRatio;
  const context = canvas.getContext('2d')!;
  context.scale(pixelRatio, pixelRatio);
  draw(context);
  return { image: context.getImageData(0, 0, canvas.width, canvas.height), pixelRatio };
}

// Points as GeoJSON for an icon layer's source, each with its own properties (e.g. an id to tell which was clicked)
export function pointFeatures<T extends { longitude: number; latitude: number }>(
  points: T[],
  properties: (point: T, index: number) => Record<string, string | number>,
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: points.map((point, index) => ({
      type: 'Feature',
      properties: properties(point, index),
      geometry: { type: 'Point', coordinates: [point.longitude, point.latitude] },
    })),
  };
}

// A layer of icons the map draws itself (e.g. pins and markers): on the graphics card they move and scale with the map
// at no cost, where a hundred page elements would all be placed again on every frame of a zoom. Adds the icons, an
// empty GeoJSON source and a symbol layer, both called `id`; true once they are on the map, for the page to fill the
// source (setData) and style the layer. icons may take a while (e.g. an image to load first).
export function useIconLayer(
  map: MapLibreMap | null,
  id: string,
  icons: () => Promise<Record<string, Icon>>,
  layout: SymbolLayerSpecification['layout'],
): boolean {
  const [ready, setReady] = useState(false);
  const iconsRef = useRef(icons);
  const layoutRef = useRef(layout);
  useEffect(() => {
    if (!map) return;
    let cancelled = false;
    iconsRef.current().then((drawn) => {
      if (cancelled || map.getLayer(id)) return;
      for (const [name, { image, pixelRatio }] of Object.entries(drawn)) {
        if (!map.hasImage(name)) map.addImage(name, image, { pixelRatio });
      }
      map.addSource(id, { type: 'geojson', data: pointFeatures([], () => ({})) });
      map.addLayer({ id, type: 'symbol', source: id, layout: { 'icon-allow-overlap': true, 'icon-ignore-placement': true, ...layoutRef.current } });
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [map, id]);
  return ready;
}

// The icon (from an icon layer) at a point on screen, if any: the value of one of its properties
export function iconAt(map: MapLibreMap, layer: string, point: { x: number; y: number }, property: string): string | undefined {
  if (!map.getLayer(layer)) return undefined;
  return map.queryRenderedFeatures([point.x, point.y], { layers: [layer] })[0]?.properties?.[property];
}

// The TileMap's overlay: slid along while the map is panned, placed afresh when it comes to rest (useMapLayer)
function Overlay({ map, children }: { map: MapLibreMap; children: (view: MapView) => ReactNode }) {
  const { project, layerRef } = useMapLayer(map);
  return (
    <div ref={layerRef} className="pointer-events-none absolute inset-0 will-change-transform">
      {children({ project, map })}
    </div>
  );
}

// The survey imagery from titiler over the electronic map, which fills in around the imaged strip (where the survey's
// tiles are transparent). Muted: darker and greyer, drawn so by the map itself (a CSS filter on the canvas would be
// applied on every frame).
function mapStyle(muted: boolean): StyleSpecification {
  const paint = { 'raster-fade-duration': 200, ...(muted && { 'raster-saturation': -0.3, 'raster-brightness-max': 0.6 }) };
  return {
    version: 8,
    sources: {
      basemap: { type: 'raster', tiles: [BASEMAP_TILES], tileSize: 256, maxzoom: BASEMAP_MAX_ZOOM, attribution: BASEMAP_ATTRIBUTION },
      imagery: { type: 'raster', tiles: [IMAGERY_TILES], tileSize: IMAGERY_TILE_SIZE, bounds: IMAGERY_BOUNDS, minzoom: 12, maxzoom: 22 },
    },
    layers: [
      { id: 'basemap', type: 'raster', source: 'basemap', paint },
      { id: 'imagery', type: 'raster', source: 'imagery', paint },
    ],
  };
}

const MAPLIBRE_WORKER_URL = '/maplibre-worker/maplibre-gl-worker.mjs';

// The container's colour, seen through the map where no tile covers it (yet): the electronic map's own pale grey ground
const MAP_BACKGROUND: [number, number, number] = [0xf7, 0xf7, 0xf7];
// While the map moves, what is behind the logo is looked at no more often than this
const LOGO_SAMPLE_MS = 200;

// The map's pixels behind the navbar logo's word (Navbar's data-nav-logo-word), or null when the map is not what lies
// behind it (another page part covers it there, or the word is elsewhere)
function pixelsBehindLogo(map: MapLibreMap, container: HTMLElement): Uint8Array | null {
  const word = document.querySelector('[data-nav-logo-word]');
  if (!word) return null;
  const area = word.getBoundingClientRect();
  const topmost = document
    .elementsFromPoint(area.left + area.width / 2, area.top + area.height / 2)
    .find((element) => !element.closest('nav'));
  if (!topmost || !container.contains(topmost)) return null;

  const canvas = map.getCanvas();
  const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
  if (!gl) return null;
  const box = canvas.getBoundingClientRect();
  const perPixel = canvas.width / box.width;
  const left = Math.max(0, Math.floor((area.left - box.left) * perPixel));
  const right = Math.min(canvas.width, Math.ceil((area.right - box.left) * perPixel));
  const top = Math.max(0, Math.floor((area.top - box.top) * perPixel));
  const bottom = Math.min(canvas.height, Math.ceil((area.bottom - box.top) * perPixel));
  if (right <= left || bottom <= top) return null;
  const pixels = new Uint8Array((right - left) * (bottom - top) * 4);
  // WebGL counts rows from the bottom
  gl.readPixels(left, canvas.height - bottom, right - left, bottom - top, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  return pixels;
}

// Tells the navbar whether the map behind its logo is light (utils/logoBackdrop). The canvas can only be read right
// after it is drawn: on draws while moving (now and then), and on one more draw asked for once the map is still.
function useLogoBackdrop(map: MapLibreMap | null, containerRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!map || !container) return;
    const source = {};
    let lastSample = 0;
    let wanted = false;
    let lastDrawSampled = false;
    const onRender = () => {
      const now = performance.now();
      lastDrawSampled = wanted || now - lastSample >= LOGO_SAMPLE_MS;
      if (!lastDrawSampled) return;
      wanted = false;
      lastSample = now;
      const pixels = pixelsBehindLogo(map, container);
      reportLogoBackdrop(source, pixels && isLightBackdrop(pixels, MAP_BACKGROUND));
    };
    const onIdle = () => {
      if (lastDrawSampled) return;
      wanted = true;
      map.triggerRepaint();
    };
    map.on('render', onRender);
    map.on('idle', onIdle);
    return () => {
      map.off('render', onRender);
      map.off('idle', onIdle);
      reportLogoBackdrop(source, null);
    };
  }, [map, containerRef]);
}

// Panning stops a strip's width (and height) past the survey on every side: room for the pages that keep the strip
// clear of a card or panel covering part of the map
const PAN_LIMIT: Bounds = (() => {
  const [west, south, east, north] = IMAGERY_BOUNDS;
  const [marginX, marginY] = [east - west, north - south];
  return [west - marginX, south - marginY, east + marginX, north + marginY];
})();

// The whole strip, clear of the navbar above and whatever covers the right part of the page (e.g. the map's well
// card). The map, import and monitor pages start from it, so moving between them keeps the map still.
// rightCovered false: nothing covers the right (the map page before a card opens), so the strip is centred.
export function stripFit(viewport: ViewportSize, rightCovered = true): { bounds: Bounds; padding: PaddingOptions } {
  const side = Math.round(viewport.width * 0.06);
  return {
    bounds: IMAGERY_BOUNDS,
    padding: { top: 150, bottom: 40, left: side, right: rightCovered ? Math.round(viewport.width * 0.42) : side },
  };
}

interface TileMapProps {
  // the area shown at first (fitted again, animated, when it changes)
  fit: { bounds: Bounds; padding: PaddingOptions };
  // start here instead of the fitted area (e.g. the map as it was left), and keep it whatever size the map ends up
  camera?: MapCamera;
  // dragging, scrolling and pinching move the map (off for a backdrop)
  interactive?: boolean;
  // darker and greyer imagery, e.g. behind light markers
  muted?: boolean;
  // a click on the map itself (not a drag, nor a click on something drawn over it); event.point is where, on screen
  onMapClick?: (event: MapMouseEvent) => void;
  className?: string;
  // drawn over the map, e.g. pins placed with view.project, in a layer that slides along while the map is panned
  // (useMapLayer); the layer lets clicks through to the map
  children?: (view: MapView) => ReactNode;
  // the map once it has started, for a page drawing over it from elsewhere (with useMapProject)
  onReady?: (map: MapLibreMap) => void;
}

// A real map of the survey: tiles from titiler (see utils/tileServer), with whatever the page draws over it
export default function TileMap({ fit, camera, interactive = false, muted = false, onMapClick, className = '', children, onReady }: TileMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const firstFit = useRef(fit);
  const firstCamera = useRef(camera);
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  // started in the browser only: MapLibre needs the window
  useEffect(() => {
    let created: MapLibreMap | null = null;
    let cancelled = false;
    import('maplibre-gl').then(({ Map, setWorkerUrl }) => {
      if (cancelled || !containerRef.current) return;
      // its worker is served by app/maplibre-worker (the bundler leaves it out)
      setWorkerUrl(MAPLIBRE_WORKER_URL);
      const { bounds, padding } = firstFit.current;
      const start = firstCamera.current;
      created = new Map({
        container: containerRef.current,
        style: mapStyle(muted),
        ...(start ? { center: start.center, zoom: start.zoom } : { bounds, fitBoundsOptions: { padding } }),
        interactive,
        maxBounds: PAN_LIMIT,
        maxZoom: 22.5,
        attributionControl: false,
        renderWorldCopies: false,
      });
      // a start placed off the middle (e.g. a well beside a card): moved there at once, before anything is drawn
      if (start?.offset) created.easeTo({ center: start.center, zoom: start.zoom, offset: start.offset, duration: 0 });
      created.on('click', (event) => onMapClickRef.current?.(event));
      // handed over once its style has loaded, so a page can add its own images, sources and layers to it at once
      const loaded = created;
      loaded.once('style.load', () => {
        if (!cancelled) setMap(loaded);
      });
    });
    return () => {
      cancelled = true;
      created?.remove();
    };
  }, [interactive, muted]);

  // The container may still be growing to its size when the map starts (the page is laid out, scaled, revealed…):
  // until someone drags or zooms, keep the fitted area in view whatever size the map ends up (not when it started
  // from a camera: that view is kept as it is)
  const latestFit = useRef(fit);
  useEffect(() => {
    latestFit.current = fit;
  });
  useEffect(() => {
    const container = containerRef.current;
    if (!map || !container) return;
    let touched = firstCamera.current !== undefined;
    const onMoveStart = (event: { originalEvent?: Event }) => {
      if (event.originalEvent) touched = true;
    };
    map.on('movestart', onMoveStart);
    const observer = new ResizeObserver(() => {
      map.resize();
      if (!touched) map.fitBounds(latestFit.current.bounds, { padding: latestFit.current.padding, duration: 0 });
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      map.off('movestart', onMoveStart);
    };
  }, [map]);

  // a new area to show: move there
  const fitKey = JSON.stringify(fit);
  useEffect(() => {
    if (!map || fitKey === JSON.stringify(firstFit.current)) return;
    const { bounds, padding } = JSON.parse(fitKey) as TileMapProps['fit'];
    map.fitBounds(bounds, { padding, duration: 700 });
  }, [map, fitKey]);

  useEffect(() => {
    if (map) onReady?.(map);
  }, [map, onReady]);

  useLogoBackdrop(map, containerRef);

  return (
    // isolate: what is drawn over the map (e.g. a raised pin) stays under the page's cards and panels
    <div className={`absolute inset-0 isolate overflow-hidden ${className}`} style={{ backgroundColor: `rgb(${MAP_BACKGROUND.join(' ')})` }}>
      {/* MapLibre makes its container position: relative, so it fills this box by size rather than by inset */}
      <div ref={containerRef} className="h-full w-full" />
      {children && map && <Overlay map={map}>{children}</Overlay>}
      {/* the electronic map's source, as its open data licence asks */}
      <p className="pointer-events-none absolute bottom-1.5 right-2 z-10 rounded-sm bg-white/70 px-1.5 text-[11px] leading-5 text-black/70">
        {BASEMAP_ATTRIBUTION}
      </p>
    </div>
  );
}

// Darkens the map towards the right edge, behind the page's panels
export function MapShade() {
  return (
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_left,rgba(3,3,3,0.4)_11.058%,rgba(35,35,35,0.28)_30.288%,rgba(255,255,255,0)_100%)]" />
  );
}
