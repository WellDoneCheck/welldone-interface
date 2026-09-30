'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ModelRender from './ModelRender';
import ExportEntry from './ExportEntry';
import CompareEntry from './CompareEntry';
import MapPhoto, { MapShade, MAP_IMAGE } from './MapPhoto';
import SharedTransition, { PageBackgroundTransition, SHARED, TO_CHECK, pagePart } from './SharedTransition';
import type { RecordItem } from '../data/mapRecords';
import { rememberVisit } from '../utils/lastVisit';
import { useFitScale, type FitStage } from './useFitScale';
import { CONTENT_TOP, FRAME_MARGIN_Y, PAGE_GUTTER, useViewportSize } from './pageFrame';

const CARD_WIDTH = 680;
const CARD_HEIGHT = 869;
// Type and card scale with the window width like the 1920px Figma frame, but the card must also fit under the navbar
const OVERLAY_STAGE: FitStage = { width: 1920, height: CARD_HEIGHT, marginX: 0, marginY: FRAME_MARGIN_Y, minViewportWidth: 0 };
// The view tabs stick out this far past the card's right edge; the tabs' outer edge lines up with the navbar
const TAB_OVERHANG = 55;
const CARD_ID = 'well-card';

// A pin is this wide in % of the photo's width (and as tall: the pin image is square)
const PIN_WIDTH = 4.596;
// Leader line in the photo's Figma pixels: it leaves the pin this far right of and below the pin's top-left corner,
// rises to a peak, then runs to the card, meeting its left edge this far below the card's top
const LEADER = { fromPin: { x: 107, y: 43 }, rise: 82, cardOffsetY: 98 };

// Top-left corner of a record's pin in the photo's pixels
function pinCorner(record: RecordItem) {
  return { x: (record.pin.left / 100) * MAP_IMAGE.width, y: (record.pin.top / 100) * MAP_IMAGE.height };
}

// The page transition to the check page zooms the map in on the selected pin's tip (see --well-focus in globals.css,
// where --map-image-width is the photo's width on screen)
function setZoomFocus(record: RecordItem) {
  const corner = pinCorner(record);
  const pinSize = (PIN_WIDTH / 100) * MAP_IMAGE.width;
  const x = (corner.x + pinSize / 2) / MAP_IMAGE.width;
  const y = (corner.y + pinSize * 0.85) / MAP_IMAGE.width;
  document.documentElement.style.setProperty('--well-focus', `calc(var(--map-image-width) * ${x}) calc(var(--map-image-width) * ${y})`);
}

type ViewMode = 'aerial' | 'model';

// Each tab keeps its own color; the selected one sticks out further
const VIEW_TABS: { mode: ViewMode; label: string; top: string; color: string }[] = [
  { mode: 'aerial', label: '空拍圖', top: 'top-[34px]', color: 'bg-[#62A4A7]' },
  { mode: 'model', label: '立體圖', top: 'top-[217px]', color: 'bg-[#BC5646]' },
];

// The card slides in this long after arriving from the import page
const ARRIVAL_CARD_DELAY_MS = 400;

/* ─── Map layer ─────────────────────────────────────────────────── */

interface MapCanvasProps {
  records: RecordItem[];
  selectedId: string;
  cardOpen: boolean;
  onPinClick: (id: string) => void;
  onDismiss: () => void;
}

// The marker and outline are positioned in % of the photo so they stay on the same spot.
function MapCanvas({ records, selectedId, cardOpen, onPinClick, onDismiss }: MapCanvasProps) {
  return (
    <PageBackgroundTransition>
      <div className="absolute inset-0 overflow-hidden" onClick={onDismiss}>
        <MapPhoto>
          {records.map((record) => (
            <WellMarker
              key={record.id}
              record={record}
              selected={record.id === selectedId}
              cardOpen={cardOpen}
              onClick={() => onPinClick(record.id)}
            />
          ))}
        </MapPhoto>
        <MapShade />
      </div>
    </PageBackgroundTransition>
  );
}

// A well's pin; clicking it selects that well and opens its card (or closes the card if it is already showing it)
function WellMarker({ record, selected, cardOpen, onClick }: { record: RecordItem; selected: boolean; cardOpen: boolean; onClick: () => void }) {
  const active = selected && cardOpen;
  return (
    <button
      type="button"
      aria-label={`水井 ${record.id}`}
      aria-expanded={active}
      aria-controls={CARD_ID}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`group absolute cursor-pointer ${active ? 'z-10' : ''}`}
      style={{ left: `${record.pin.left}%`, top: `${record.pin.top}%`, width: `${PIN_WIDTH}%` }}
    >
      {/* ping on the selected well's ground point while its card is closed */}
      {selected && !cardOpen && (
        <span className="absolute bottom-[6%] left-1/2 h-2 w-6 -translate-x-1/2 rounded-full bg-white/70 animate-ping motion-reduce:hidden" />
      )}
      {/* the well's id above the pin on hover */}
      <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap bg-[#2C322F]/85 px-2 py-0.5 text-[13px] font-bold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        {record.id}
      </span>
      <Image
        src="/map/pin.png"
        alt=""
        width={90}
        height={90}
        className={`relative h-auto w-full max-w-none drop-shadow-[0_6px_6px_rgba(0,0,0,0.35)] transition-transform duration-300 ${MOTION} group-hover:-translate-y-1.5 ${
          active ? '-translate-y-1.5 scale-110' : ''
        }`}
      />
    </button>
  );
}

