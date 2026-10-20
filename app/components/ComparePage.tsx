'use client';

import { useEffect, useMemo, useState, type ChangeEvent, type DragEvent } from 'react';
import { useFitScale, type FitStage } from './useFitScale';
import ExportEntry from './ExportEntry';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import { drawIcon, iconAt, pointFeatures, useIconLayer, useMapLayer, type Bounds as GeoBounds, type Icon } from './TileMap';
import { useSurveyMap } from './SurveyMap';
import BackToMapLink, { BACK_LINK_HEIGHT } from './BackToMapLink';
import CursorCoordinates from './CursorCoordinates';
import SharedTransition, { SHARED, pagePart } from './SharedTransition';
import { CONTENT_TOP, PAGE_GAP, PAGE_GUTTER, useViewportSize, type ViewportSize } from './pageFrame';
import { EXPORT_WELLS } from '../data/exportWells';
import type { RecordItem } from '../data/mapRecords';
import { decodeCsv, downloadCsv } from '../utils/csv';
import { parseLegalWellsCsv } from '../utils/legalWellsCsv';
import { buildComparisonCsv, compareWells, type GeoPoint, type WellComparison } from '../utils/wellComparison';

// Sized like the 1920×1080 Figma frame and scaled to fit the window; the stage then covers the whole window and
// its edges line up with the navbar (see pageFrame)
const STAGE: FitStage = { width: 1920, height: 1080, marginX: 0, marginY: 0, minViewportWidth: 0 };
// Left column: the back-to-map link, then the panel, stretching down to the export shortcut (84px tall) at the bottom
const PANEL_WIDTH = 654;
const EXPORT_HEIGHT = 84;
const COLUMN_SPACING = 16;
// The wells are spread over the stage right of the panel, keeping clear of the legend at the bottom
const MAP_GAP_LEFT = 86;
const MAP_GAP_BOTTOM = 44;
const CARD_WIDTH = 500;
const CARD_GAP = 36;
// Tallest the detail card gets, used to keep it inside the stage
const CARD_MAX_HEIGHT = 440;
const TOLERANCE = { min: 5, max: 100, step: 5, initial: 15 };
const SAMPLE_CSV = '/compare/legal-wells-sample.csv';
const RESULT_FILE_NAME = 'skywell-legal-well-comparison.csv';

// Wells judged not to be wells are left out: only real detections are compared with the register
const DETECTED_WELLS: GeoPoint[] = EXPORT_WELLS.filter((well) => well.verdict !== 'not-well');

type Category = 'matched' | 'unregistered' | 'missing';

const CATEGORIES: Record<Category, { label: string; description: string; listTitle: string; number: string; card: string; accent: string; chip: string }> = {
  matched: {
    label: '合法已辨識',
    description: '清冊與辨識皆有',
    listTitle: '合法且已辨識的水井',
    number: 'text-[#3F7A7E]',
    card: 'bg-white',
    accent: 'border-[#62A4A7]',
    chip: 'bg-[#D1E6E7] text-[#3F7A7E]',
  },
  unregistered: {
    label: '疑似未登記',
    description: '辨識到・清冊無',
    listTitle: '疑似未登記水井',
    number: 'text-[#BC5646]',
    card: 'bg-[#F7E5DF]',
    accent: 'border-[#BC5646]',
    chip: 'bg-[#F7E5DF] text-[#98412F]',
  },
  missing: {
    label: '清冊未辨識',
    description: '清冊有・未辨識',
    listTitle: '清冊有但未辨識的水井',
    number: 'text-[#8A611C]',
    card: 'bg-[#F8EBD1]',
    accent: 'border-[#D9A441]',
    chip: 'bg-[#F8EBD1] text-[#8A611C]',
  },
};
const CATEGORY_ORDER: Category[] = ['matched', 'unregistered', 'missing'];

const MARKER_STYLES: Record<Category | 'detected', string> = {
  matched: 'h-[24px] w-[24px] border-[3px] border-white bg-[#62A4A7]',
  unregistered: 'h-[28px] w-[28px] border-[3px] border-white bg-[#BC5646]',
  missing: 'h-[24px] w-[24px] border-[3px] border-dashed border-[#D9A441] bg-[#F8EBD1]/50',
  detected: 'h-[22px] w-[22px] border-[3px] border-[#62A4A7] bg-white/85',
};

