'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import ModelRender from './ModelRender';
import ExportEntry from './ExportEntry';
import CompareEntry from './CompareEntry';
import PinEntry from './PinEntry';
import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent, MapMouseEvent } from 'maplibre-gl';
import { drawIcon, iconAt, pointFeatures, stripFit, useIconLayer, useMapLayer, useMapProject, type Bounds, type Icon, type Project } from './TileMap';
import { useSurveyMap, useUnderMapShade } from './SurveyMap';
import { TILE_COLOR, useTileProgressLayer } from './useTileProgressLayer';
import { useRecognisedWells } from './useRecognisedWells';
import { useCheckLink, usePrefetchCheckView } from './useCheckView';
import { ButtonIcon, EXPAND_PATH, ExpandedView, ImageButton, MarkerIcon, WellMarkerPin } from './CompareImage';
import { useCutImagery } from './useCutImagery';
import { useBackendImage } from './useBackendImage';
import type { TileState } from '../utils/tileProgress';
import { pinScaleExpression, pinZoomScale } from '../utils/pinZoomScale';
import { popDelay, popDuration, popOrder, unsettledIds } from '../utils/pinPop';
import { lastMapZoom, mapCameraFor, mapImageFor, projectWithCamera, rememberMapCamera, rememberMapImage, type MapCamera } from '../utils/mapCamera';
import SharedTransition, {
  BACK_TO_UPLOAD,
  SHARED,
  TO_CHECK,
  markBackToUpload,
  clearOpeningMap,
  isOpeningMap,
  pagePart,
} from './SharedTransition';
import BackToMapLink from './BackToMapLink';
import CursorCoordinates from './CursorCoordinates';
import { mapHref } from '../utils/routeRecords';
import { useWellVerdicts } from './useWellVerdicts';
import { canVerify, lookOf, saveVerdict, VERDICT_COLOR, verdictOf, type VerdictLook } from '../utils/wellVerdicts';
import { canClearRecognition, canDelete, canRetry, clearRecognition, retryRecognition, type NamedTask, type Task } from '../utils/tasks';
import { useSiteChrome } from './SiteChrome';
import { TAIWAN_BOUNDS, type Imagery } from '../utils/tileServer';
import { addWell, canAddWell, confidenceText, coordinatesText, isOnImagery, removeWell, wellImageUrl, type MapWell, type Verdict } from '../utils/wells';
import { CAPTURE_IMAGE_SIZE } from '../utils/captures';
import { rememberVisit } from '../utils/lastVisit';
import { useFitScale, type FitStage } from './useFitScale';
import { CONTENT_TOP, FRAME_MARGIN_Y, PAGE_GAP, PAGE_GUTTER, useViewportSize } from './pageFrame';

const CARD_WIDTH = 680;
// with a row under the time for the AI's confidence (35px, after the rows' 13px gap)
const CARD_HEIGHT = 917;
// Type and card scale with the window width like the 1920px Figma frame, but the card must also fit under the navbar
const OVERLAY_STAGE: FitStage = { width: 1920, height: CARD_HEIGHT, marginX: 0, marginY: FRAME_MARGIN_Y, minViewportWidth: 0 };
// The view tabs stick out this far past the card's right edge; the tabs' outer edge lines up with the navbar
const TAB_OVERHANG = 55;
const CARD_ID = 'well-card';
// The aerial photo's side, in the card's pixels
const PHOTO_SIZE = 640;

// A pin (a square image whose tip is 85% of the way down) is this big at the page's scale, like in the Figma frame
const PIN_SIZE = 90;
const PIN_TIP = 0.85;
// Leader line in the page's Figma pixels: it leaves the pin this far right of and below the pin's top-left corner,
// rises to a peak, then runs to the card, meeting its left edge this far below the card's top
const LEADER = { fromPin: { x: 107, y: 43 }, rise: 82, cardOffsetY: 98 };

// Top-left corner of a well's pin on screen: the pin's tip stands on the well. pinScale: the pin's size (see pinScaleOn).
function pinCorner(record: MapWell, project: Project, pinScale: number) {
  const tip = project(record);
  return { x: tip.x - (PIN_SIZE * pinScale) / 2, y: tip.y - PIN_SIZE * pinScale * PIN_TIP };
}

// How large the pins are drawn: the page's scale, and smaller the further the map is zoomed out
function pinScaleOn(map: MapLibreMap, scale: number) {
  return scale * pinZoomScale(map.getZoom());
}

// The page transition to the check page zooms the map in on the selected pin's tip (--well-focus in globals.css).
// Set when the pin is selected and whenever the map comes to rest, not on every frame of a drag: a property on the
// root makes the browser restyle the whole page.
function ZoomFocus({ record, map }: { record: MapWell; map: MapLibreMap }) {
  useLayoutEffect(() => {
    const update = () => {
      const tip = map.project([record.longitude, record.latitude]);
      document.documentElement.style.setProperty('--well-focus', `${tip.x}px ${tip.y}px`);
    };
    update();
    map.on('moveend', update);
    return () => {
      map.off('moveend', update);
    };
  }, [record, map]);
  return null;
}

type ViewMode = 'aerial' | 'model';

// Each tab keeps its own color; the selected one sticks out further
const VIEW_TABS: { mode: ViewMode; label: string; top: string; color: string }[] = [
  { mode: 'aerial', label: '空拍圖', top: 'top-[34px]', color: 'bg-[#62A4A7]' },
  { mode: 'model', label: '立體圖', top: 'top-[217px]', color: 'bg-[#BC5646]' },
];

// The card slides in this long after arriving from the import page
const ARRIVAL_CARD_DELAY_MS = 400;

// Coming back from the check page to the map as it was left, the map is a picture of it until the page transition is
// over (globals.css: 650-750ms) and only then started, so the work of starting it stays out of the transition's frames
const RETURN_MAP_START_MS = 800;
// Opening the map from its upload record, the map starts once the row has grown into it (globals.css: 750ms); until
// then the row grows into the map's bare ground
const OPEN_MAP_START_MS = 800;

// Clicking a pin zooms in to at least this level (never out), with the pin in the middle of the map left of the card
const PIN_FOCUS_ZOOM = 21;
const PIN_FOCUS_MS = 800;

// Where the open card (with its tabs) begins on screen, from the left
function cardLeft(viewportWidth: number, scale: number) {
  return viewportWidth - PAGE_GUTTER - (TAB_OVERHANG + CARD_WIDTH) * scale;
}

/* ─── Map layer ─────────────────────────────────────────────────── */

// Every well's pin is drawn by the map itself, as a symbol layer: it moves and scales with the map on the graphics card,
// where a hundred pins laid out by the page would all have to be placed again on every frame of a zoom. Only the
// selected pin (raised, pinging) and the label of the pin under the pointer are page elements.
const WELL_LAYER = 'wells';
// A pin per verification: the pin's own red until verified, then teal for a well and grey for not one (VERDICT_COLOR)
const PIN_IMAGE: Record<VerdictLook, string> = { pending: 'well-pin', well: 'well-pin-well', 'not-well': 'well-pin-not-well' };
// Room around the pin in its image for the drop shadow drawn in with it
const PIN_SHADOW_ROOM = 18;
// The image's centre (the pin's) from the well, in the image's pixels: its tip, PIN_TIP down the pin, on the well
const PIN_OFFSET: [number, number] = [0, PIN_SIZE * (0.5 - PIN_TIP)];

