'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { STATUS_META, WELL_TOTALS, type WellMarker, type WellStatus } from '../data/monitor';

const SERIF = { fontFamily: 'var(--font-noto-serif-tc), serif' };

const ZOOM_MIN = 1;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.25;

interface MonitorMapProps {
  markers: WellMarker[];
  // Only wells with this status are shown; null shows all
  filter: WellStatus | null;
  onFilterChange: (filter: WellStatus | null) => void;
  selectedId: string;
  onSelect: (recordId: string) => void;
}

/* ─── Marker ────────────────────────────────────────────────────── */

function MarkerDot({ marker, selected, zoom, onSelect }: { marker: WellMarker; selected: boolean; zoom: number; onSelect: () => void }) {
  const meta = STATUS_META[marker.status];

  return (
    <button
      type="button"
      aria-label={`${marker.recordId}，${meta.label}`}
      aria-pressed={selected}
      onClick={onSelect}
      className="group absolute z-10 flex h-8 w-8 items-center justify-center outline-none"
      style={{ left: `${marker.x}%`, top: `${marker.y}%`, transform: `translate(-50%, -50%) scale(${1 / zoom})` }}
    >
      <span
        className={`block border-2 border-white transition-all duration-300 group-hover:scale-125 group-focus-visible:shadow-[0_0_0_3px_#F7F6F1] ${meta.dot} ${
          selected ? 'h-5 w-5 shadow-[0_0_0_4px_rgba(255,255,255,0.55)]' : 'h-3.5 w-3.5'
        }`}
        style={{ transform: 'rotate(45deg)' }}
      />
    </button>
  );
}

/* ─── Filter tabs ───────────────────────────────────────────────── */

function StatusFilter({ filter, onChange }: { filter: WellStatus | null; onChange: (filter: WellStatus | null) => void }) {
  const total = Object.values(WELL_TOTALS).reduce((sum, count) => sum + count, 0);
  const tabs: { key: WellStatus | null; label: string; count: number }[] = [
    { key: null, label: '全部', count: total },
    ...(Object.keys(STATUS_META) as WellStatus[]).map((status) => ({ key: status, label: STATUS_META[status].label, count: WELL_TOTALS[status] })),
  ];

  return (
    <div role="group" aria-label="依辨識狀態篩選" className="flex border-2 border-[#3F7A7E] bg-white">
      {tabs.map((tab) => {
        const active = filter === tab.key;
        return (
          <button
            key={tab.label}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors duration-300 ${
              active ? 'bg-[#3F7A7E] font-bold text-white' : 'text-[#2C322F] hover:bg-[#D1E6E7]'
            }`}
          >
            {tab.key && <span className={`h-2 w-2 ${STATUS_META[tab.key].dot}`} style={{ transform: 'rotate(45deg)' }} />}
            {tab.label}
            <span className={`text-xs tabular-nums ${active ? 'text-white/70' : 'text-[#6F7468]'}`}>{tab.count.toLocaleString()}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Selected well ─────────────────────────────────────────────── */

function SelectedWell({ marker }: { marker: WellMarker }) {
  const meta = STATUS_META[marker.status];

  return (
    <div className="absolute inset-x-4 bottom-4 z-20 flex items-end justify-between gap-4 border-2 border-[#3F7A7E] bg-white p-4 shadow-[0_4px_2px_rgba(44,50,47,0.05)]">
      <div className="min-w-0">
        <p className="text-xs font-bold tracking-[0.05em] text-[#6F7468]">已選水井</p>
        <p className="mt-1 text-2xl font-bold text-[#2C322F]" style={SERIF}>
          {marker.recordId}
        </p>
        <div className="mt-2 flex items-center gap-3 text-sm text-[#6F7468]">
          <span className={`px-2 py-0.5 text-xs font-bold ${meta.badge}`}>{meta.label}</span>
          {marker.coordinates}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <p className="text-4xl font-bold leading-none text-[#3F7A7E]" style={SERIF}>
          {marker.confidence}%
        </p>
        <p className="text-xs text-[#6F7468]">辨識信賴度</p>
        <Link
          href={`/check?record=${marker.recordId}`}
          className="mt-1 bg-[#62A4A7] px-4 py-2 text-sm font-bold text-white transition-colors duration-300 hover:bg-[#54999D]"
        >
          前往驗證 →
        </Link>
      </div>
    </div>
  );
}

/* ─── Controls ──────────────────────────────────────────────────── */

function ControlButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center border-2 border-[#3F7A7E] bg-white text-[#2C322F] transition-colors duration-300 hover:bg-[#D1E6E7] active:scale-95 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/* ─── Map ───────────────────────────────────────────────────────── */

// Stand-in for the map: the titiler tile layer will replace the photo. Markers are placed in % of the view.
export default function MonitorMap({ markers, filter, onFilterChange, selectedId, onSelect }: MonitorMapProps) {
  const [zoom, setZoom] = useState(ZOOM_MIN);
  const selected = markers.find((marker) => marker.recordId === selectedId) ?? markers[0];
  const shown = markers.filter((marker) => filter === null || marker.status === filter);

  const changeZoom = (delta: number) => setZoom((current) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, current + delta)));

  return (
    <section aria-label="水井地圖" className="relative h-[848px] w-[630px] shrink-0 overflow-hidden border-[3px] border-[#3F7A7E] bg-[#2C322F]">
      <div
        className="absolute inset-0 transition-transform duration-500 ease-[var(--ease-expo)] motion-reduce:transition-none"
        style={{ transform: `scale(${zoom})` }}
      >
        <Image src="/aerial-bg.png" alt="" fill sizes="630px" className="object-cover object-[30%_center] [filter:saturate(0.8)_brightness(0.7)]" />
        {shown.map((marker) => (
          <MarkerDot key={marker.recordId} marker={marker} selected={marker.recordId === selected.recordId} zoom={zoom} onSelect={() => onSelect(marker.recordId)} />
        ))}
      </div>

      <div className="absolute left-3 top-3 z-20">
        <StatusFilter filter={filter} onChange={onFilterChange} />
      </div>

      <div className="absolute right-3 top-3 z-20 flex flex-col gap-2">
        <ControlButton label="放大" disabled={zoom >= ZOOM_MAX} onClick={() => changeZoom(ZOOM_STEP)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
        </ControlButton>
        <ControlButton label="回到預設縮放" onClick={() => setZoom(ZOOM_MIN)}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="9" cy="9" r="3" /><path d="M9 1.5v3M9 13.5v3M1.5 9h3M13.5 9h3" /></svg>
        </ControlButton>
        <ControlButton label="縮小" disabled={zoom <= ZOOM_MIN} onClick={() => changeZoom(-ZOOM_STEP)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 8h10" /></svg>
        </ControlButton>
      </div>

      <SelectedWell marker={selected} />
    </section>
  );
}