/* ─── Markers drawn by the map ──────────────────────────────────── */

// Every marker but the selected one (a page element) is an icon the map draws itself, so a hundred of them move and
// scale with it at no cost. The icons are drawn once, looking as MARKER_STYLES does on the page.
const MARKER_LAYER = 'compare-markers';
// Room for the largest look: the unregistered marker with its dashed halo (14px outside it) and a shadow
const MARKER_ICON_SIDE = 72;

interface MarkerLook {
  diameter: number;
  ring: string;
  fill: string;
  dashed?: boolean;
}

const MARKER_LOOKS: Record<Category | 'detected', MarkerLook> = {
  matched: { diameter: 24, ring: '#FFFFFF', fill: '#62A4A7' },
  unregistered: { diameter: 28, ring: '#FFFFFF', fill: '#BC5646' },
  missing: { diameter: 24, ring: '#D9A441', fill: 'rgba(248, 235, 209, 0.5)', dashed: true },
  detected: { diameter: 22, ring: '#62A4A7', fill: 'rgba(255, 255, 255, 0.85)' },
};

// A filled circle with a 3px ring inside its edge and a soft shadow; halo: the unregistered marker's dashed ring around
function drawMarker({ diameter, ring, fill, dashed }: MarkerLook, halo: boolean): Icon {
  return drawIcon(MARKER_ICON_SIDE, (context) => {
    const centre = MARKER_ICON_SIDE / 2;
    const circle = (radius: number) => {
      context.beginPath();
      context.arc(centre, centre, radius, 0, 2 * Math.PI);
    };
    if (halo) {
      circle(diameter / 2 + 14);
      context.fillStyle = 'rgba(188, 86, 70, 0.1)';
      context.fill();
      context.setLineDash([4, 3]);
      context.lineWidth = 1.5;
      context.strokeStyle = 'rgba(188, 86, 70, 0.7)';
      context.stroke();
    }
    context.save();
    context.shadowColor = 'rgba(0, 0, 0, 0.35)';
    context.shadowBlur = 6;
    context.shadowOffsetY = 2;
    circle(diameter / 2);
    context.fillStyle = fill;
    context.fill();
    context.restore();
    circle(diameter / 2 - 1.5);
    context.setLineDash(dashed ? [4, 3] : []);
    context.lineWidth = 3;
    context.strokeStyle = ring;
    context.stroke();
  });
}

const markerIcon = (look: Category | 'detected') => `compare-${look}`;
const HALO_ICON = 'compare-unregistered-halo';

async function markerIcons(): Promise<Record<string, Icon>> {
  const looks = Object.entries(MARKER_LOOKS).map(([name, look]) => [markerIcon(name as Category | 'detected'), drawMarker(look, false)]);
  return { ...Object.fromEntries(looks), [HALO_ICON]: drawMarker(MARKER_LOOKS.unregistered, true) };
}

// The markers as the map's icon layer: the compared wells (those of the chosen category in full, the rest faded, the
// unregistered with their halo while they are the ones shown), or before a register is uploaded what the AI detected
function useMarkerLayer(map: MapLibreMap | null, items: CompareItem[] | null, filter: Category, selectedKey: string | null, scale: number) {
  const ready = useIconLayer(map, MARKER_LAYER, markerIcons, { 'icon-image': markerIcon('detected'), 'symbol-sort-key': ['get', 'order'] });

  useEffect(() => {
    if (!ready || !map) return;
    // detected wells have no key: they are not picked by clicking
    const features = items
      ? pointFeatures(
          items.map((item) => ({ ...item.point, item })),
          ({ item }, order) => ({ key: item.key, category: item.category, order }),
        )
      : pointFeatures(DETECTED_WELLS, (_, order) => ({ category: 'detected', order }));
    (map.getSource(MARKER_LAYER) as GeoJSONSource).setData(features);
  }, [ready, map, items]);

  useEffect(() => {
    if (!ready || !map) return;
    map.setLayoutProperty(MARKER_LAYER, 'icon-image', [
      'case',
      ['all', ['==', ['get', 'category'], 'unregistered'], ['literal', filter === 'unregistered']],
      HALO_ICON,
      ['concat', 'compare-', ['get', 'category']],
    ]);
    map.setPaintProperty(MARKER_LAYER, 'icon-opacity', ['case', ['in', ['get', 'category'], ['literal', [filter, 'detected']]], 1, 0.3]);
  }, [ready, map, filter]);

  useEffect(() => {
    if (ready && map) map.setFilter(MARKER_LAYER, ['!=', ['get', 'key'], selectedKey ?? '']);
  }, [ready, map, selectedKey]);

  useEffect(() => {
    if (ready && map) map.setLayoutProperty(MARKER_LAYER, 'icon-size', scale);
  }, [ready, map, scale]);

  // a pointer over a marker that can be picked
  useEffect(() => {
    if (!ready || !map || !items) return;
    const enter = () => (map.getCanvas().style.cursor = 'pointer');
    const leave = () => (map.getCanvas().style.cursor = '');
    map.on('mouseenter', MARKER_LAYER, enter);
    map.on('mouseleave', MARKER_LAYER, leave);
    return () => {
      map.off('mouseenter', MARKER_LAYER, enter);
      map.off('mouseleave', MARKER_LAYER, leave);
      leave();
    };
  }, [ready, map, items]);
}

