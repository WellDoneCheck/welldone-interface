'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import type { Map as MapLibreMap, MapMouseEvent, PaddingOptions, RasterSourceSpecification, StyleSpecification, SymbolLayerSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { asWebp, authorizeTile, BASEMAP_ATTRIBUTION, BASEMAP_MAX_ZOOM, BASEMAP_TILES, IMAGERY_TILE_SIZE, throughSite, type Imagery } from '../utils/tileServer';
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
// source (setData) and style the layer. icons may take a while (e.g. an image to load first). Taken off the map again
// when the page using it goes (the map may stay, shared with the next page: see SurveyMap).
export function useIconLayer(
  map: MapLibreMap | null,
  id: string,
  icons: () => Promise<Record<string, Icon>>,
  layout: SymbolLayerSpecification['layout'],
): boolean {
  // the map the layer has been added to: ready only for that map, so a page given another (e.g. a new map started in
  // place of the old) does not style a layer it does not have yet
  const [readyOn, setReadyOn] = useState<MapLibreMap | null>(null);
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
      setReadyOn(map);
    });
    return () => {
      cancelled = true;
      setReadyOn(null);
      // (a removed map has no style left: getLayer finds nothing)
      if (map.getLayer(id)) {
        map.removeLayer(id);
        map.removeSource(id);
      }
    };
  }, [map, id]);
  return map !== null && readyOn === map;
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

// a tile shows as soon as it has loaded, rather than fading in: zooming out, the area just come into view stays empty
// for less long
const RASTER_PAINT = { 'raster-fade-duration': 0 };

// An imported map's imagery, from the backend (§4.4) through the site (throughSite), as WebP (asWebp); outside its
// bounds the backend has no tiles to ask for
const imagerySource = (imagery: Imagery): RasterSourceSpecification => ({
  type: 'raster',
  tiles: imagery.tiles.map((template) => throughSite(asWebp(template), window.location.origin)),
  tileSize: IMAGERY_TILE_SIZE,
  bounds: imagery.bounds,
  minzoom: imagery.minzoom,
  maxzoom: imagery.maxzoom,
});

// The imported map's imagery over the electronic map, which fills in around it (where its tiles are transparent or
// missing); the electronic map alone while there is no imagery.
function mapStyle(imagery: Imagery | null): StyleSpecification {
  return {
    version: 8,
    sources: {
      basemap: { type: 'raster', tiles: [BASEMAP_TILES], tileSize: 256, maxzoom: BASEMAP_MAX_ZOOM, attribution: BASEMAP_ATTRIBUTION },
      ...(imagery && { imagery: imagerySource(imagery) }),
    },
    layers: [
      { id: 'basemap', type: 'raster', source: 'basemap', paint: RASTER_PAINT },
      ...(imagery ? [{ id: 'imagery', type: 'raster' as const, source: 'imagery', paint: RASTER_PAINT }] : []),
    ],
  };
}

// Another imported map's imagery on a map already started (e.g. the survey map, kept from one map to the next)
function showImagery(map: MapLibreMap, imagery: Imagery | null) {
  if (map.getLayer('imagery')) map.removeLayer('imagery');
  if (map.getSource('imagery')) map.removeSource('imagery');
  // under whatever the pages added (pins, markers)
  const firstAdded = map.getStyle().layers.find((layer) => layer.id !== 'basemap')?.id;
  if (imagery) {
    map.addSource('imagery', imagerySource(imagery));
    map.addLayer({ id: 'imagery', type: 'raster', source: 'imagery', paint: RASTER_PAINT }, firstAdded);
  }
  map.setMaxBounds(imagery ? panLimit(imagery.bounds) : null);
}

const MAPLIBRE_WORKER_URL = '/maplibre-worker/maplibre-gl-worker.mjs';

