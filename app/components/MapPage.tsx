'use client';

import { useCallback, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ModelRender from './ModelRender';
import ExportEntry from './ExportEntry';
import CompareEntry from './CompareEntry';
import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent, MapMouseEvent } from 'maplibre-gl';
import { drawIcon, iconAt, pointFeatures, stripFit, useIconLayer, useMapLayer, useMapProject, type Icon, type Project } from './TileMap';
import { useSurveyMap } from './SurveyMap';
import { pinScaleExpression, pinZoomScale } from '../utils/pinZoomScale';
import { lastMapZoom, mapCameraFor, mapImageFor, projectWithCamera, rememberMapCamera, rememberMapImage, type MapCamera } from '../utils/mapCamera';
import SharedTransition, {
  BACK_TO_UPLOAD,
  SHARED,
  TO_CHECK,
  markBackToUpload,
  pagePart,
} from './SharedTransition';
import BackToMapLink from './BackToMapLink';
import CursorCoordinates from './CursorCoordinates';
import type { MapWell, RecordItem } from '../data/mapRecords';
import { mapHref } from '../utils/routeRecords';
import { useWellVerdicts } from './useWellVerdicts';
import { lookOf, VERDICT_COLOR, verdictOfWell, type VerdictLook } from '../utils/wellVerdicts';
import { rememberVisit } from '../utils/lastVisit';
import { useFitScale, type FitStage } from './useFitScale';
import { CONTENT_TOP, FRAME_MARGIN_Y, PAGE_GAP, PAGE_GUTTER, useViewportSize } from './pageFrame';

const CARD_WIDTH = 680;
const CARD_HEIGHT = 869;
// Type and card scale with the window width like the 1920px Figma frame, but the card must also fit under the navbar
const OVERLAY_STAGE: FitStage = { width: 1920, height: CARD_HEIGHT, marginX: 0, marginY: FRAME_MARGIN_Y, minViewportWidth: 0 };
// The view tabs stick out this far past the card's right edge; the tabs' outer edge lines up with the navbar
const TAB_OVERHANG = 55;
const CARD_ID = 'well-card';

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

const wellFeatures = (wells: MapWell[], verdicts: ReturnType<typeof useWellVerdicts>) =>
  pointFeatures(wells, (well) => ({ id: well.id, look: lookOf(verdictOfWell(well.id, verdicts)) }));

// The map's layer of pins: every well but the selected one (a page element), at the page's scale and smaller the
// further out (pinScaleExpression). onHover: the well under the pointer, or null.
function useWellPinLayer(map: MapLibreMap | null, wells: MapWell[], selectedId: string | null, scale: number, onHover: (id: string | null) => void) {
  const ready = useIconLayer(map, WELL_LAYER, shadowedPins, {
    'icon-image': ['match', ['get', 'look'], 'well', PIN_IMAGE.well, 'not-well', PIN_IMAGE['not-well'], PIN_IMAGE.pending],
    'icon-offset': PIN_OFFSET,
  });
  // each pin in its well's verification colour, again as wells are verified (here, on the check or export page)
  const verdicts = useWellVerdicts();

  useEffect(() => {
    if (ready && map) (map.getSource(WELL_LAYER) as GeoJSONSource).setData(wellFeatures(wells, verdicts));
  }, [ready, map, wells, verdicts]);

  useEffect(() => {
    if (ready && map) map.setFilter(WELL_LAYER, ['!=', ['get', 'id'], selectedId ?? '']);
  }, [ready, map, selectedId]);

  useEffect(() => {
    if (ready && map) map.setLayoutProperty(WELL_LAYER, 'icon-size', pinScaleExpression(scale));
  }, [ready, map, scale]);

  useEffect(() => {
    if (!ready || !map) return;
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
      // the map may stay for the next page (SurveyMap): not left with this page's pointer
      map.getCanvas().style.cursor = '';
    };
  }, [ready, map, onHover]);
}

interface MapCanvasProps {
  // the wells of the imported map shown, one pin each
  wells: MapWell[];
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
  // the map, once it has started (kept by the page, which shows where the pointer is on it)
  onMapReady: (map: MapLibreMap | null) => void;
  scale: number;
  onPinClick: (id: string) => void;
  onDismiss: () => void;
}