/* ─── Results as map/list items ─────────────────────────────────── */

interface CompareItem {
  key: string;
  category: Category;
  point: GeoPoint;
  // the well on the other side it was paired with, or the nearest one
  counterpart: GeoPoint | null;
  distance: number | null;
}

function toItems(comparison: WellComparison): CompareItem[] {
  return [
    ...comparison.matched.map((m) => ({ key: `m:${m.detected.id}`, category: 'matched' as const, point: m.detected, counterpart: m.legal, distance: m.distance })),
    ...comparison.unregistered.map((u) => ({
      key: `u:${u.detected.id}`,
      category: 'unregistered' as const,
      point: u.detected,
      counterpart: u.nearestLegal?.point ?? null,
      distance: u.nearestLegal?.distance ?? null,
    })),
    ...comparison.missing.map((m) => ({
      key: `x:${m.legal.id}`,
      category: 'missing' as const,
      point: m.legal,
      counterpart: m.nearestDetected?.point ?? null,
      distance: m.nearestDetected?.distance ?? null,
    })),
  ];
}

const formatCoordinates = (point: GeoPoint) => `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`;

function counterpartText(item: CompareItem): string {
  if (!item.counterpart || item.distance === null) return item.category === 'missing' ? '附近沒有辨識結果' : '清冊中沒有合法井';
  const meters = `${Math.round(item.distance)} m`;
  if (item.category === 'matched') return `對應合法井 ${item.counterpart.id} · ${meters}`;
  if (item.category === 'unregistered') return `最近合法井 ${item.counterpart.id} · ${meters}`;
  return `最近辨識 ${item.counterpart.id} · ${meters}`;
}

/* ─── Map projection ────────────────────────────────────────────── */

// Where things go on the stage, in stage pixels: the window's size and the navbar-aligned edges divided by the scale
function stageLayout(scale: number, viewport: ViewportSize) {
  const width = viewport.width / scale;
  const height = viewport.height / scale;
  const gutter = PAGE_GUTTER / scale;
  const top = CONTENT_TOP / scale;
  const bottomGap = PAGE_GAP / scale;
  const mapLeft = gutter + PANEL_WIDTH + MAP_GAP_LEFT;
  return {
    width,
    height,
    gutter,
    top,
    bottomGap,
    // the back link is not scaled with the stage, so its height is converted like the navbar-aligned edges
    panelTop: top + BACK_LINK_HEIGHT / scale + COLUMN_SPACING,
    panelBottom: bottomGap + EXPORT_HEIGHT + COLUMN_SPACING,
    map: { left: mapLeft, top, width: width - gutter - mapLeft, height: height - top - bottomGap - MAP_GAP_BOTTOM },
  };
}

// The smallest area holding all the points, for fitting the map to them
function pointsBounds(points: GeoPoint[]): GeoBounds {
  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  return [Math.min(...longitudes), Math.min(...latitudes), Math.max(...longitudes), Math.max(...latitudes)];
}

/* ─── Map layer ─────────────────────────────────────────────────── */

interface MapLayerProps {
  project: (point: GeoPoint) => { x: number; y: number };
}

