'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ModelRender from './ModelRender';
import type { RecordItem } from '../data/mapRecords';
import { useFitScale, type FitStage } from './useFitScale';

// Info card and tabs are laid out for the 1920×1080 Figma frame and scaled to the viewport
const OVERLAY_STAGE: FitStage = { width: 1920, height: 1080, marginX: 0, marginY: 0, minViewportWidth: 0 };
const CARD_RIGHT_MARGIN = 80;
const NAVBAR_HEIGHT = 120;
const CARD_ID = 'well-card';

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
  wellId: string;
  markerActive: boolean;
  onMarkerClick: () => void;
  onDismiss: () => void;
}

// Static stand-in for the map: the titiler tile layer will replace the background image.
// The marker and outline are positioned in % of the image so they stay on the same spot.
function MapCanvas({ wellId, markerActive, onMarkerClick, onDismiss }: MapCanvasProps) {
  return (
    <div className="absolute inset-0 overflow-hidden" onClick={onDismiss}>
      <div className="absolute left-0 top-0 aspect-[1958/1102] w-[max(100vw,calc(100dvh*1958/1102))]">
        <Image src="/aerial-bg.png" alt="" fill priority sizes="100vw" className="object-cover" />
        <Image
          src="/map/outline.svg"
          alt=""
          width={695}
          height={83}
          className="absolute left-[22.727%] top-[16.016%] h-auto w-[35.495%] max-w-none"
        />
        <WellMarker wellId={wellId} active={markerActive} onClick={onMarkerClick} />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_left,rgba(3,3,3,0.4)_11.058%,rgba(35,35,35,0.28)_30.288%,rgba(255,255,255,0)_100%)]" />
    </div>
  );
}

// Clicking the pin opens (or closes) the well's info card
function WellMarker({ wellId, active, onClick }: { wellId: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={`水井 ${wellId}`}
      aria-expanded={active}
      aria-controls={CARD_ID}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="group absolute left-[17.263%] top-[19.601%] w-[4.596%] cursor-pointer"
    >
      {/* ping on the ground point while the card is closed */}
      {!active && (
        <span className="absolute bottom-[6%] left-1/2 h-2 w-6 -translate-x-1/2 rounded-full bg-white/70 animate-ping motion-reduce:hidden" />
      )}
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
function WellPhoto({ viewMode, wellId }: { viewMode: ViewMode; wellId: string }) {
  if (viewMode === 'aerial') return <VerifyLink wellId={wellId} />;
  return <ModelRender />;
}

// The aerial photo is the way into the verification page for this well
function VerifyLink({ wellId }: { wellId: string }) {
  return (
    <Link
      href={`/check?record=${wellId}`}
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
  );
}

interface CardFaceProps {
  record: RecordItem;
  faceMode: ViewMode;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  className?: string;
}

// One side of the film: photo, well info and the tabs bound to it. Inert (not clickable, focusable or read out) while facing away.
function CardFace({ record, faceMode, viewMode, onViewModeChange, className = '' }: CardFaceProps) {
  return (
    <div
      inert={viewMode !== faceMode}
      className={`absolute inset-0 bg-[#F7F6F1] p-4 shadow-[0_4px_20px_8px_rgba(0,0,0,0.5)] [backface-visibility:hidden] ${className}`}
    >
      <div className="h-[640px] w-[640px]">
        <WellPhoto viewMode={faceMode} wellId={record.id} />
      </div>

      <h2 className="mt-6 px-1 text-[48px] font-black leading-[normal] text-[#2C322F]">{record.id}</h2>
      <div className="mt-px flex flex-col gap-[13px] px-1">
        <InfoRow icon="/map/icon-location.png" text={record.coordinates} />
        <InfoRow icon="/map/icon-time.png" text={record.timestamp.slice(0, 16)} />
      </div>

      {VIEW_TABS.map((tab) => (
        <ViewTab key={tab.mode} {...tab} active={viewMode === tab.mode} onSelect={onViewModeChange} />
      ))}
    </div>
  );
}

// The whole film flips: aerial view on the front, model view on the back
function InfoCard({ record, viewMode, onViewModeChange }: { record: RecordItem; viewMode: ViewMode; onViewModeChange: (mode: ViewMode) => void }) {
  const flipped = viewMode === 'model';

  return (
    <div id={CARD_ID} className="relative h-[869px] w-[680px] [perspective:2400px]">
      <div
        className={`absolute inset-0 transition-transform duration-[900ms] ${MOTION} [transform-style:preserve-3d] ${
          flipped ? '[transform:rotateY(180deg)]' : '[transform:rotateY(0deg)]'
        }`}
      >
        <CardFace record={record} faceMode="aerial" viewMode={viewMode} onViewModeChange={onViewModeChange} />
        <CardFace
          record={record}
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
  record: RecordItem;
  // Arriving from the import page with a chosen map: show its card right away
  openCardOnArrival: boolean;
}

export default function MapPage({ record, openCardOnArrival }: MapPageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('aerial');
  const [cardOpen, setCardOpen] = useState(false);
  const scale = useFitScale(OVERLAY_STAGE);

  useEffect(() => {
    if (!openCardOnArrival) return;
    const timer = setTimeout(() => setCardOpen(true), ARRIVAL_CARD_DELAY_MS);
    return () => clearTimeout(timer);
  }, [openCardOnArrival]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCardOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="relative h-screen overflow-hidden" style={{ fontFamily: 'var(--font-noto-serif-tc), serif' }}>
      <MapCanvas
        wellId={record.id}
        markerActive={cardOpen}
        onMarkerClick={() => setCardOpen((open) => !open)}
        onDismiss={() => setCardOpen(false)}
      />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-end"
        style={{ top: NAVBAR_HEIGHT, paddingRight: CARD_RIGHT_MARGIN * scale }}
      >
        <div
          aria-hidden={!cardOpen}
          className={`transition-transform duration-700 ${MOTION} ${
            cardOpen ? 'pointer-events-auto translate-x-0' : 'translate-x-[calc(100%+160px)]'
          }`}
          style={{ zoom: scale }}
        >
          <InfoCard record={record} viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
      </div>
    </div>
  );
}