// The pin (one flat colour) filled with another colour, keeping its shape and soft edges
function tintedPin(pin: HTMLImageElement, color: string | null): CanvasImageSource {
  if (!color) return pin;
  const canvas = document.createElement('canvas');
  canvas.width = pin.naturalWidth;
  canvas.height = pin.naturalHeight;
  const context = canvas.getContext('2d')!;
  context.drawImage(pin, 0, 0);
  context.globalCompositeOperation = 'source-in';
  context.fillStyle = color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

// The pins with the drop shadow the page's pins have (drop-shadow 0 6px 6px), centred in room for it
async function shadowedPins(): Promise<Record<string, Icon>> {
  const pin = new window.Image();
  pin.src = '/map/pin.png';
  await pin.decode();
  const icon = (color: string | null) =>
    drawIcon(PIN_SIZE + 2 * PIN_SHADOW_ROOM, (context) => {
      context.shadowColor = 'rgba(0, 0, 0, 0.35)';
      context.shadowBlur = 12;
      context.shadowOffsetY = 6;
      context.drawImage(tintedPin(pin, color), PIN_SHADOW_ROOM, PIN_SHADOW_ROOM, PIN_SIZE, PIN_SIZE);
    });
  return {
    [PIN_IMAGE.pending]: icon(null),
    [PIN_IMAGE.well]: icon(VERDICT_COLOR.well),
    [PIN_IMAGE['not-well']]: icon(VERDICT_COLOR['not-well']),
  };
}

// The pin icons, drawn once: for the map's layer, and as images for the pins popping in over it (the very same pixels,
// so a pin looks just the same before and after it lands)
let pinIcons: Promise<Record<string, Icon>> | null = null;
const loadPinIcons = () => (pinIcons ??= shadowedPins());
let pinIconUrls: Promise<Record<string, string>> | null = null;

function iconUrl({ image }: Icon): string {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  canvas.getContext('2d')!.putImageData(image, 0, 0);
  return canvas.toDataURL();
}

// The pin icons as image URLs, by icon name; null until drawn
function usePinIconUrls(): Record<string, string> | null {
  const [urls, setUrls] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    let current = true;
    pinIconUrls ??= loadPinIcons().then((icons) => Object.fromEntries(Object.entries(icons).map(([name, icon]) => [name, iconUrl(icon)])));
    pinIconUrls.then((drawn) => {
      if (current) setUrls(drawn);
    });
    return () => {
      current = false;
    };
  }, []);
  return urls;
}

const wellFeatures = (wells: MapWell[], verdicts: ReturnType<typeof useWellVerdicts>) =>
  pointFeatures(wells, (well) => ({ id: well.id, look: lookOf(verdictOf(well, verdicts)) }));

// Room around the map within which a pin coming onto it still pops in (one standing just outside, reaching in)
const POP_SCREEN_MARGIN = PIN_SIZE;

// The pins of the wells left out of the map's layer (hidden), split by popOrder: those on screen in the order they pop
// in, spreading out from the focused well (or the map's middle), and those off it
function popBatch(map: MapLibreMap, wells: MapWell[], hidden: string[], focusId: string | null) {
  const container = map.getContainer();
  const pins = wells.filter((well) => hidden.includes(well.id)).map((well) => ({ id: well.id, ...map.project([well.longitude, well.latitude]) }));
  const focus = pins.find((pin) => pin.id === focusId) ?? { x: container.clientWidth / 2, y: container.clientHeight / 2 };
  return popOrder(pins, focus, { width: container.clientWidth, height: container.clientHeight }, POP_SCREEN_MARGIN);
}

// The pins popping in: page elements, one after another, for those the map's layer does not draw yet (all of them at
// first, coming back from a check page too; later only new ones, e.g. a well placed by hand). Only while the map is
// drawn and at rest: until it has drawn itself a picture of it may stand in, the pins in it; while it moves (fitted to
// the imagery, the camera put back…) where a pin is on screen is not where it will be, and one counted off screen would
// come in unpopped. Gives back those popping in and those left out of the layer: each from the render it comes in
// (never drawn by the map for a frame first), until it has landed; the page elements then stay until the map has drawn
// them (it lays its pins out again first: going at once, they would be gone for a few frames).
function usePoppingPins(map: MapLibreMap | null, ready: boolean, wells: MapWell[], focusId: string | null): { popping: string[]; hidden: string[] } {
  const [restingOn, setRestingOn] = useState<MapLibreMap | null>(null);
  // the pins the map's layer draws
  const [settled, setSettled] = useState<ReadonlySet<string>>(() => new Set());
  const [popping, setPopping] = useState<string[]>([]);
  const hidden = useMemo(() => unsettledIds(wells.map((well) => well.id), settled), [wells, settled]);
  const atRest = map !== null && restingOn === map;
  const landed = popping.length > 0 && popping.every((id) => settled.has(id));
  // those come in while others are popping in go once these have
  if (map && atRest && hidden.length && !popping.length) {
    const { onScreen, offScreen } = popBatch(map, wells, hidden, focusId);
    if (onScreen.length) setPopping(onScreen);
    if (offScreen.length) setSettled((before) => new Set([...before, ...offScreen]));
  }

  useEffect(() => {
    if (!ready || !map) return;
    const rest = () => setRestingOn(map);
    const move = () => setRestingOn(null);
    map.on('idle', rest);
    map.on('movestart', move);
    return () => {
      map.off('idle', rest);
      map.off('movestart', move);
    };
  }, [ready, map]);

  useEffect(() => {
    if (!popping.length) return;
    const timer = setTimeout(() => setSettled((before) => new Set([...before, ...popping])), popDuration(popping.length));
    return () => clearTimeout(timer);
  }, [popping]);

  // set up before the layer takes them back (the effect after this hook's), so the map is idle only once it has drawn them
  useEffect(() => {
    if (!map || !landed) return;
    const drawn = () => setPopping([]);
    map.once('idle', drawn);
    return () => {
      map.off('idle', drawn);
    };
  }, [map, landed]);

  return { popping, hidden };
}

const REST_IMAGE_LAYER = 'rest-image';

// A picture of the map each time it comes to rest, without its pins: drawn by a layer of the map's just under the pins,
// which copies the map drawn so far. Coming back from a well's check page it stands in for the map until that has
// started, and the pins then all pop in over it (with the pins in it, those would be there first). The canvas can only
// be read while it is drawn, so one more draw is asked for once the map is still; not while it moves (reading it makes
// the page wait for the graphics card, a hitch on every read).
function useRestImageUnderPins(map: MapLibreMap | null, onImage: ((image: Blob) => void) | null) {
  const callback = useRef(onImage);
  useEffect(() => {
    callback.current = onImage;
  });
  const wanted = onImage !== null;
  useEffect(() => {
    if (!map || !wanted) return;
    // asked: the next draw is copied; copied: the last one was (so the idle that follows it asks for no other)
    let asked = false;
    let copied = false;
    const copy = () => {
      const canvas = map.getCanvas();
      const picture = document.createElement('canvas');
      picture.width = canvas.clientWidth;
      picture.height = canvas.clientHeight;
      picture.getContext('2d')!.drawImage(canvas, 0, 0, picture.width, picture.height);
      picture.toBlob((image) => image && callback.current?.(image), 'image/webp', 0.85);
    };
    const addLayer = () => {
      if (map.getLayer(REST_IMAGE_LAYER) || !map.getLayer(WELL_LAYER)) return;
      map.addLayer(
        {
          id: REST_IMAGE_LAYER,
          type: 'custom',
          render: () => {
            if (!asked) return;
            asked = false;
            copied = true;
            copy();
          },
        },
        WELL_LAYER,
      );
    };
    const onIdle = () => {
      addLayer();
      if (copied) {
        copied = false;
        return;
      }
      asked = true;
      map.triggerRepaint();
    };
    map.on('idle', onIdle);
    return () => {
      map.off('idle', onIdle);
      if (map.getLayer(REST_IMAGE_LAYER)) map.removeLayer(REST_IMAGE_LAYER);
    };
  }, [map, wanted]);
}

// The map's layer of pins: every well but the selected one and those popping in (page elements), at the page's scale
// and smaller the further out (pinScaleExpression). onHover: the well under the pointer, or null (never while hoverable
// is false). Gives back the wells popping in (usePoppingPins).
function useWellPinLayer(map: MapLibreMap | null, wells: MapWell[], selectedId: string | null, scale: number, hoverable: boolean, onHover: (id: string | null) => void) {
  const ready = useIconLayer(map, WELL_LAYER, loadPinIcons, {
    'icon-image': ['match', ['get', 'look'], 'well', PIN_IMAGE.well, 'not-well', PIN_IMAGE['not-well'], PIN_IMAGE.pending],
    'icon-offset': PIN_OFFSET,
  });
  // each pin in its well's verification colour, again as wells are verified (here, on the check or export page)
  const verdicts = useWellVerdicts();

  useEffect(() => {
    if (ready && map) (map.getSource(WELL_LAYER) as GeoJSONSource).setData(wellFeatures(wells, verdicts));
  }, [ready, map, wells, verdicts]);

  const { popping, hidden } = usePoppingPins(map, ready, wells, selectedId);
  useEffect(() => {
    if (ready && map) map.setFilter(WELL_LAYER, ['!', ['in', ['get', 'id'], ['literal', [selectedId ?? '', ...hidden]]]]);
  }, [ready, map, selectedId, hidden]);

  useEffect(() => {
    if (ready && map) map.setLayoutProperty(WELL_LAYER, 'icon-size', pinScaleExpression(scale));
  }, [ready, map, scale]);

  useEffect(() => {
    if (!ready || !map || !hoverable) return;
    const enter = (event: MapLayerMouseEvent) => {
      map.getCanvas().style.cursor = 'pointer';
      onHover(event.features?.[0]?.properties?.id ?? null);
    };
    const leave = () => {
      map.getCanvas().style.cursor = '';
      onHover(null);
    };
    map.on('mousemove', WELL_LAYER, enter);
    map.on('mouseleave', WELL_LAYER, leave);
    return () => {
      map.off('mousemove', WELL_LAYER, enter);
      map.off('mouseleave', WELL_LAYER, leave);
      // the map may stay for the next page (SurveyMap): not left with this page's pointer, nor a label
      map.getCanvas().style.cursor = '';
      onHover(null);
    };
  }, [ready, map, hoverable, onHover]);

  return popping;
}