function Marker({ item, faded, selected, position, onSelect }: { item: CompareItem; faded: boolean; selected: boolean; position: { x: number; y: number }; onSelect: () => void }) {
  return (
    <button
      type="button"
      aria-label={`${CATEGORIES[item.category].label} ${item.point.id}`}
      aria-pressed={selected}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      className={`pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center transition-[opacity,transform] duration-300 ease-[var(--ease-expo)] hover:scale-125 ${
        faded ? 'opacity-30' : 'opacity-100'
      } ${selected ? 'z-20 scale-150' : 'z-10'}`}
      style={{ left: position.x, top: position.y }}
    >
      {item.category === 'unregistered' && !faded && (
        <span className="pointer-events-none absolute -inset-[14px] rounded-full border-[1.5px] border-dashed border-[#BC5646]/70 bg-[#BC5646]/10" />
      )}
      {selected && <span className="pointer-events-none absolute -inset-[7px] rounded-full border-[2px] border-white" />}
      <span className={`relative rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.35)] ${MARKER_STYLES[item.category]}`} />
    </button>
  );
}

// Dashed line from the selected well to its counterpart, labelled with the distance
function CounterpartLink({ item, project }: { item: CompareItem; project: MapLayerProps['project'] }) {
  if (!item.counterpart || item.distance === null) return null;
  const from = project(item.point);
  const to = project(item.counterpart);
  return (
    <>
      <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible">
        <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="white" strokeWidth={2} strokeDasharray="6 5" />
        <circle cx={to.x} cy={to.y} r={6} fill="none" stroke="white" strokeWidth={2} />
      </svg>
      <span
        className="pointer-events-none absolute z-20 bg-[#2C322F]/85 px-3 text-[20px] font-bold leading-[32px] text-white"
        style={{ left: (from.x + to.x) / 2 + 12, top: (from.y + to.y) / 2 - 16 }}
      >
        {Math.round(item.distance)} m
      </span>
    </>
  );
}

interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface DetailCardProps {
  item: CompareItem;
  // part of the stage the card has to stay within
  bounds: Bounds;
  tolerance: number;
  project: MapLayerProps['project'];
  toRegister: boolean;
  onToggleRegister: () => void;
}

function DetailCard({ item, bounds, tolerance, project, toRegister, onToggleRegister }: DetailCardProps) {
  const meta = CATEGORIES[item.category];
  const { x, y } = project(item.point);
  // beside the marker on the side away from the line to its counterpart (the distance label sits right of the line,
  // so a (nearly) vertical line also sends the card left), unless that side would leave the map area
  const counterpartX = item.counterpart ? project(item.counterpart).x : x;
  const leftSide = x - CARD_GAP - CARD_WIDTH;
  const rightSide = x + CARD_GAP;
  const fitsLeft = leftSide >= bounds.left;
  const fitsRight = rightSide + CARD_WIDTH <= bounds.right;
  const left = (counterpartX > x - CARD_GAP && fitsLeft) || !fitsRight ? leftSide : rightSide;
  const top = Math.min(Math.max(y - 80, bounds.top), bounds.bottom - CARD_MAX_HEIGHT);
  const outsideTolerance = item.category !== 'matched' && item.distance !== null;

  return (
    <div
      className="pointer-events-auto absolute z-30 flex flex-col gap-[14px] bg-[#F7F6F1] px-[30px] py-[28px] shadow-[0_4px_20px_8px_rgba(0,0,0,0.5)]"
      style={{ left, top, width: CARD_WIDTH }}
      onClick={(event) => event.stopPropagation()}
    >
      <span className={`self-start px-[14px] text-[18px] font-bold leading-[32px] ${meta.chip}`}>{meta.label}</span>
      <h2 className="text-[48px] font-black leading-[normal] text-[#2C322F]">{item.point.id}</h2>
      <p className="text-[22px] font-bold text-[#6F7468]">{formatCoordinates(item.point)}</p>
      <div className="flex flex-col gap-2 border border-[#E5E2D9] bg-white px-[18px] py-[16px] text-[21px] font-bold">
        <span className="text-[#2C322F]">{counterpartText(item)}</span>
        {outsideTolerance && <span className="text-[#BC5646]">超出容許誤差 {tolerance} m</span>}
      </div>
      {/* a suspected unregistered well is put on the to-register list for follow-up; clicking again takes it off */}
      {item.category === 'unregistered' && (
        <button
          type="button"
          aria-pressed={toRegister}
          onClick={onToggleRegister}
          className={`mt-1 flex h-[62px] items-center justify-center border-2 border-[#62A4A7] text-[24px] font-bold transition-colors ${
            toRegister ? 'bg-white text-[#3F7A7E] hover:bg-[#D1E6E7]/40' : 'bg-[#62A4A7] text-white hover:bg-[#54999D]'
          }`}
        >
          {toRegister ? '✓ 已列入待登記（點擊取消）' : '列入待登記'}
        </button>
      )}
    </div>
  );
}

