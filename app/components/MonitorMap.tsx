'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { Map as MapLibreMap } from 'maplibre-gl';
import TileMap, { type Bounds } from './TileMap';
import { STATUS_META, type WellMarker, type WellStatus } from '../data/monitor';
import { useSiteChrome } from './SiteChrome';
import { TAIWAN_BOUNDS, type Imagery } from '../utils/tileServer';

// the light control panels over the map, as on the rest of the monitor page (no backdrop blur: over a map being dragged
// it would be worked out again on every frame)
const OVERLAY = 'border border-[#2C322F]/10 bg-[#F7F6F1]/[0.94] shadow-[0_4px_16px_rgba(0,0,0,0.18)]';

// The padding that keeps the imagery clear of the filter tabs above and the selected well's panel below (in the panel's
// own pixels)
const PANEL_PADDING = { top: 70, bottom: 190, left: 24, right: 64 };
// Zooming in stops at a single well's surroundings
const ZOOM_IN_LIMIT = 21;

interface MonitorMapProps {
  // the newest finished map's imagery (null: none yet, or logged out) and its wells
  imagery: Imagery | null;
  markers: WellMarker[];
  // wells per status, for the filter counts
  totals: Record<WellStatus, number>;
  // Only wells with this status are shown; null shows all
  filter: WellStatus | null;
  onFilterChange: (filter: WellStatus | null) => void;
  selectedId: string;
  onSelect: (recordId: string) => void;
  // the page's layout scale (CSS zoom): the map inside undoes it, as MapLibre needs its pointer and size in real pixels
  scale: number;
}

/* ─── Marker ────────────────────────────────────────────────────── */

function MarkerDot({ marker, position, selected, onSelect }: { marker: WellMarker; position: { x: number; y: number }; selected: boolean; onSelect: () => void }) {
  const meta = STATUS_META[marker.status];

  return (
    <button
      type="button"
      aria-label={`${marker.recordId}，${meta.label}`}
      aria-pressed={selected}
      onClick={onSelect}
      className="group pointer-events-auto absolute z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center outline-none"
      style={{ left: position.x, top: position.y }}
    >
      {/* wells still to be checked pulse, to draw the eye */}
      {marker.status === 'pending' && !selected && (
        <span className={`absolute h-3.5 w-3.5 animate-ping opacity-60 motion-reduce:animate-none ${meta.dot}`} style={{ transform: 'rotate(45deg)' }} />
      )}
      <span
        className={`relative block border-2 border-white transition-all duration-300 group-hover:scale-125 group-focus-visible:shadow-[0_0_0_3px_#F7F6F1] ${meta.dot} ${
          selected ? 'h-5 w-5 shadow-[0_0_0_4px_rgba(255,255,255,0.55)]' : 'h-3.5 w-3.5'
        }`}
        style={{ transform: 'rotate(45deg)' }}
      />
    </button>
  );
}

/* ─── Filter tabs ───────────────────────────────────────────────── */

interface StatusFilterProps {
  totals: Record<WellStatus, number>;
  filter: WellStatus | null;
  onChange: (filter: WellStatus | null) => void;
}