interface MapCanvasProps {
  // the wells of the imported map shown, one pin each, over its imagery (null: not cut yet)
  wells: MapWell[];
  imagery: Imagery | null;
  // the whole image, shown while its imagery cannot be yet (null: not known either)
  area: Bounds | null;
  // null while no well is selected
  selected: MapWell | null;
  cardOpen: boolean;
  // the card is open, or about to open, as the page arrives: the strip starts clear of it (otherwise centred)
  startsWithCard: boolean;
  // the map as it was left, when coming back to it (otherwise it starts on the whole strip)
  startCamera: MapCamera | null;
  // or else a well to start zoomed in on, as a clicked pin is, this close (e.g. one picked on the export page)
  startFocus: { well: MapWell; zoom: number } | null;
  // a picture of the map at startCamera, shown while the map starts after the page transition
  startImage: string | null;
  // arrived from its upload record: the map starts once the row has grown into it
  openedFromUpload: boolean;
  // the map, once it has started (kept by the page, which shows where the pointer is on it)
  onMapReady: (map: MapLibreMap | null) => void;
  scale: number;
  onPinClick: (id: string) => void;
  onDismiss: () => void;
  // the next click on the map places a well (on a pin too): a crosshair, and no pin is picked or labelled
  placing: boolean;
  // a click on the map off the pins (anywhere while placing), where it was
  onGroundClick: (at: GroundClick) => void;
  // a right click on a well's pin, where it was on screen: true when it opens a menu of the page's (not the browser's)
  onPinMenu: (well: MapWell, point: { x: number; y: number }) => boolean;
  // a right click on the map off the pins, where it was on screen and on the ground: true as for onPinMenu
  onGroundMenu: (at: { x: number; y: number; longitude: number; latitude: number }) => boolean;
}

// The survey map (shared with the compare page: SurveyMap) with a pin on every well; the pins and the line to the card
// follow the map as it is dragged and zoomed
function MapCanvas({ wells, imagery, area, selected, cardOpen, startsWithCard, startCamera, startFocus, startImage, openedFromUpload, onMapReady, scale, onPinClick, onDismiss, placing, onGroundClick, onPinMenu, onGroundMenu }: MapCanvasProps) {
  const viewport = useViewportSize();
  // from the map's middle to the middle of the space left of the card and under the navbar, where a focused well goes
  // (an offset, not padding: padding would stay on the map and shift every later fit)
  const focusOffset: [number, number] = [cardLeft(viewport.width, scale) / 2 - viewport.width / 2, CONTENT_TOP / 2];
  const camera =
    startCamera ??
    (startFocus ? { center: [startFocus.well.longitude, startFocus.well.latitude] as [number, number], zoom: startFocus.zoom, offset: focusOffset } : undefined);
  const selectedId = selected?.id;

  const map = useSurveyMap({
    imagery,
    // the whole imagery; while there is none yet the area it is being cut from, or Taiwan
    fit: stripFit(imagery?.bounds ?? area ?? TAIWAN_BOUNDS, viewport, startsWithCard),
    camera,
    placeholder: startImage ?? undefined,
    startAfter: startImage ? RETURN_MAP_START_MS : openedFromUpload ? OPEN_MAP_START_MS : 0,
    onMapClick: (event) => onMapClick(event),
  });
  useEffect(() => onMapReady(map), [map, onMapReady]);

  // where the map is left, with the well selected then: coming back from its check page shows it just so
  useEffect(() => {
    if (!map || !selectedId) return;
    const remember = () => {
      const center = map.getCenter();
      rememberMapCamera(selectedId, { center: [center.lng, center.lat], zoom: map.getZoom() });
    };
    remember();
    map.on('moveend', remember);
    return () => {
      map.off('moveend', remember);
    };
  }, [map, selectedId]);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const poppingWellIds = useWellPinLayer(map, wells, selectedId ?? null, scale, !placing, setHoveredId);
  // a picture of where the map is left with a well, for coming back to it from its check page
  useRestImageUnderPins(map, selectedId ? (image) => rememberMapImage(selectedId, image) : null);
  // in the order they pop in (the selected one, first, is a page element of its own)
  const popping = poppingWellIds.flatMap((id) => (id === selectedId ? [] : wells.filter((well) => well.id === id)));
  const pinIconUrls = usePinIconUrls();
  // under the map's shade, as the map's own pins are, so they look the same before and after they land
  const underShade = useUnderMapShade();
  const hovered = hoveredId === selectedId ? undefined : wells.find((well) => well.id === hoveredId);

  // a pin opening its card: bring it into the space left of the card, zoomed in
  const focusPin = (record: MapWell) => {
    map?.easeTo({
      center: [record.longitude, record.latitude],
      zoom: Math.max(map.getZoom(), PIN_FOCUS_ZOOM),
      offset: focusOffset,
      duration: PIN_FOCUS_MS,
    });
  };

  // the user moving the map closes the card: a drag, pinch, double-click or key (their movestart carries the input
  // event), or the scroll wheel (whose zoom's movestart does not, so its own event). The map's own moves, zooming in
  // on a clicked pin or fitting a resized window, leave it open.
  useEffect(() => {
    if (!map) return;
    const onMoveStart = (event: { originalEvent?: Event }) => {
      if (event.originalEvent) onDismiss();
    };
    map.on('movestart', onMoveStart);
    map.on('wheel', onDismiss);
    return () => {
      map.off('movestart', onMoveStart);
      map.off('wheel', onDismiss);
    };
  }, [map, onDismiss]);

  // a pin clicked: select its well (the selected pin with its card open closes the card instead)
  const pickPin = (well: MapWell) => {
    if (!(well.id === selectedId && cardOpen)) focusPin(well);
    onPinClick(well.id);
  };

  // placing a well, a crosshair over the whole map
  useEffect(() => {
    if (!map || !placing) return;
    const canvas = map.getCanvas();
    canvas.style.cursor = 'crosshair';
    return () => {
      canvas.style.cursor = '';
    };
  }, [map, placing]);

  // a right click on a pin the map drew, or off the pins: the page's menu there, instead of the browser's
  useEffect(() => {
    if (!map) return;
    const onContextMenu = (event: MapMouseEvent) => {
      const id = iconAt(map, WELL_LAYER, event.point, 'id');
      const well = wells.find((candidate) => candidate.id === id);
      const opened = well ? onPinMenu(well, event.point) : onGroundMenu({ ...event.point, longitude: event.lngLat.lng, latitude: event.lngLat.lat });
      if (opened) event.originalEvent.preventDefault();
    };
    map.on('contextmenu', onContextMenu);
    return () => {
      map.off('contextmenu', onContextMenu);
    };
  }, [map, wells, onPinMenu, onGroundMenu]);

  // a click on the map: on a pin it drew, that pin (unless placing); anywhere else, closes the card
  function onMapClick(event: MapMouseEvent) {
    const id = map && !placing ? iconAt(map, WELL_LAYER, event.point, 'id') : undefined;
    const well = wells.find((candidate) => candidate.id === id);
    if (well) return pickPin(well);
    onDismiss();
    onGroundClick({ ...event.point, longitude: event.lngLat.lng, latitude: event.lngLat.lat, pinSize: map ? PIN_SIZE * pinScaleOn(map, scale) : 0 });
  }

  return (
    <>
      {map &&
        underShade &&
        pinIconUrls &&
        popping.length > 0 &&
        createPortal(
          <PinOverlay map={map}>
            {(project) =>
              popping.map((well) => (
                <PoppingPin
                  key={well.id}
                  well={well}
                  iconUrls={pinIconUrls}
                  corner={pinCorner(well, project, pinScaleOn(map, scale))}
                  pinScale={pinScaleOn(map, scale)}
                  delay={popDelay(poppingWellIds.indexOf(well.id), poppingWellIds.length)}
                />
              ))
            }
          </PinOverlay>,
          underShade,
        )}
      {map && (selected || hovered) && (
        <PinOverlay map={map}>
          {(project) => (
            <>
              {selected && <ZoomFocus record={selected} map={map} />}
              {selected && (
                <WellMarker
                  record={selected}
                  corner={pinCorner(selected, project, pinScaleOn(map, scale))}
                  size={PIN_SIZE * pinScaleOn(map, scale)}
                  cardOpen={cardOpen}
                  popIn={poppingWellIds.includes(selected.id)}
                  onClick={() => pickPin(selected)}
                  onContextMenu={(event) => {
                    if (onPinMenu(selected, { x: event.clientX, y: event.clientY })) event.preventDefault();
                  }}
                />
              )}
              {hovered && <PinLabel well={hovered} corner={pinCorner(hovered, project, pinScaleOn(map, scale))} size={PIN_SIZE * pinScaleOn(map, scale)} />}
            </>
          )}
        </PinOverlay>
      )}
      {/* the pins the map draws, as buttons for the keyboard and screen readers (the selected one is a page element) */}
      <div className="sr-only">
        {wells
          .filter((well) => well.id !== selectedId)
          .map((well) => (
            <button key={well.id} type="button" aria-label={`水井 ${well.id}`} aria-controls={CARD_ID} onClick={() => pickPin(well)} />
          ))}
      </div>
      {/* until the map has started, the selected pin where the map will put it (the picture has the others) */}
      {!map && startCamera && selected && (
        <StillPin well={selected} camera={startCamera} size={viewport} scale={scale} cardOpen={cardOpen} onClick={() => pickPin(selected)} />
      )}
      {/* keyed by well, so the line draws out again from each newly selected pin */}
      {cardOpen && map && selected && <LeaderLine key={selected.id} map={map} record={selected} scale={scale} />}
    </>
  );
}