// Line from the selected well's pin to the open card, drawn out once the card has slid in
function LeaderLine({ record, scale }: { record: RecordItem; scale: number }) {
  const viewport = useViewportSize();
  const imageWidth = Math.max(viewport.width, (viewport.height * MAP_IMAGE.width) / MAP_IMAGE.height);
  const photoScale = imageWidth / MAP_IMAGE.width;
  const corner = pinCorner(record);
  const start = { x: (corner.x + LEADER.fromPin.x) * photoScale, y: (corner.y + LEADER.fromPin.y) * photoScale };
  const peak = { x: start.x + LEADER.rise * photoScale, y: start.y - LEADER.rise * photoScale };
  const end = {
    x: viewport.width - PAGE_GUTTER - (TAB_OVERHANG + CARD_WIDTH) * scale,
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
function WellPhoto({ viewMode, wellId, shared }: { viewMode: ViewMode; wellId: string; shared: boolean }) {
  if (viewMode === 'aerial') return <VerifyLink wellId={wellId} shared={shared} />;
  return <ModelRender />;
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
        <Image src="/aerial-tile.png" alt="空拍縮圖" width={640} height={640} />
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
  record: RecordItem;
  // this face's photo and well info move to and from the check page (only the front face of an open card)
  shared: boolean;
  faceMode: ViewMode;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  className?: string;
}

// One side of the film: photo, well info and the tabs bound to it. Inert (not clickable, focusable or read out) while facing away.
function CardFace({ record, shared, faceMode, viewMode, onViewModeChange, className = '' }: CardFaceProps) {
  return (
    <div
      inert={viewMode !== faceMode}
      className={`absolute inset-0 bg-[#F7F6F1] p-4 shadow-[0_4px_20px_8px_rgba(0,0,0,0.5)] [backface-visibility:hidden] ${className}`}
    >
      <div className="h-[640px] w-[640px]">
        <WellPhoto viewMode={faceMode} wellId={record.id} shared={shared} />
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
  record: RecordItem;
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
        <CardFace record={record} shared={open} faceMode="aerial" viewMode={viewMode} onViewModeChange={onViewModeChange} />
        <CardFace
          record={record}
          shared={false}
          faceMode="model"
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          className="[transform:rotateY(180deg)]"
        />
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

interface MapPageProps {
  // every well with a pin, and the one selected on arrival
  records: RecordItem[];
  record: RecordItem;
  // Arriving from the import page with a chosen map: its card slides in shortly after
  openCardOnArrival: boolean;
  // Coming back from the check page: the card is open from the start, so the well moves straight back into it
  cardOpenAtStart: boolean;
}

export default function MapPage({ records, record: initialRecord, openCardOnArrival, cardOpenAtStart }: MapPageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('aerial');
  const [cardOpen, setCardOpen] = useState(cardOpenAtStart);
  const [selectedId, setSelectedId] = useState(initialRecord.id);
  const record = records.find((candidate) => candidate.id === selectedId) ?? initialRecord;
  const scale = useFitScale(OVERLAY_STAGE);

  // before paint, so a page transition starting now already zooms in on this pin
  useLayoutEffect(() => setZoomFocus(record), [record]);
  // the navbar's 地圖檢視 comes back to the record shown last
  useEffect(() => rememberVisit('map', record.id), [record.id]);

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
    window.history.replaceState(null, '', `/map?record=${id}`);
  };

  useEffect(() => {
    if (!openCardOnArrival || cardOpenAtStart) return;
    const timer = setTimeout(() => setCardOpen(true), ARRIVAL_CARD_DELAY_MS);
    return () => clearTimeout(timer);
  }, [openCardOnArrival, cardOpenAtStart]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCardOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="relative h-screen overflow-hidden" style={{ fontFamily: 'var(--font-noto-serif-tc), serif' }}>
      <MapCanvas records={records} selectedId={selectedId} cardOpen={cardOpen} onPinClick={selectPin} onDismiss={() => setCardOpen(false)} />

      {/* keyed by well, so the line draws out again from each newly selected pin */}
      {cardOpen && <LeaderLine key={record.id} record={record} scale={scale} />}

      {/* lined up with the navbar's left edge; bottom edge lines up with the well card's */}
      <div className="absolute -translate-y-full" style={{ ...pagePart('map-shortcuts'), left: PAGE_GUTTER, top: CONTENT_TOP + CARD_HEIGHT * scale }}>
        <div className="flex gap-[12px]" style={{ zoom: scale }}>
          <ExportEntry />
          <CompareEntry />
        </div>
      </div>

      <div className="pointer-events-none absolute" style={{ ...pagePart('map-card'), top: CONTENT_TOP, right: PAGE_GUTTER + TAB_OVERHANG * scale }}>
        <div
          aria-hidden={!cardOpen}
          className={`transition-transform duration-700 ${MOTION} ${
            cardOpen ? 'pointer-events-auto translate-x-0' : 'translate-x-[calc(100%+400px)]'
          }`}
          style={{ zoom: scale }}
        >
          <InfoCard record={record} open={cardOpen} viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
      </div>
    </div>
  );
}