// The survey map (shared with the compare page: SurveyMap) with a pin on every well; the pins and the line to the card
// follow the map as it is dragged and zoomed
function MapCanvas({ wells, selected, cardOpen, startsWithCard, startCamera, startFocus, startImage, onMapReady, scale, onPinClick, onDismiss }: MapCanvasProps) {
  const viewport = useViewportSize();
  // from the map's middle to the middle of the space left of the card and under the navbar, where a focused well goes
  // (an offset, not padding: padding would stay on the map and shift every later fit)
  const focusOffset: [number, number] = [cardLeft(viewport.width, scale) / 2 - viewport.width / 2, CONTENT_TOP / 2];
  const camera =
    startCamera ??
    (startFocus ? { center: [startFocus.well.longitude, startFocus.well.latitude] as [number, number], zoom: startFocus.zoom, offset: focusOffset } : undefined);
  const selectedId = selected?.id;

  const map = useSurveyMap({
    fit: stripFit(viewport, startsWithCard),
    camera,
    // a picture of where the map is left with a well, for coming back to it from its check page
    onRestImage: selectedId ? (image) => rememberMapImage(selectedId, image) : undefined,
    placeholder: startImage ?? undefined,
    startAfter: startImage ? RETURN_MAP_START_MS : 0,
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
  useWellPinLayer(map, wells, selectedId ?? null, scale, setHoveredId);
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

  // a click on the map: on a pin it drew, that pin; anywhere else, closes the card
  function onMapClick(event: MapMouseEvent) {
    const id = map ? iconAt(map, WELL_LAYER, event.point, 'id') : undefined;
    const well = wells.find((candidate) => candidate.id === id);
    if (well) pickPin(well);
    else onDismiss();
  }

  return (
    <>
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
                  onClick={() => pickPin(selected)}
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
  onClick: () => void;
}

// The selected well's pin, a page element (the others are drawn by the map); clicking it toggles its card. Coloured
// by its verification as the map's pins are: the pin image itself while not verified, its shape filled otherwise.
function WellMarker({ record, corner, size, cardOpen, onClick }: WellMarkerProps) {
  const active = cardOpen;
  const look = lookOf(verdictOfWell(record.id, useWellVerdicts()));
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
      className={`group pointer-events-auto absolute cursor-pointer ${active ? 'z-10' : ''}`}
      style={{ left: corner.x, top: corner.y, width: size }}
    >
      {/* ping on the selected well's ground point while its card is closed */}
      {!cardOpen && (
        <span className="absolute bottom-[6%] left-1/2 h-2 w-6 -translate-x-1/2 rounded-full bg-white/70 animate-ping motion-reduce:hidden" />
      )}
      {/* the well's id above the pin on hover */}
      <span className={`${PIN_LABEL} opacity-0 transition-opacity duration-200 group-hover:opacity-100`}>{record.id}</span>
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
    </button>
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

// The compare page's stage, whose scale its corners (the export shortcut, the legend) are drawn at: this page's corners
// are the same size, so moving between the two pages they stay put
const CORNER_STAGE: FitStage = { width: 1920, height: 1080, marginX: 0, marginY: 0, minViewportWidth: 0 };

// What the pins' colours mean, in the corner the card covers: shown while no card is, fading out as one opens and back
// in as it closes. Where and as large as the compare page's legend: against the navbar's right edge, just above the
// window's bottom.
function MapLegend({ hidden }: { hidden: boolean }) {
  const scale = useFitScale(CORNER_STAGE);
  return (
    <div
      aria-hidden={hidden}
      className={`absolute transition-opacity duration-500 ${MOTION} ${hidden ? 'opacity-0' : 'opacity-100'}`}
      style={{ ...pagePart('map-legend'), right: PAGE_GUTTER, bottom: PAGE_GAP }}
    >
      <div className="flex flex-col gap-[14px] bg-[#F7F6F1]/92 py-[22px] pl-[26px] pr-[32px] shadow-[0_4px_20px_8px_rgba(0,0,0,0.5)]" style={{ zoom: scale }}>
        <span className="text-[18px] font-bold text-[#6F7468]">圖例</span>
        {LEGEND.map((entry) => (
          <span key={entry.look} className="flex items-center gap-[12px] text-[21px] font-bold text-[#2C322F]">
            <PinSwatch look={entry.look} size={30} />
            {entry.label}
          </span>
        ))}
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

// Aerial: tile preview (will come from titiler).
// Model: fake 3D render (click to generate), offset 4/6px inside the card as in Figma.
function WellPhoto({ viewMode, wellId, shared, showing }: { viewMode: ViewMode; wellId: string; shared: boolean; showing: boolean }) {
  if (viewMode === 'aerial') return <VerifyLink wellId={wellId} shared={shared} />;
  return <ModelRender playing={showing} />;
}

// The aerial photo is the way into the verification page for this well
function VerifyLink({ wellId, shared }: { wellId: string; shared: boolean }) {
  return (
    <SharedTransition name={SHARED.wellPhoto} enabled={shared}>
      <Link
        href={`/check?record=${wellId}`}
        transitionTypes={TO_CHECK}
        aria-label={`驗證 ${wellId}：比對多期影像`}
        className="group relative block h-[640px] w-[640px] outline-none focus-visible:shadow-[inset_0_0_0_4px_#62A4A7]"
      >
        <Image src="/aerial-tile.webp" unoptimized alt="空拍縮圖" width={640} height={640} />
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
        <WellPhoto viewMode={faceMode} wellId={record.id} shared={shared} showing={showing} />
      </div>

      <SharedTransition name={SHARED.wellId} enabled={shared}>
        <h2 className="mt-6 px-1 text-[48px] font-black leading-[normal] text-[#2C322F]">{record.id}</h2>
      </SharedTransition>
      <div className="mt-px flex flex-col gap-[13px] px-1">
        <SharedTransition name={SHARED.wellCoordinates} enabled={shared}>
          <InfoRow icon="/map/icon-location.png" text={record.coordinates} />
        </SharedTransition>
        <SharedTransition name={SHARED.wellTime} enabled={shared}>
          <InfoRow icon="/map/icon-time.png" text={record.timestamp.slice(0, 16)} />
        </SharedTransition>
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
  mapFile: RecordItem;
  wells: MapWell[];
  well: MapWell | null;
  // Arriving with a well asked for: its card slides in shortly after
  openCardOnArrival: boolean;
  // Coming back from the check page: the card is open from the start, so the well moves straight back into it
  cardOpenAtStart: boolean;
}

export default function MapPage({ mapFile, wells, well: initialWell, openCardOnArrival, cardOpenAtStart }: MapPageProps) {
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
  const record = wells.find((candidate) => candidate.id === selectedId) ?? null;
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
  const scale = useFitScale(OVERLAY_STAGE);
  const cornerScale = useFitScale(CORNER_STAGE);
  const [map, setMap] = useState<MapLibreMap | null>(null);

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
  const closeCard = useCallback(() => setCardOpen(false), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCardOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    // over the shared survey map (SurveyMap): lets drags and clicks through to it, except on its own parts
    <div className="pointer-events-none relative h-screen overflow-hidden" style={{ fontFamily: 'var(--font-noto-serif-tc), serif' }}>
      <MapCanvas
        wells={wells}
        selected={record}
        cardOpen={cardOpen}
        startsWithCard={startsWithCard}
        startCamera={returnView.camera}
        startFocus={returnView.focus}
        startImage={returnView.image}
        onMapReady={setMap}
        scale={scale}
        onPinClick={selectPin}
        onDismiss={closeCard}
      />

      {/* back to the upload page (the map shrinks into this record's row there), with the map file shown beside it,
          just under the navbar's logo */}
      <BackToMapLink href="/upload" label="返回上傳頁面" transitionTypes={BACK_TO_UPLOAD} onNavigate={markBackToUpload} mapFile={mapFile}>
        <CursorCoordinates map={map} />
      </BackToMapLink>

      {/* in the bottom left corner, against the navbar's left edge, as on the compare page (and as large) */}
      <div className="pointer-events-auto absolute" style={{ ...pagePart('map-shortcuts'), left: PAGE_GUTTER, bottom: PAGE_GAP }}>
        <div className="flex gap-[12px]" style={{ zoom: cornerScale }}>
          <ExportEntry />
          <CompareEntry recordId={mapFile.id} />
        </div>
      </div>

      <MapLegend hidden={cardOpen} />

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