// What follows the map as page elements over it: slid along while the map is panned, placed afresh when it comes to
// rest or zooms (useMapLayer)
function PinOverlay({ map, children }: { map: MapLibreMap; children: (project: Project) => ReactNode }) {
  const { project, layerRef } = useMapLayer(map);
  return (
    <div ref={layerRef} className="pointer-events-none absolute inset-0 will-change-transform">
      {children(project)}
    </div>
  );
}

interface WellMarkerProps {
  record: MapWell;
  corner: { x: number; y: number };
  size: number;
  cardOpen: boolean;
  // popping in with the map's pins as the map first shows them (not when a pin is picked later)
  popIn?: boolean;
  onClick: () => void;
  onContextMenu?: (event: ReactMouseEvent) => void;
}

// A pin coming onto the map (pin-pop in globals.css, PIN_POP_MS long)
const PIN_POP_ANIMATION = 'animate-[pin-pop_600ms_ease-out_both] motion-reduce:animate-none';

// The selected well's pin, a page element (the others are drawn by the map); clicking it toggles its card. Coloured
// by its verification as the map's pins are: the pin image itself while not verified, its shape filled otherwise.
function WellMarker({ record, corner, size, cardOpen, popIn = false, onClick, onContextMenu }: WellMarkerProps) {
  const active = cardOpen;
  const look = lookOf(verdictOf(record, useWellVerdicts()));
  const pinClass = `relative h-auto w-full max-w-none drop-shadow-[0_6px_6px_rgba(0,0,0,0.35)] transition-transform duration-300 ${MOTION} group-hover:-translate-y-1.5 ${
    active ? '-translate-y-1.5 scale-110' : ''
  }`;
  return (
    <button
      type="button"
      aria-label={`水井 ${record.id}`}
      aria-expanded={active}
      aria-controls={CARD_ID}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`group pointer-events-auto absolute cursor-pointer ${active ? 'z-10' : ''}`}
      style={{ left: corner.x, top: corner.y, width: size }}
    >
      {/* ping on the selected well's ground point while its card is closed */}
      {!cardOpen && (
        <span className="absolute bottom-[6%] left-1/2 h-2 w-6 -translate-x-1/2 rounded-full bg-white/70 animate-ping motion-reduce:hidden" />
      )}
      {/* the well's id above the pin on hover */}
      <span className={`${PIN_LABEL} opacity-0 transition-opacity duration-200 group-hover:opacity-100`}>{record.id}</span>
      <span className={`block origin-[50%_85%] ${popIn ? PIN_POP_ANIMATION : ''}`}>
        {look === 'pending' ? (
          <Image
            src="/map/pin.png"
            alt=""
            width={90}
            height={90}
            // not dragged off as an image: the pin stays put on the map
            draggable={false}
            className={pinClass}
          />
        ) : (
          <span className={`block aspect-square ${pinClass}`}>
            <span
              className="absolute inset-0 [mask-image:url(/map/pin.png)] [mask-size:100%_100%]"
              style={{ backgroundColor: VERDICT_COLOR[look] }}
            />
          </span>
        )}
      </span>
    </button>
  );
}

interface PoppingPinProps {
  well: MapWell;
  // the map's own pin icons (usePinIconUrls), shadow and all
  iconUrls: Record<string, string>;
  corner: { x: number; y: number };
  pinScale: number;
  // ms before it starts popping in (hidden until then)
  delay: number;
}

// The pin's icon, its room for the shadow included, and the pin's tip in it (where it lands and squashes)
const PIN_ICON_SIDE = PIN_SIZE + 2 * PIN_SHADOW_ROOM;
const PIN_ICON_TIP = `50% ${((PIN_SHADOW_ROOM + PIN_SIZE * PIN_TIP) / PIN_ICON_SIDE) * 100}%`;

// A pin just come onto the map, popping in as a page element in the map's own icon (the map draws it once it has
// landed)
function PoppingPin({ well, iconUrls, corner, pinScale, delay }: PoppingPinProps) {
  const look = lookOf(verdictOf(well, useWellVerdicts()));
  return (
    // eslint-disable-next-line @next/next/no-img-element -- the map's icon, drawn on a canvas, as it is (not re-encoded)
    <img
      src={iconUrls[PIN_IMAGE[look]]}
      alt=""
      draggable={false}
      className={`absolute max-w-none ${PIN_POP_ANIMATION}`}
      style={{
        left: corner.x - PIN_SHADOW_ROOM * pinScale,
        top: corner.y - PIN_SHADOW_ROOM * pinScale,
        width: PIN_ICON_SIDE * pinScale,
        // the lower on screen, the further in front, as the map stacks its own pins (symbol-z-order auto: by y)
        zIndex: Math.round(corner.y),
        transformOrigin: PIN_ICON_TIP,
        animationDelay: `${delay}ms`,
      }}
    />
  );
}

// A pin in a verification's colour, as the map draws it: its own red until verified, its shape filled otherwise
function PinSwatch({ look, size }: { look: VerdictLook; size: number }) {
  if (look === 'pending') return <Image src="/map/pin.png" alt="" width={size} height={size} draggable={false} className="shrink-0" />;
  return (
    <span
      className="block shrink-0 [mask-image:url(/map/pin.png)] [mask-size:100%_100%]"
      style={{ width: size, height: size, backgroundColor: VERDICT_COLOR[look] }}
    />
  );
}

const LEGEND: { look: VerdictLook; label: string }[] = [
  { look: 'pending', label: '未驗證' },
  { look: 'well', label: '已驗證：是井' },
  { look: 'not-well', label: '已驗證：不是井' },
];

// The tiles not cut yet while the map is cut, then those the AI has still to recognise
const TILE_LEGEND: { state: TileState; label: string }[] = [
  { state: 'uncut', label: '尚未切圖' },
  { state: 'processing', label: '辨識中' },
  { state: 'failed', label: '失敗' },
  { state: 'pending', label: '等待辨識' },
];

function TileSwatch({ state }: { state: TileState }) {
  return (
    <span
      className={`h-[26px] w-[26px] shrink-0 border-2 ${state === 'processing' ? 'animate-pulse motion-reduce:animate-none' : ''}`}
      style={{ borderColor: TILE_COLOR[state], backgroundColor: `${TILE_COLOR[state]}${state === 'pending' || state === 'uncut' ? '2E' : '73'}` }}
    />
  );
}