interface MapMarksProps {
  map: MapLibreMap | null;
  scale: number;
  filter: Category;
  selected: CompareItem | null;
  onSelect: (key: string | null) => void;
  cardBounds: Bounds;
  tolerance: number;
  toRegister: boolean;
  onToggleRegister: () => void;
}

// What follows the map as page elements: the selected well's marker, line and card (the other markers are the map's
// icon layer). Only this draws again while the map is dragged or zoomed, not the panel beside it.
function MapMarks({ map, scale, filter, selected, onSelect, cardBounds, tolerance, toRegister, onToggleRegister }: MapMarksProps) {
  // slid along as a whole while the map is panned, placed afresh when it comes to rest or zooms
  const { project: toScreen, layerRef } = useMapLayer(map, scale);
  // where a well is on the stage: its screen position, in the stage's (scaled) pixels
  const project = (point: GeoPoint) => {
    const { x, y } = toScreen(point);
    return { x: x / scale, y: y / scale };
  };
  return (
    <div ref={layerRef} className="absolute inset-0 will-change-transform">
      {selected && (
        <Marker
          item={selected}
          faded={selected.category !== filter}
          selected
          position={project(selected.point)}
          onSelect={() => onSelect(selected.key)}
        />
      )}
      {selected && <CounterpartLink item={selected} project={project} />}
      {selected && (
        <DetailCard
          item={selected}
          bounds={cardBounds}
          tolerance={tolerance}
          project={project}
          toRegister={toRegister}
          onToggleRegister={onToggleRegister}
        />
      )}
    </div>
  );
}

function Legend({ compared, position }: { compared: boolean; position: { right: number; bottom: number } }) {
  const entries: { style: string; label: string }[] = compared
    ? CATEGORY_ORDER.map((category) => ({ style: MARKER_STYLES[category], label: CATEGORIES[category].label }))
    : [{ style: MARKER_STYLES.detected, label: 'AI 辨識到的水井' }];

  return (
    <div className="absolute flex flex-col gap-[14px] bg-[#F7F6F1]/92 py-[22px] pl-[26px] pr-[32px] shadow-[0_4px_20px_8px_rgba(0,0,0,0.5)]" style={position}>
      <span className="text-[18px] font-bold text-[#6F7468]">圖例</span>
      {entries.map((entry) => (
        <span key={entry.label} className="flex items-center gap-[14px] text-[21px] font-bold text-[#2C322F]">
          <span className={`shrink-0 scale-[0.85] rounded-full ${entry.style}`} />
          {entry.label}
        </span>
      ))}
    </div>
  );
}

/* ─── Panel ─────────────────────────────────────────────────────── */

interface LegalRegister {
  fileName: string;
  wells: GeoPoint[];
  skippedRows: number;
}

function CsvBadge({ size }: { size: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center bg-[#62A4A7] font-black text-white" style={{ width: size, height: size, fontSize: size * 0.3 }}>
      CSV
    </span>
  );
}

function FileInput({ onFile, children, className }: { onFile: (file: File) => void; children: React.ReactNode; className: string }) {
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onFile(file);
    event.target.value = '';
  };
  return (
    <label className={`cursor-pointer ${className}`}>
      <input type="file" accept=".csv,text/csv" className="sr-only" onChange={onChange} />
      {children}
    </label>
  );
}