// MapLibre's code (a megabyte) loaded ahead, e.g. for a link into a map page: what to wait for, or null once loaded
let mapLibreLoaded = false;
let mapLibreLoading: Promise<void> | null = null;
export function preloadMapLibre(): Promise<void> | null {
  if (mapLibreLoaded) return null;
  mapLibreLoading ??= import('maplibre-gl').then(() => {
    mapLibreLoaded = true;
  });
  return mapLibreLoading;
}

// The container's colour, seen through the map where no tile covers it (yet): the electronic map's own pale grey ground
const MAP_BACKGROUND: [number, number, number] = [0xf7, 0xf7, 0xf7];

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

// Calls onDrawnAtRest right after the map is drawn, once it has come to rest: the canvas can only be read right after a
// draw, so one more draw is asked for when the map is still. Not while it moves: reading the canvas makes the page wait
// for the graphics card, a hitch on every read.
function useDrawnAtRest(map: MapLibreMap | null, onDrawnAtRest: (() => void) | null) {
  const callback = useRef(onDrawnAtRest);
  useEffect(() => {
    callback.current = onDrawnAtRest;
  });
  const wanted = onDrawnAtRest !== null;
  useEffect(() => {
    if (!map || !wanted) return;
    // asked: the next draw is the one asked for at rest; read: the last draw was it (so the idle that follows it asks
    // for no other)
    let asked = false;
    let read = false;
    const onRender = () => {
      read = asked;
      if (!asked) return;
      asked = false;
      callback.current?.();
    };
    const onIdle = () => {
      if (read) return;
      asked = true;
      map.triggerRepaint();
    };
    map.on('render', onRender);
    map.on('idle', onIdle);
    return () => {
      map.off('render', onRender);
      map.off('idle', onIdle);
    };
  }, [map, wanted]);
}

// Tells the navbar whether the map behind its logo is light (utils/logoBackdrop), each time the map comes to rest
function useLogoBackdrop(map: MapLibreMap | null, containerRef: RefObject<HTMLDivElement | null>) {
  const [source] = useState(() => ({}));
  useDrawnAtRest(map, () => {
    const container = containerRef.current;
    const pixels = map && container && pixelsBehindLogo(map, container);
    reportLogoBackdrop(source, pixels ? isLightBackdrop(pixels, MAP_BACKGROUND) : null);
  });
  useEffect(() => () => reportLogoBackdrop(source, null), [source]);
}

// Panning stops the imagery's width (and height) past it on every side: room for the pages that keep it clear of a
// card or panel covering part of the map
function panLimit([west, south, east, north]: Bounds): Bounds {
  const [marginX, marginY] = [east - west, north - south];
  return [west - marginX, south - marginY, east + marginX, north + marginY];
}

// The whole imagery (its bounds), clear of the navbar above and whatever covers the right part of the page (e.g. the
// map's well card). rightCovered false: nothing covers the right (the map page before a card opens), so it is centred.
export function stripFit(bounds: Bounds, viewport: ViewportSize, rightCovered = true): { bounds: Bounds; padding: PaddingOptions } {
  const side = Math.round(viewport.width * 0.06);
  return {
    bounds,
    padding: { top: 150, bottom: 40, left: side, right: rightCovered ? Math.round(viewport.width * 0.42) : side },
  };
}

interface TileMapProps {
  // the imported map's imagery over the electronic map (changed in place when it changes); none: the electronic map alone
  imagery?: Imagery | null;
  // the area shown at first (fitted again, animated, when it changes)
  fit: { bounds: Bounds; padding: PaddingOptions };
  // start here instead of the fitted area (e.g. the map as it was left), and keep it whatever size the map ends up
  camera?: MapCamera;
  // dragging, scrolling and pinching move the map (off for a backdrop)
  interactive?: boolean;
  // a click on the map itself (not a drag, nor a click on something drawn over it); event.point is where, on screen
  onMapClick?: (event: MapMouseEvent) => void;
  className?: string;
  // drawn over the map, e.g. pins placed with view.project, in a layer that slides along while the map is panned
  // (useMapLayer); the layer lets clicks through to the map
  children?: (view: MapView) => ReactNode;
  // the map once it has started, for a page drawing over it from elsewhere (with useMapProject)
  onReady?: (map: MapLibreMap) => void;
  // shown where the map will be until it has drawn itself (e.g. a picture of it from before), and how long to wait
  // before starting it: a page arriving with a transition keeps the work of starting the map out of its frames
  placeholder?: string;
  startAfter?: number;
}