// The compare page's stage, whose scale its corners (the export shortcut, the legend) are drawn at: this page's corners
// are the same size, so moving between the two pages they stay put
const CORNER_STAGE: FitStage = { width: 1920, height: 1080, marginX: 0, marginY: 0, minViewportWidth: 0 };

// What the pins' colours mean, in the corner the card covers: shown while no card is, fading out as one opens and back
// in as it closes. Where and as large as the compare page's legend: against the navbar's right edge, just above the
// window's bottom.
// tiles: how many of the map's tiles are drawn in each state (null while none are)
function MapLegend({ hidden, tiles }: { hidden: boolean; tiles: Record<TileState, number> | null }) {
  const scale = useFitScale(CORNER_STAGE);
  return (
    <div
      aria-hidden={hidden}
      // as the site's other page parts come and go (page-part in globals.css): fades out where it is, then is moved down
      // out of sight; once the card has slid away, fades back in rising
      className={`group absolute motion-reduce:transition-none ${
        hidden
          ? 'translate-y-[14px] opacity-0 [transition:opacity_260ms_ease-in,translate_0s_260ms]'
          : 'pointer-events-auto translate-y-0 opacity-100 [transition:opacity_520ms_cubic-bezier(0.22,1,0.36,1)_220ms,translate_520ms_cubic-bezier(0.22,1,0.36,1)_220ms]'
      }`}
      style={{ ...pagePart('map-legend'), right: PAGE_GUTTER, bottom: PAGE_GAP }}
    >
      {/* only the contents lift on hover, like the shortcuts in the other corner */}
      <div
        className={`flex flex-col gap-[14px] bg-[#F7F6F1]/92 py-[22px] pl-[26px] pr-[32px] shadow-[0_4px_20px_8px_rgba(0,0,0,0.5)] transition-transform duration-500 ${MOTION} group-hover:-translate-y-1`}
        style={{ zoom: scale }}
      >
        <span className="text-[18px] font-bold text-[#6F7468]">圖例</span>
        {LEGEND.map((entry) => (
          <span key={entry.look} className="flex items-center gap-[12px] text-[21px] font-bold text-[#2C322F]">
            <PinSwatch look={entry.look} size={30} />
            {entry.label}
          </span>
        ))}
        {tiles && (
          <>
            <span className="mt-[8px] text-[18px] font-bold text-[#6F7468]">小圖進度</span>
            {TILE_LEGEND.filter((entry) => tiles[entry.state] > 0).map((entry) => (
              <span key={entry.state} className="flex items-center gap-[12px] text-[21px] font-bold text-[#2C322F]">
                <TileSwatch state={entry.state} />
                {entry.label}
                <span className="ml-auto pl-[12px] tabular-nums text-[#6F7468]">{tiles[entry.state]}</span>
              </span>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// The selected pin before the map has started, placed by the camera it will start at
function StillPin({ well, camera, size, scale, cardOpen, onClick }: { well: MapWell; camera: MapCamera; size: { width: number; height: number }; scale: number; cardOpen: boolean; onClick: () => void }) {
  const pinScale = scale * pinZoomScale(camera.zoom);
  return (
    <div className="pointer-events-none absolute inset-0">
      <WellMarker
        record={well}
        corner={pinCorner(well, (point) => projectWithCamera(camera, size, point), pinScale)}
        size={PIN_SIZE * pinScale}
        cardOpen={cardOpen}
        onClick={onClick}
      />
    </div>
  );
}

// The id above a well's pin, as over a page element pin on hover
const PIN_LABEL =
  'pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap bg-[#2C322F]/85 px-2 py-0.5 text-[13px] font-bold text-white';

// The id of the pin under the pointer, for a pin the map draws
function PinLabel({ well, corner, size }: { well: MapWell; corner: { x: number; y: number }; size: number }) {
  return (
    <div className="pointer-events-none absolute" style={{ left: corner.x, top: corner.y, width: size }}>
      <span className={PIN_LABEL}>{well.id}</span>
    </div>
  );
}

// Line from the selected well's pin to the open card, drawn out once the card has slid in. Redrawn on every move of the
// map (not slid along with the pins: its other end stays on the card).
function LeaderLine({ map, record, scale }: { map: MapLibreMap; record: MapWell; scale: number }) {
  const viewport = useViewportSize();
  const pinScale = pinScaleOn(map, scale);
  const corner = pinCorner(record, useMapProject(map), pinScale);
  // leaves from beside the pin, however large it is drawn
  const start = { x: corner.x + LEADER.fromPin.x * pinScale, y: corner.y + LEADER.fromPin.y * pinScale };
  const peak = { x: start.x + LEADER.rise * scale, y: start.y - LEADER.rise * scale };
  const end = {
    x: cardLeft(viewport.width, scale),
    y: CONTENT_TOP + LEADER.cardOffsetY * scale,
  };

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" style={pagePart('map-leader-line')} aria-hidden>
      <path
        d={`M${start.x} ${start.y} L${peak.x} ${peak.y} L${end.x} ${end.y}`}
        pathLength={1}
        strokeDasharray={1}
        fill="none"
        stroke="white"
        strokeWidth={1.5}
        className="animate-[drawStroke_0.8s_ease-out_0.45s_both] motion-reduce:animate-none"
      />
    </svg>
  );
}

type TileCell = { row: number; col: number };

// What can be done to a tile once the AI has finished: one waiting to be recognised (clicked) is sent to it again, one it
// has recognised (right clicked, by an admin) has its results cleared, so it waits to be recognised again
const TILE_ACTIONS = {
  retry: { title: '等待辨識的小圖', note: null, label: '辨識', color: '#62A4A7', run: (taskId: string, cell: TileCell) => retryRecognition(taskId, [cell]) },
  clear: { title: '已辨識的小圖', note: '這格 AI 找到的水井（含已驗證的）會刪除，手動標記的保留', label: '清除辨識結果', color: '#BC5646', run: clearRecognition },
};

// A tile clicked once the AI has finished, what can be done to it, and where on screen
interface TileMenuAt {
  cell: TileCell;
  action: keyof typeof TILE_ACTIONS;
  x: number;
  y: number;
}

// Beside a clicked tile: does its action to that tile alone (onDone once it has)
function TileMenu({ taskId, at, scale, onDone }: { taskId: string; at: TileMenuAt; scale: number; onDone: () => void }) {
  const { title, note, label, color, run } = TILE_ACTIONS[at.action];
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = async () => {
    setSending(true);
    setError(null);
    try {
      await run(taskId, at.cell);
      onDone();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
      setSending(false);
    }
  };
  return (
    <div className="pointer-events-auto absolute" style={{ left: at.x, top: at.y }}>
      <div
        role="dialog"
        aria-label={`小圖 第 ${at.cell.row} 列・第 ${at.cell.col} 欄`}
        className="flex flex-col gap-[10px] bg-[#F7F6F1] p-[14px] shadow-[0_4px_20px_8px_rgba(0,0,0,0.5)]"
        style={{ zoom: scale }}
      >
        <span className="text-[16px] font-bold text-[#6F7468]">{title}</span>
        {note && <span className="max-w-[240px] text-[15px] text-[#6F7468]">{note}</span>}
        <button
          type="button"
          disabled={sending}
          onClick={send}
          className="px-[22px] py-[8px] text-[20px] font-bold text-[#FBFBF8] transition-[filter] hover:brightness-110 disabled:opacity-60"
          style={{ backgroundColor: color }}
        >
          {sending ? '送出中…' : label}
        </button>
        {error && <span className="max-w-[240px] text-[15px] font-bold text-[#BC5646]">{error}</span>}
      </div>
    </div>
  );
}

// Where the map was clicked: on screen, on the ground, and how large a pin is drawn there
interface GroundClick {
  x: number;
  y: number;
  longitude: number;
  latitude: number;
  pinSize: number;
}

// A well about to be placed by hand: a faint pin where the map was clicked, and beside it the way to add it there (onAdded
// with its code once added and read in), or why it cannot be (off the imagery)
function WellDraftMenu({ taskId, at, onImagery, scale, onAdded, onCancel }: { taskId: string; at: GroundClick; onImagery: boolean; scale: number; onAdded: (code: string) => Promise<void>; onCancel: () => void }) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const add = async () => {
    setSending(true);
    setError(null);
    try {
      const well = await addWell(taskId, at);
      await onAdded(well.code);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
      setSending(false);
    }
  };
  const pinTop = at.y - at.pinSize * PIN_TIP;
  return (
    <>
      <Image
        src="/map/pin.png"
        alt=""
        width={90}
        height={90}
        draggable={false}
        className="pointer-events-none absolute h-auto max-w-none opacity-70 drop-shadow-[0_6px_6px_rgba(0,0,0,0.35)]"
        style={{ left: at.x - at.pinSize / 2, top: pinTop, width: at.pinSize }}
      />
      <div className="pointer-events-auto absolute" style={{ left: at.x + at.pinSize / 2, top: pinTop }}>
        <div role="dialog" aria-label="新增水井" className="flex flex-col gap-[10px] bg-[#F7F6F1] p-[14px] shadow-[0_4px_20px_8px_rgba(0,0,0,0.5)]" style={{ zoom: scale }}>
          <span className="text-[16px] font-bold text-[#6F7468]">新增水井</span>
          <span className="text-[18px] font-bold tabular-nums text-[#2C322F]">{coordinatesText(at)}</span>
          {onImagery ? (
            <div className="flex gap-[8px]">
              <button
                type="button"
                disabled={sending}
                onClick={add}
                className="bg-[#BC5646] px-[22px] py-[8px] text-[20px] font-bold text-[#FBFBF8] transition-[filter] hover:brightness-110 disabled:opacity-60"
              >
                {sending ? '新增中…' : '新增'}
              </button>
              <button type="button" disabled={sending} onClick={onCancel} className="px-[14px] py-[8px] text-[20px] font-bold text-[#6F7468] hover:text-[#2C322F] disabled:opacity-60">
                取消
              </button>
            </div>
          ) : (
            <span className="max-w-[240px] text-[15px] font-bold text-[#BC5646]">這裡不在地圖影像範圍內，請點影像上的位置</span>
          )}
          {error && <span className="max-w-[240px] text-[15px] font-bold text-[#BC5646]">{error}</span>}
        </div>
      </div>
    </>
  );
}

// A well added by hand, right clicked, and where on screen
interface WellMenuAt {
  well: MapWell;
  x: number;
  y: number;
}

// Beside a right clicked well added by hand: takes it off the map, asked twice as it cannot be undone (onRemoved with
// the well once it is off)
function WellRemoveMenu({ at, scale, onRemoved }: { at: WellMenuAt; scale: number; onRemoved: (well: MapWell) => Promise<void> }) {
  const [asked, setAsked] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remove = async () => {
    if (!asked) return setAsked(true);
    setSending(true);
    setError(null);
    try {
      await removeWell(at.well);
      await onRemoved(at.well);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
      setSending(false);
    }
  };
  return (
    <div className="pointer-events-auto absolute" style={{ left: at.x, top: at.y }}>
      <div role="menu" aria-label={`水井 ${at.well.id}`} className="flex flex-col gap-[10px] bg-[#F7F6F1] p-[14px] shadow-[0_4px_20px_8px_rgba(0,0,0,0.5)]" style={{ zoom: scale }}>
        <span className="text-[16px] font-bold text-[#6F7468]">手動新增的水井 {at.well.id}</span>
        <button
          type="button"
          role="menuitem"
          disabled={sending}
          onClick={remove}
          className="bg-[#BC5646] px-[22px] py-[8px] text-[20px] font-bold text-[#FBFBF8] transition-[filter] hover:brightness-110 disabled:opacity-60"
        >
          {sending ? '刪除中…' : asked ? '確定刪除？無法復原' : '刪除水井'}
        </button>
        {error && <span className="max-w-[240px] text-[15px] font-bold text-[#BC5646]">{error}</span>}
      </div>
    </div>
  );
}

/* ─── Info card ─────────────────────────────────────────────────── */

function InfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-[15px] text-[24px] font-black leading-[35px] text-[#6F7468]">
      <Image src={icon} alt="" width={30} height={30} />
      {text}
    </div>
  );
}

const MOTION = 'ease-[var(--ease-expo)] motion-reduce:transition-none';

const CARD_VERDICTS: { verdict: Verdict; label: string }[] = [
  { verdict: 'well', label: '是井' },
  { verdict: 'not-well', label: '不是井' },
];

// Whether the well is a well, given right on the card: a button each in its verification colour (VERDICT_COLOR), as on
// the check page, the one not chosen faded once one is; viewers only look (canVerify). Shared with the check and export
// pages and the pins (saveVerdict).
function CardVerdict({ record }: { record: MapWell }) {
  const verdict = verdictOf(record, useWellVerdicts());
  const { session } = useSiteChrome();
  const allowed = session !== null && canVerify(session.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = async (next: Verdict) => {
    if (next === verdict) return;
    setSaving(true);
    setError(null);
    try {
      await saveVerdict(record, next);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative flex gap-[10px]">
      {CARD_VERDICTS.map((item) => {
        const selected = verdict === item.verdict;
        return (
          <button
            key={item.verdict}
            type="button"
            aria-pressed={selected}
            disabled={!allowed || saving}
            onClick={() => choose(item.verdict)}
            className={`h-[56px] w-[124px] text-[22px] font-bold text-[#FBFBF8] shadow-[0_4px_12px_rgba(0,0,0,0.18)] transition-all duration-300 ${MOTION} enabled:hover:brightness-110 enabled:active:scale-[0.97] disabled:cursor-not-allowed ${
              verdict !== null && !selected ? 'opacity-40' : ''
            }`}
            style={{ backgroundColor: VERDICT_COLOR[item.verdict] }}
          >
            {selected && '✓ '}
            {item.label}
          </button>
        );
      })}
      {error && (
        <span title={error} className="absolute bottom-full right-0 mb-[6px] max-w-full truncate text-[14px] font-bold text-[#BC5646]">
          {error}
        </span>
      )}
    </div>
  );
}

interface ViewTabProps {
  mode: ViewMode;
  label: string;
  top: string;
  color: string;
  active: boolean;
  onSelect: (mode: ViewMode) => void;
}

// Tabs hang off the right edge of each film face
function ViewTab({ mode, label, top, color, active, onSelect }: ViewTabProps) {
  const state = active
    ? 'left-[calc(100%-20px)] w-[75px] shadow-[6px_4px_16px_-2px_rgba(0,0,0,0.35)]'
    : 'left-full w-[55px] brightness-90 hover:w-[61px] hover:brightness-100';

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onSelect(mode)}
      className={`group absolute z-10 h-[149px] overflow-hidden rounded-r-[12px] text-[#FBFBF8] transition-[left,width,filter,box-shadow] duration-500 ${MOTION} ${top} ${color} ${state}`}
    >
      {/* depth: soft shade on the card side, light on the outer edge */}
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-white/15" />
      {/* selection bar along the outer edge */}
      <span
        className={`absolute bottom-3 right-2 top-3 w-[3px] rounded-full bg-white/70 transition-transform duration-500 ${MOTION} ${
          active ? 'scale-y-100' : 'scale-y-0'
        }`}
      />
      <span
        className={`relative flex h-full items-center justify-center text-[32px] font-bold tracking-[14px] transition-opacity duration-300 [text-orientation:upright] [writing-mode:vertical-rl] ${
          active ? 'opacity-100' : 'opacity-85 group-hover:opacity-100'
        }`}
      >
        {label}
      </span>
    </button>
  );
}

// Aerial: the well's photo, cut from its map by the backend.
// Model: fake 3D render (click to generate), offset 4/6px inside the card as in Figma.
function WellPhoto({ viewMode, well, shared, showing }: { viewMode: ViewMode; well: MapWell; shared: boolean; showing: boolean }) {
  if (viewMode === 'aerial') return <AerialPhoto well={well} shared={shared} />;
  return <ModelRender playing={showing} />;
}

// The aerial photo with its marker, buttons over its corner to grow it over the whole page (to zoom into) and to hide
// the marker, and the way into the verification page (the photo itself)
function AerialPhoto({ well, shared }: { well: MapWell; shared: boolean }) {
  const [markerShown, setMarkerShown] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const photoRef = useRef<HTMLDivElement>(null);
  const measureOrigin = useCallback(() => photoRef.current?.getBoundingClientRect() ?? null, []);
  const toggleMarker = () => setMarkerShown((shown) => !shown);
  const capture = { id: well.recordId, capturedAt: well.timestamp, image: wellImageUrl(well, CAPTURE_IMAGE_SIZE) };

  return (
    // hidden in place while the expanded view stands for it
    <div ref={photoRef} className="relative h-full w-full" style={{ visibility: expanded ? 'hidden' : undefined }}>
      <VerifyLink well={well} shared={shared} markerShown={markerShown} />
      <div className="absolute right-4 top-4 flex flex-col gap-[8px]">
        <ImageButton label="放大檢視" onClick={() => setExpanded(true)}>
          <ButtonIcon path={EXPAND_PATH} />
        </ImageButton>
        <ImageButton label={markerShown ? '隱藏水井定位標' : '顯示水井定位標'} pressed={markerShown} onClick={toggleMarker}>
          <MarkerIcon shown={markerShown} />
        </ImageButton>
      </div>
      {/* on the page's body: out of the page's scaled stage and the card's flip, over everything */}
      {expanded &&
        createPortal(
          <ExpandedView
            captures={[capture]}
            compareIndex={0}
            position={50}
            onPosition={() => {}}
            markerShown={markerShown}
            measureOrigin={measureOrigin}
            onToggleMarker={toggleMarker}
            onClose={() => setExpanded(false)}
          />,
          document.body,
        )}
    </div>
  );
}

// The aerial photo is the way into the verification page for this well
function VerifyLink({ well, shared, markerShown }: { well: MapWell; shared: boolean; markerShown: boolean }) {
  const wellId = well.id;
  const check = useCheckLink(wellId, TO_CHECK);
  // read as large as the expanded view and the check page show it: one photo, read once, already there when it flies over
  const photo = useBackendImage(wellImageUrl(well, CAPTURE_IMAGE_SIZE));
  return (
    <SharedTransition name={SHARED.wellPhoto} enabled={shared}>
      <Link
        href={check.href}
        transitionTypes={TO_CHECK}
        onNavigate={check.onNavigate}
        aria-label={`驗證 ${wellId}：比對多期影像`}
        className="group relative block h-[640px] w-[640px] outline-none focus-visible:shadow-[inset_0_0_0_4px_#62A4A7]"
      >
        {/* no photo (the well is outside its map's imagery): the card's paper shows instead of a broken image */}
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element -- read from the backend with the token's header
          <img src={photo} alt="空拍縮圖" width={PHOTO_SIZE} height={PHOTO_SIZE} />
        )}
        {markerShown && <WellMarkerPin />}
        <span
          className={`absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 via-transparent to-transparent pb-8 opacity-0 transition-opacity duration-300 ${MOTION} group-hover:opacity-100 group-focus-visible:opacity-100`}
        >
          <span className="translate-y-2 text-[28px] font-bold text-white transition-transform duration-300 ease-[var(--ease-expo)] group-hover:translate-y-0 group-focus-visible:translate-y-0 motion-reduce:transition-none">
            進入驗證　比對多期影像 →
          </span>
        </span>
      </Link>
    </SharedTransition>
  );
}

interface CardFaceProps {
  record: MapWell;
  // this face's photo and well info move to and from the check page (only the front face of an open card)
  shared: boolean;
  faceMode: ViewMode;
  viewMode: ViewMode;
  // this face is the one seen, on an open card (its moving parts only move then)
  showing: boolean;
  onViewModeChange: (mode: ViewMode) => void;
  className?: string;
}

// One side of the film: photo, well info and the tabs bound to it. Inert (not clickable, focusable or read out) while facing away.
function CardFace({ record, shared, faceMode, viewMode, showing, onViewModeChange, className = '' }: CardFaceProps) {
  return (
    <div
      inert={viewMode !== faceMode}
      className={`absolute inset-0 bg-[#F7F6F1] p-4 shadow-[0_4px_20px_8px_rgba(0,0,0,0.5)] [backface-visibility:hidden] ${className}`}
    >
      <div className="h-[640px] w-[640px]">
        <WellPhoto viewMode={faceMode} well={record} shared={shared} showing={showing} />
      </div>

      {/* the well on the left; whether it is a well in the bottom right corner, level with its last row */}
      <div className="mt-6 flex items-end justify-between px-1">
        <div className="shrink-0">
          <SharedTransition name={SHARED.wellId} enabled={shared}>
            <h2 className="whitespace-nowrap text-[48px] font-black leading-[normal] text-[#2C322F]">{record.id}</h2>
          </SharedTransition>
          <div className="mt-px flex flex-col gap-[13px]">
            <SharedTransition name={SHARED.wellCoordinates} enabled={shared}>
              <InfoRow icon="/map/icon-location.png" text={record.coordinates} />
            </SharedTransition>
            <SharedTransition name={SHARED.wellTime} enabled={shared}>
              <InfoRow icon="/map/icon-time.png" text={record.timestamp.slice(0, 16)} />
            </SharedTransition>
            <InfoRow icon="/map/icon-confidence.svg" text={confidenceText(record.confidence)} />
          </div>
        </div>
        <CardVerdict record={record} />
      </div>

      {VIEW_TABS.map((tab) => (
        <ViewTab key={tab.mode} {...tab} active={viewMode === tab.mode} onSelect={onViewModeChange} />
      ))}
    </div>
  );
}

// The whole film flips: aerial view on the front, model view on the back
interface InfoCardProps {
  record: MapWell;
  // open cards share their front face with the check page; a closed card is off screen, so nothing should move to it
  open: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

function InfoCard({ record, open, viewMode, onViewModeChange }: InfoCardProps) {
  const flipped = viewMode === 'model';

  return (
    <div id={CARD_ID} className="relative [perspective:2400px]" style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
      <div
        className={`absolute inset-0 transition-transform duration-[900ms] ${MOTION} [transform-style:preserve-3d] ${
          flipped ? '[transform:rotateY(180deg)]' : '[transform:rotateY(0deg)]'
        }`}
      >
        <CardFace record={record} shared={open} faceMode="aerial" viewMode={viewMode} showing={open && !flipped} onViewModeChange={onViewModeChange} />
        <CardFace
          record={record}
          shared={false}
          faceMode="model"
          viewMode={viewMode}
          showing={open && flipped}
          onViewModeChange={onViewModeChange}
          className="[transform:rotateY(180deg)]"
        />
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

interface MapPageProps {
  // the imported map shown, the wells recognised in it (one pin each), and the one selected on arrival (null: none)
  mapFile: NamedTask & Pick<Task, 'created_by_id'>;
  wells: MapWell[];
  imagery: Imagery | null;
  well: MapWell | null;
  // Arriving with a well asked for: its card slides in shortly after
  openCardOnArrival: boolean;
  // Coming back from the check page: the card is open from the start, so the well moves straight back into it
  cardOpenAtStart: boolean;
}

export default function MapPage({ mapFile, wells: arrivedWells, imagery: arrivedImagery, well: initialWell, openCardOnArrival, cardOpenAtStart }: MapPageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('aerial');
  const [cardOpen, setCardOpen] = useState(cardOpenAtStart);
  const [selectedId, setSelectedId] = useState(initialWell?.id ?? null);
  // arriving at another map or well (e.g. from the navbar) while on this page: select it (selecting a pin here
  // rewrites the address to the same well, which changes nothing)
  const arrival = `${mapFile.id}/${initialWell?.id ?? ''}`;
  const [arrivedAt, setArrivedAt] = useState(arrival);
  if (arrival !== arrivedAt) {
    setArrivedAt(arrival);
    setSelectedId(initialWell?.id ?? null);
  }
  // fixed as the page arrives: selecting a pin writes &well= into the address, which would otherwise read as
  // arriving with a card and fit the whole strip again, undoing the pin's zoom
  const [startsWithCard] = useState(openCardOnArrival || cardOpenAtStart);
  // back from the check page: the map as it was left with this well; a well opened elsewhere (e.g. picked on the export
  // page) is zoomed in on as a clicked pin is, at least as close as the map was left
  const [returnView] = useState(() => {
    if (!cardOpenAtStart || !initialWell) return { camera: null, focus: null, image: null };
    const camera = mapCameraFor(initialWell.id);
    if (camera) return { camera, focus: null, image: mapImageFor(initialWell.id) };
    return { camera: null, focus: { well: initialWell, zoom: Math.max(lastMapZoom() ?? 0, PIN_FOCUS_ZOOM) }, image: null };
  });
  // read once as the page arrives (React may run this twice while developing, so cleared in an effect, not here)
  const [openedFromUpload] = useState(isOpeningMap);
  useEffect(() => clearOpeningMap(), []);
  const scale = useFitScale(OVERLAY_STAGE);
  const cornerScale = useFitScale(CORNER_STAGE);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  // how far this map has got, tile by tile, and its wells read again as the AI recognises more of them
  const tiles = useTileProgressLayer(map, mapFile.id);
  const { wells, readAgain: readWellsAgain } = useRecognisedWells(mapFile, arrivedWells, tiles.recognised);
  // the AI starts once the map is cut, so its count is known only then; until then the imagery cut so far
  const imagery = useCutImagery(mapFile.id, arrivedImagery, tiles.recognised !== null) ?? tiles.imagery;
  const record = wells.find((candidate) => candidate.id === selectedId) ?? null;
  // a tile waiting to be recognised can be sent to the AI again once it has finished, by an operator or admin
  const { session } = useSiteChrome();
  const tilesRetriable = tiles.retryable && session !== null && canRetry(session.role);
  const [tileMenu, setTileMenu] = useState<TileMenuAt | null>(null);
  const openTileMenu = (point: { x: number; y: number }) => {
    const cell = tilesRetriable ? tiles.pendingTileAt(point) : null;
    if (cell) setTileMenu({ cell, action: 'retry', ...point });
  };
  // a well can be placed by hand on the map's imagery, by an operator or admin: the next click on the map places it
  const wellsAddable = imagery !== null && session !== null && canAddWell(session.role);
  const [placing, setPlacing] = useState(false);
  const [draft, setDraft] = useState<GroundClick | null>(null);
  // a well added by hand can be taken off again by whoever may delete the map's wells (canDelete)
  const wellsRemovable = session !== null && canDelete(session, { createdById: mapFile.created_by_id });
  const [wellMenu, setWellMenu] = useState<WellMenuAt | null>(null);
  // stays the same function, so the map's right click listener is not taken off and put back on every render
  const openWellMenu = useCallback(
    (well: MapWell, point: { x: number; y: number }) => {
      if (!well.manual || !wellsRemovable) return false;
      setTileMenu(null);
      setDraft(null);
      setWellMenu({ well, ...point });
      return true;
    },
    [wellsRemovable],
  );
  // and a tile it has recognised can have its results cleared then, by an admin (a right click on it)
  const recognitionClearable = tiles.retryable && session !== null && canClearRecognition(session.role);
  const { recognisedTileAt } = tiles;
  const openClearMenu = useCallback(
    (at: { x: number; y: number; longitude: number; latitude: number }) => {
      const cell = recognitionClearable ? recognisedTileAt(at.longitude, at.latitude) : null;
      if (!cell) return false;
      setWellMenu(null);
      setDraft(null);
      setTileMenu({ cell, action: 'clear', x: at.x, y: at.y });
      return true;
    },
    [recognitionClearable, recognisedTileAt],
  );
  const clickGround = (at: GroundClick) => {
    if (placing) setDraft(at);
    else openTileMenu(at);
  };
  // the open card's way into its check page (the photo) finds that page ready, so the photo flies there
  usePrefetchCheckView(cardOpen ? (record?.id ?? null) : null);

  // the navbar's 地圖檢視 comes back to the map shown last
  useEffect(() => rememberVisit('map', mapFile.id), [mapFile.id]);

  // Another pin selects that well and opens its card; the selected pin toggles the card. The address follows the
  // selection without reloading the page.
  const selectPin = (id: string) => {
    if (id === selectedId) {
      setCardOpen((open) => !open);
      return;
    }
    setSelectedId(id);
    setViewMode('aerial');
    setCardOpen(true);
    window.history.replaceState(null, '', mapHref({ id, recordId: mapFile.id }));
  };

  useEffect(() => {
    if (!openCardOnArrival || cardOpenAtStart) return;
    const timer = setTimeout(() => setCardOpen(true), ARRIVAL_CARD_DELAY_MS);
    return () => clearTimeout(timer);
  }, [openCardOnArrival, cardOpenAtStart]);

  // stays the same function, so the map's listeners for it are not taken off and put back on every render
  const closeCard = useCallback(() => {
    setCardOpen(false);
    setTileMenu(null);
    setDraft(null);
    setWellMenu(null);
  }, []);

  const togglePlacing = () => {
    closeCard();
    setPlacing((on) => !on);
  };

  // the well placed, read in with the others: placing is over, and its card opens
  const showAddedWell = async (code: string) => {
    await readWellsAgain();
    setPlacing(false);
    setDraft(null);
    selectPin(code);
  };

  // the well taken off, read again without it: its card (if it was the selected one) closes, the address with it
  const forgetRemovedWell = async (well: MapWell) => {
    await readWellsAgain();
    setWellMenu(null);
    if (well.id !== selectedId) return;
    setSelectedId(null);
    setCardOpen(false);
    window.history.replaceState(null, '', `/map?record=${encodeURIComponent(mapFile.id)}`);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      closeCard();
      setPlacing(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeCard]);

  return (
    // over the shared survey map (SurveyMap): lets drags and clicks through to it, except on its own parts
    <div className="pointer-events-none relative h-screen overflow-hidden" style={{ fontFamily: 'var(--font-noto-serif-tc), serif' }}>
      <MapCanvas
        wells={wells}
        imagery={imagery}
        area={tiles.bounds}
        selected={record}
        cardOpen={cardOpen}
        startsWithCard={startsWithCard}
        startCamera={returnView.camera}
        startFocus={returnView.focus}
        startImage={returnView.image}
        openedFromUpload={openedFromUpload}
        onMapReady={setMap}
        scale={scale}
        onPinClick={selectPin}
        onDismiss={closeCard}
        placing={placing}
        onGroundClick={clickGround}
        onPinMenu={openWellMenu}
        onGroundMenu={openClearMenu}
      />

      {wellMenu && <WellRemoveMenu key={wellMenu.well.id} at={wellMenu} scale={cornerScale} onRemoved={forgetRemovedWell} />}

      {placing && (
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2" style={{ top: CONTENT_TOP }}>
          <span className="block bg-[#2C322F]/85 px-[18px] py-[8px] text-[18px] font-bold text-white" style={{ zoom: cornerScale }}>
            點地圖放置水井・Esc 取消
          </span>
        </div>
      )}

      {draft && (
        <WellDraftMenu
          key={`${draft.longitude}/${draft.latitude}`}
          taskId={mapFile.id}
          at={draft}
          onImagery={imagery !== null && isOnImagery(imagery.bounds, draft)}
          scale={cornerScale}
          onAdded={showAddedWell}
          onCancel={() => setDraft(null)}
        />
      )}

      {tileMenu && (
        <TileMenu
          key={`${tileMenu.action}/${tileMenu.cell.row}/${tileMenu.cell.col}`}
          taskId={mapFile.id}
          at={tileMenu}
          scale={cornerScale}
          onDone={() => {
            setTileMenu(null);
            tiles.readAgain();
            if (tileMenu.action === 'clear') void readWellsAgain();
          }}
        />
      )}

      {/* back to the upload page (the map shrinks into this record's row there), with the map file shown beside it,
          just under the navbar's logo */}
      <BackToMapLink href="/upload" label="返回上傳頁面" transitionTypes={BACK_TO_UPLOAD} onNavigate={markBackToUpload} mapFile={mapFile}>
        <CursorCoordinates map={map} />
      </BackToMapLink>

      {/* in the bottom left corner, against the navbar's left edge, as on the compare page (and as large) */}
      <div className="pointer-events-auto absolute" style={{ ...pagePart('map-shortcuts'), left: PAGE_GUTTER, bottom: PAGE_GAP }}>
        <div className="flex gap-[12px]" style={{ zoom: cornerScale }}>
          <ExportEntry recordId={mapFile.id} wells={wells} />
          <CompareEntry recordId={mapFile.id} />
          {wellsAddable && <PinEntry placing={placing} onToggle={togglePlacing} />}
        </div>
      </div>

      <MapLegend hidden={cardOpen} tiles={tiles.counts} />

      <div className="pointer-events-none absolute" style={{ ...pagePart('map-card'), top: CONTENT_TOP, right: PAGE_GUTTER + TAB_OVERHANG * scale }}>
        <div
          aria-hidden={!cardOpen}
          className={`transition-transform duration-700 ${MOTION} ${
            cardOpen ? 'pointer-events-auto translate-x-0' : 'translate-x-[calc(100%+400px)]'
          }`}
          style={{ zoom: scale }}
        >
          {record && <InfoCard record={record} open={cardOpen} viewMode={viewMode} onViewModeChange={setViewMode} />}
        </div>
      </div>
    </div>
  );
}