function DropZone({ onFile, error }: { onFile: (file: File) => void; error: string | null }) {
  const [dragging, setDragging] = useState(false);
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div className="flex flex-col gap-[16px]">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <FileInput
          onFile={onFile}
          className={`flex h-[200px] flex-col items-center justify-center gap-[12px] px-[24px] text-center border-2 border-dashed transition-colors duration-300 ${
            dragging ? 'border-[#62A4A7] bg-[#D1E6E7]/60' : 'border-[#62A4A7]/60 bg-white hover:bg-[#D1E6E7]/30'
          }`}
        >
          <CsvBadge size={52} />
          <span className="text-[20px] font-bold text-[#2C322F]">
            拖曳合法水井清冊至此，或 <span className="text-[#3F7A7E] underline underline-offset-4">選擇檔案</span>
          </span>
          <span className="text-[16px] font-medium text-[#6F7468]">需含緯度、經度欄位（WGS84 度），支援 UTF-8 / Big5</span>
        </FileInput>
      </div>
      {error && <p role="alert" className="text-[20px] font-bold text-[#BC5646]">{error}</p>}
      <a href={SAMPLE_CSV} download className="self-start text-[21px] font-bold text-[#3F7A7E] underline underline-offset-4">
        下載範例 CSV
      </a>
    </div>
  );
}

function HowItWorks() {
  return (
    <div className="flex flex-col gap-[18px] border-t border-[#E5E2D9] pt-[26px]">
      <span className="text-[21px] font-bold text-[#6F7468]">比對結果分為三類</span>
      {CATEGORY_ORDER.map((category) => (
        <span key={category} className="flex items-center gap-[14px] text-[22px] text-[#2C322F]">
          <span className={`shrink-0 rounded-full ${MARKER_STYLES[category]}`} />
          <span className="font-bold">{CATEGORIES[category].label}</span>
          <span className="text-[#6F7468]">{CATEGORIES[category].description}</span>
        </span>
      ))}
    </div>
  );
}