// A real map: an imported map's tiles from the backend (see utils/tileServer), with whatever the page draws over it
export default function TileMap({
  imagery = null,
  fit,
  camera,
  interactive = false,
  onMapClick,
  className = '',
  children,
  onReady,
  placeholder,
  startAfter = 0,
}: TileMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  // the placeholder stays until the map has drawn itself once with its tiles
  const [drawn, setDrawn] = useState(false);
  const firstStartAfter = useRef(startAfter);
  const firstFit = useRef(fit);
  const firstCamera = useRef(camera);
  // the imagery shown: swapped when it changes
  const shownImagery = useRef(imagery);
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  // started in the browser only: MapLibre needs the window
  useEffect(() => {
    let created: MapLibreMap | null = null;
    let cancelled = false;
    // started at once, or after startAfter
    const startMap = () => {
      import('maplibre-gl').then(({ Map, setWorkerUrl }) => {
        if (cancelled || !containerRef.current) return;
        // its worker is served by app/maplibre-worker (the bundler leaves it out)
        setWorkerUrl(MAPLIBRE_WORKER_URL);
        const { bounds, padding } = firstFit.current;
        const start = firstCamera.current;
        created = new Map({
          container: containerRef.current,
          style: mapStyle(shownImagery.current),
          transformRequest: (url) => authorizeTile(url, window.location.origin),
          ...(start ? { center: start.center, zoom: start.zoom } : { bounds, fitBoundsOptions: { padding } }),
          interactive,
          maxBounds: shownImagery.current ? panLimit(shownImagery.current.bounds) : undefined,
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
        loaded.once('idle', () => {
          if (!cancelled) setDrawn(true);
        });
      });
    };
    const timer = firstStartAfter.current > 0 ? setTimeout(startMap, firstStartAfter.current) : null;
    if (!timer) startMap();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      created?.remove();
    };
  }, [interactive]);

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

  // a new area to show (e.g. another page sharing the map fits it to its own): move there from wherever the map is
  const fitKey = JSON.stringify(fit);
  const shownFitKey = useRef(JSON.stringify(firstFit.current));
  useEffect(() => {
    if (!map || fitKey === shownFitKey.current) return;
    shownFitKey.current = fitKey;
    const { bounds, padding } = JSON.parse(fitKey) as TileMapProps['fit'];
    map.fitBounds(bounds, { padding, duration: 700 });
  }, [map, fitKey]);

  useEffect(() => {
    if (!map || imagery?.tiles[0] === shownImagery.current?.tiles[0]) return;
    shownImagery.current = imagery;
    showImagery(map, imagery);
  }, [map, imagery]);

  useEffect(() => {
    if (map) onReady?.(map);
  }, [map, onReady]);

  useLogoBackdrop(map, containerRef);

  return (
    // isolate: what is drawn over the map (e.g. a raised pin) stays under the page's cards and panels
    <div className={`absolute inset-0 isolate overflow-hidden ${className}`} style={{ backgroundColor: `rgb(${MAP_BACKGROUND.join(' ')})` }}>
      {/* MapLibre makes its container position: relative, so it fills this box by size rather than by inset */}
      <div ref={containerRef} className="h-full w-full" />
      {placeholder && !drawn && (
        // eslint-disable-next-line @next/next/no-img-element -- a picture made in this browser (an object URL), not a file to optimise
        <img src={placeholder} alt="" className="pointer-events-none absolute inset-0 h-full w-full" />
      )}
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