function StatusFilter({ totals, filter, onChange }: StatusFilterProps) {
  const total = Object.values(totals).reduce((sum, count) => sum + count, 0);
  const tabs: { key: WellStatus | null; label: string; count: number }[] = [
    { key: null, label: '全部', count: total },
    ...(Object.keys(STATUS_META) as WellStatus[]).map((status) => ({ key: status, label: STATUS_META[status].label, count: totals[status] })),
  ];

  return (
    <div role="group" aria-label="依辨識狀態篩選" className={`flex ${OVERLAY}`}>
      {tabs.map((tab) => {
        const active = filter === tab.key;
        return (
          <button
            key={tab.label}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors duration-300 ${
              active ? 'bg-[#62A4A7]/20 font-bold text-[#2C322F]' : 'text-[#2C322F]/75 hover:bg-[#2C322F]/[0.06] hover:text-[#2C322F]'
            }`}
          >
            {tab.key && <span className={`h-2 w-2 ${STATUS_META[tab.key].dot}`} style={{ transform: 'rotate(45deg)' }} />}
            {tab.label}
            <span className="text-xs tabular-nums text-[#2C322F]/50">{tab.count.toLocaleString()}</span>
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
    <div className={`absolute inset-x-4 bottom-4 z-20 flex items-end justify-between gap-4 p-4 ${OVERLAY}`}>
      <div className="min-w-0">
        <p className="text-xs font-bold tracking-[0.05em] text-[#2C322F]/50">已選水井</p>
        <p className="mt-1 text-2xl font-semibold text-[#2C322F]">{marker.recordId}</p>
        <div className="mt-2 flex items-center gap-3 text-sm text-[#2C322F]/60">
          <span className="inline-flex items-center gap-1.5 text-[#2C322F]">
            <span className={`h-2 w-2 ${meta.dot}`} style={{ transform: 'rotate(45deg)' }} />
            {meta.label}
          </span>
          {marker.coordinates}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <p className="text-4xl font-semibold leading-none text-[#2C322F]">{marker.confidence === null ? '—' : `${marker.confidence}%`}</p>
        <p className="text-xs text-[#2C322F]/50">辨識信賴度</p>
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

// In place of the selected well's details before logging in: the wells' details and verification are for logged-in users
function LockedWell({ onLogin }: { onLogin: () => void }) {
  return (
    <div className={`absolute inset-x-4 bottom-4 z-20 flex items-center justify-between gap-4 p-4 ${OVERLAY}`}>
      <div className="min-w-0">
        <p className="text-xs font-bold tracking-[0.05em] text-[#2C322F]/50">水井詳情</p>
        <p className="mt-1 text-sm text-[#2C322F]/75">登入後可點選地圖上的水井，查看詳情並前往驗證</p>
      </div>
      <button
        type="button"
        onClick={onLogin}
        className="shrink-0 bg-[#62A4A7] px-4 py-2 text-sm font-bold text-white transition-colors duration-300 hover:bg-[#54999D]"
      >
        登入
      </button>
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
      className={`flex h-10 w-10 items-center justify-center text-[#2C322F] transition-colors duration-300 hover:bg-[#2C322F]/[0.06] active:scale-95 disabled:opacity-40 ${OVERLAY}`}
    >
      {children}
    </button>
  );
}

/* ─── Map ───────────────────────────────────────────────────────── */

// Draws again each time the map's zoom comes to rest (not on every frame of it)
function useZoomEnd(map: MapLibreMap | null) {
  const [, setZooms] = useState(0);
  useEffect(() => {
    if (!map) return;
    const onZoomEnd = () => setZooms((count) => count + 1);
    map.on('zoomend', onZoomEnd);
    return () => {
      map.off('zoomend', onZoomEnd);
    };
  }, [map]);
}

// Zoom in, back to the whole strip, zoom out; follows the map's zoom to know when a button can no longer be used
function ZoomControls({ map, fit }: { map: MapLibreMap | null; fit: { bounds: Bounds; padding: { top: number; bottom: number; left: number; right: number } } }) {
  useZoomEnd(map);
  return (
    <div className="absolute right-3 top-3 z-20 flex flex-col gap-2">
      <ControlButton label="放大" disabled={!map || map.getZoom() >= ZOOM_IN_LIMIT} onClick={() => map?.zoomIn()}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
      </ControlButton>
      <ControlButton label="回到整條航線" disabled={!map} onClick={() => map?.fitBounds(fit.bounds, { padding: fit.padding })}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="9" cy="9" r="3" /><path d="M9 1.5v3M9 13.5v3M1.5 9h3M13.5 9h3" /></svg>
      </ControlButton>
      <ControlButton label="縮小" disabled={!map || map.getZoom() <= map.getMinZoom()} onClick={() => map?.zoomOut()}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 8h10" /></svg>
      </ControlButton>
    </div>
  );
}

// The newest finished map's imagery (once logged in: the backend's tiles need it), dragged and zoomed inside the panel, with a marker on every well. Anyone sees the
// markers; picking one (its details, the way to verify it) asks to log in first, then picks it.
export default function MonitorMap({ imagery, markers, totals, filter, onFilterChange, selectedId, onSelect, scale }: MonitorMapProps) {
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const { isLoggedIn, requireLogin } = useSiteChrome();
  const selected = isLoggedIn ? (markers.find((marker) => marker.recordId === selectedId) ?? markers[0]) : null;
  const shown = markers.filter((marker) => filter === null || marker.status === filter);
  const { top, bottom, left, right } = PANEL_PADDING;
  const fit = { bounds: (imagery?.bounds ?? TAIWAN_BOUNDS) as Bounds, padding: { top: top * scale, bottom: bottom * scale, left: left * scale, right: right * scale } };

  return (
    <section aria-label="水井地圖" className="relative h-full w-[628px] shrink-0 overflow-hidden border border-[#2C322F]/10 bg-[#F7F6F1] shadow-[8px_8px_40px_0_rgba(0,0,0,0.25)]">
      <div className="absolute inset-0" style={{ zoom: 1 / scale }}>
        <TileMap imagery={imagery} fit={fit} interactive onReady={setMap}>
          {({ project }) =>
            shown.map((marker) => (
              <MarkerDot
                key={marker.recordId}
                marker={marker}
                position={project(marker)}
                selected={marker.recordId === selected?.recordId}
                onSelect={() => requireLogin(() => onSelect(marker.recordId))}
              />
            ))
          }
        </TileMap>
      </div>

      <div className="absolute left-3 top-3 z-20">
        <StatusFilter totals={totals} filter={filter} onChange={onFilterChange} />
      </div>

      <ZoomControls map={map} fit={fit} />

      {selected && <SelectedWell marker={selected} />}
      {!isLoggedIn && <LockedWell onLogin={() => requireLogin(() => {})} />}
    </section>
  );
}