function RegisterFile({ register, onFile, error }: { register: LegalRegister; onFile: (file: File) => void; error: string | null }) {
  return (
    <div className="flex flex-col gap-[8px]">
      <div className="flex items-center gap-[12px] border-[1.5px] border-[#D1E6E7] bg-white px-[14px] py-[10px]">
        <CsvBadge size={40} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[18px] font-bold leading-tight text-[#2C322F]">{register.fileName}</span>
          <span className="text-[14px] font-medium text-[#6F7468]">
            {register.wells.length.toLocaleString()} 筆合法井{register.skippedRows > 0 && `・略過 ${register.skippedRows} 筆無效座標`}
          </span>
        </div>
        <FileInput onFile={onFile} className="shrink-0 text-[16px] font-bold text-[#3F7A7E] hover:underline">
          重新上傳
        </FileInput>
      </div>
      {error && <p role="alert" className="text-[16px] font-bold text-[#BC5646]">{error}</p>}
    </div>
  );
}

function ToleranceSlider({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <label className="flex h-[58px] items-center gap-[18px] border border-[#E5E2D9] bg-white px-[18px]" title="辨識座標與合法井相距在此之內，視為同一口井">
      <span className="shrink-0 text-[20px] font-bold text-[#6F7468]">容許誤差</span>
      <input
        type="range"
        min={TOLERANCE.min}
        max={TOLERANCE.max}
        step={TOLERANCE.step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-[6px] min-w-0 flex-1 accent-[#62A4A7]"
      />
      <span className="w-[80px] shrink-0 text-right text-[24px] font-bold text-[#2C322F]">{value} m</span>
    </label>
  );
}

// One compact chip per category side by side, count on the left and its name on the right; they double as the list filter
function StatCards({ counts, filter, onFilter }: { counts: Record<Category, number>; filter: Category; onFilter: (category: Category) => void }) {
  return (
    <div className="flex gap-[8px]">
      {CATEGORY_ORDER.map((category) => {
        const meta = CATEGORIES[category];
        const active = category === filter;
        return (
          <button
            key={category}
            type="button"
            aria-pressed={active}
            onClick={() => onFilter(category)}
            className={`flex h-[56px] min-w-0 flex-1 items-center gap-[10px] border-l-[5px] pl-[10px] pr-[8px] text-left transition-all duration-300 ${meta.card} ${meta.accent} ${
              active ? 'shadow-[0_0_0_2px_#2C322F]' : 'opacity-75 hover:opacity-100'
            }`}
          >
            <span className={`shrink-0 text-[26px] font-bold leading-none ${meta.number}`}>{counts[category].toLocaleString()}</span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[16px] font-bold text-[#2C322F]">{meta.label}</span>
              <span className="truncate text-[12px] font-medium text-[#6F7468]">{meta.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface ResultListProps {
  items: CompareItem[];
  filter: Category;
  toRegisterIds: Set<string>;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onExport: () => void;
}

function ResultList({ items, filter, toRegisterIds, selectedKey, onSelect, onExport }: ResultListProps) {
  const meta = CATEGORIES[filter];
  const shown = items.filter((item) => item.category === filter);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-[12px] pb-[8px]">
        <h3 className="truncate text-[20px] font-black text-[#2C322F]">{meta.listTitle}</h3>
        <button
          type="button"
          onClick={onExport}
          className="h-[32px] shrink-0 border-[1.5px] border-[#62A4A7] px-[12px] text-[15px] font-bold text-[#3F7A7E] transition-colors hover:bg-[#62A4A7] hover:text-white"
        >
          匯出比對結果
        </button>
      </div>
      <div className="scroll-indicator min-h-0 flex-1 overflow-y-auto">
        {shown.length === 0 && <p className="py-[28px] text-[21px] text-[#6F7468]">沒有這類水井</p>}
        {shown.map((item) => {
          const selected = item.key === selectedKey;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              className={`flex w-full items-center gap-[16px] border-b border-l-[5px] border-b-[#E5E2D9] px-[16px] py-[12px] text-left transition-colors ${
                selected ? `bg-white ${meta.accent}` : 'border-l-transparent hover:bg-white/60'
              }`}
            >
              <span className={`shrink-0 scale-[0.7] rounded-full ${MARKER_STYLES[item.category]}`} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-[10px] text-[24px] font-bold text-[#2C322F]">
                  {item.point.id}
                  {toRegisterIds.has(item.point.id) && <span className="bg-[#D1E6E7] px-[8px] text-[15px] leading-[24px] text-[#3F7A7E]">待登記</span>}
                </span>
                <span className="truncate text-[17px] font-medium text-[#6F7468]">
                  {formatCoordinates(item.point)}　{counterpartText(item)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

// mapRecord: the map compared, when opened from one on the map page
export default function ComparePage({ mapRecord }: { mapRecord?: RecordItem }) {
  const scale = useFitScale(STAGE);
  const layout = stageLayout(scale, useViewportSize());
  const [register, setRegister] = useState<LegalRegister | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tolerance, setTolerance] = useState(TOLERANCE.initial);
  const [filter, setFilter] = useState<Category>('unregistered');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  // Suspected unregistered wells picked out for registration follow-up (by detection id)
  const [toRegisterIds, setToRegisterIds] = useState<Set<string>>(() => new Set());

  const comparison = useMemo(() => (register ? compareWells(DETECTED_WELLS, register.wells, tolerance) : null), [register, tolerance]);
  const items = useMemo(() => (comparison ? toItems(comparison) : []), [comparison]);
  const { left: mapLeft, top: mapTop, width: mapWidth, height: mapHeight } = layout.map;
  // the map starts fitted to the wells in the area right of the panel (the padding is in screen pixels)
  const fit = useMemo(
    () => ({
      bounds: pointsBounds([...DETECTED_WELLS, ...(register?.wells ?? [])]),
      padding: {
        left: mapLeft * scale,
        top: mapTop * scale,
        right: (layout.width - mapLeft - mapWidth) * scale,
        bottom: (layout.height - mapTop - mapHeight) * scale,
      },
    }),
    [register, mapLeft, mapTop, mapWidth, mapHeight, layout.width, layout.height, scale],
  );
  // the survey map shared with the map page (SurveyMap), fitted here to the wells beside the panel; clicking it picks the
  // marker there, or closes the well's card
  const map = useSurveyMap({
    fit,
    onMapClick: (event) => setSelectedKey((map && iconAt(map, MARKER_LAYER, event.point, 'key')) || null),
  });
  const selected = items.find((item) => item.key === selectedKey) ?? null;
  useMarkerLayer(map, comparison ? items : null, filter, selectedKey, scale);

  // any move of the map closes the well's card (it would otherwise ride along over the panel). Every move here is the
  // user's (dragging, scrolling, pinching: a scroll zoom's movestart carries no originalEvent to tell) or the map
  // fitting itself to a resized window; picking a well from the list does not move it.
  useEffect(() => {
    if (!map) return;
    const close = () => setSelectedKey(null);
    map.on('movestart', close);
    return () => {
      map.off('movestart', close);
    };
  }, [map]);
  const counts = { matched: comparison?.matched.length ?? 0, unregistered: comparison?.unregistered.length ?? 0, missing: comparison?.missing.length ?? 0 };

  const loadFile = async (file: File) => {
    const result = parseLegalWellsCsv(decodeCsv(await file.arrayBuffer()));
    if (!result.ok) {
      setError(`「${file.name}」無法讀取：${result.error}`);
      return;
    }
    setError(null);
    setRegister({ fileName: file.name, wells: result.wells, skippedRows: result.skippedRows });
    setFilter('unregistered');
    setSelectedKey(null);
  };

  const toggleToRegister = (id: string) =>
    setToRegisterIds((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const changeFilter = (category: Category) => {
    setFilter(category);
    setSelectedKey(null);
  };

  return (
    // over the shared survey map (SurveyMap): lets drags and clicks through to it, except on its own parts
    <div className="pointer-events-none relative h-screen overflow-hidden" style={{ fontFamily: 'var(--font-noto-serif-tc), serif' }}>

      {/* lets drags and clicks through to the map, except on the markers, cards and panel */}
      <div className="pointer-events-none absolute inset-0">
        <div className="relative" style={{ width: layout.width, height: layout.height, zoom: scale }}>
          {/* page parts: fade out, then in, when moving to or from the map page, while the map itself stays still */}
          <div className="absolute inset-0" style={pagePart('compare-map')}>
            <MapMarks
              map={map}
              scale={scale}
              filter={filter}
              selected={selected}
              onSelect={setSelectedKey}
              cardBounds={{ left: mapLeft - 60, right: layout.width - layout.gutter, top: layout.top, bottom: layout.height - layout.bottomGap }}
              tolerance={tolerance}
              toRegister={selected !== null && toRegisterIds.has(selected.point.id)}
              onToggleRegister={() => selected && toggleToRegister(selected.point.id)}
            />
            <Legend compared={comparison !== null} position={{ right: layout.gutter, bottom: layout.bottomGap }} />
          </div>
          <div className="pointer-events-auto absolute" style={{ ...pagePart('compare-export'), left: layout.gutter, bottom: layout.bottomGap }}>
            <ExportEntry />
          </div>

          {/* grown out of the map page's comparison shortcut */}
          <SharedTransition name={SHARED.compareArea}>
            <section
              className="pointer-events-auto absolute flex flex-col gap-[22px] bg-[#F7F6F1] px-[44px] pb-[36px] pt-[40px] shadow-[0_4px_20px_8px_rgba(0,0,0,0.5)]"
              style={{ left: layout.gutter, top: layout.panelTop, bottom: layout.panelBottom, width: PANEL_WIDTH }}
            >
              <header className="flex flex-col gap-[10px]">
                <h1 className="text-[32px] font-black leading-[normal] text-[#2C322F]">合法水井比對</h1>
                {/* the explanation is only needed before a register is uploaded; afterwards the room goes to the results */}
                {!register && (
                  <p className="text-[20px] font-medium leading-[1.5] text-[#6F7468]">
                    上傳既有合法水井清冊（CSV），與 AI 辨識座標比對，
                    <br />
                    找出疑似未登記的水井。
                  </p>
                )}
              </header>

              {register && comparison ? (
                <>
                  <RegisterFile register={register} onFile={loadFile} error={error} />
                  <ToleranceSlider value={tolerance} onChange={setTolerance} />
                  <StatCards counts={counts} filter={filter} onFilter={changeFilter} />
                  <ResultList
                    items={items}
                    filter={filter}
                    toRegisterIds={toRegisterIds}
                    selectedKey={selectedKey}
                    onSelect={setSelectedKey}
                    onExport={() => downloadCsv(RESULT_FILE_NAME, buildComparisonCsv(comparison, toRegisterIds))}
                  />
                </>
              ) : (
                <>
                  <DropZone onFile={loadFile} error={error} />
                  <HowItWorks />
                </>
              )}
            </section>
          </SharedTransition>
        </div>
      </div>

      <BackToMapLink href="/map" mapFile={mapRecord}>
        <CursorCoordinates map={map} />
      </BackToMapLink>
    </div>
  );
}
