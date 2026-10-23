'use client';

// The compare image of the check page (a capture over another, split by a line dragged up and down) and the view that
// grows any well photo over the whole page to zoom into, with their buttons; also the map card's photo uses the latter

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode, type RefObject } from 'react';
import Image from 'next/image';
import { fileUrl } from '../utils/api';
import { formatDate, type Capture } from '../utils/captures';
import { MAX_SCALE, MIN_SCALE, UNZOOMED, panBy, zoomAt, type ZoomView } from '../utils/imageZoom';

export const EASE = 'ease-[var(--ease-expo)] motion-reduce:transition-none';

const KEY_STEP = 2;
const KEY_STEP_LARGE = 10;

/* ─── Roles ─────────────────────────────────────────────────────── */

// The newest capture is always the current one; any older capture can be picked to compare against it
export type Role = 'compare' | 'current';

export const ROLE_LABEL: Record<Role, string> = { compare: '比較', current: '目前' };
export const ROLE_COLOR: Record<Role, string> = { compare: 'bg-[#62A4A7]', current: 'bg-[#3F7A7E]' };

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

/* ─── Compare view ──────────────────────────────────────────────── */

// Square photo of the well in a capture, centred on it (from the backend; the frame's colour where it has none)
export function CaptureImage({ capture }: { capture: Capture }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- from the backend, with the token in its address
    <img
      src={fileUrl(capture.image)}
      alt=""
      draggable={false}
      className="absolute inset-0 h-full w-full object-cover"
      onError={(event) => (event.currentTarget.style.visibility = 'hidden')}
    />
  );
}

// Tag naming which side of the comparison an image half is, in the same colors as the timeline
function CompareTag({ role, date, className }: { role: Role; date: string; className: string }) {
  return (
    <span className={`pointer-events-none absolute left-4 flex items-stretch text-[18px] font-bold leading-[32px] shadow-[0_2px_8px_rgba(0,0,0,0.25)] ${className}`}>
      <span className={`px-3 text-white ${ROLE_COLOR[role]}`}>{ROLE_LABEL[role]}</span>
      <span className="bg-[#2C322F]/70 px-3 text-white">{date}</span>
    </span>
  );
}

// Chevron on the divider grip, pointing the way the line can be dragged
function GripChevron({ direction }: { direction: 'up' | 'down' }) {
  return (
    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={direction === 'up' ? 'M2 6.5 6 2.5l4 4' : 'M2 1.5l4 4 4-4'} />
    </svg>
  );
}

// Square button over the image's top right corner; pressing it does not move the divider or the image underneath
export function ImageButton({ label, pressed, disabled, onClick, children }: { label: string; pressed?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={onClick}
      className="flex h-[44px] w-[44px] items-center justify-center bg-[#2C322F]/70 text-white shadow-[0_2px_8px_rgba(0,0,0,0.25)] outline-none transition-colors hover:bg-[#2C322F] focus-visible:shadow-[0_0_0_3px_#62A4A7] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-[#2C322F]/70"
    >
      {children}
    </button>
  );
}

export function ButtonIcon({ path, children }: { path?: string; children?: ReactNode }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {path && <path d={path} />}
      {children}
    </svg>
  );
}

export function MarkerIcon({ shown }: { shown: boolean }) {
  return (
    <ButtonIcon path="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z">
      <circle cx="12" cy="10" r="2.2" />
      {!shown && <path d="M3 3l18 18" />}
    </ButtonIcon>
  );
}

export const EXPAND_PATH = 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5';
const CLOSE_PATH = 'M6 6l12 12M18 6 6 18';
const ZOOM_IN_PATH = 'M12 5v14M5 12h14';
const ZOOM_OUT_PATH = 'M5 12h14';
// each button press zooms by this much; each wheel notch by less
const ZOOM_STEP = 1.5;
const WHEEL_ZOOM = 0.0015;

// The well's marker over a photo centred on it: its tip on the photo's middle (where the well is), placed by % to stay
// there at any size
export function WellMarkerPin({ style }: { style?: CSSProperties }) {
  return (
    <div className="pointer-events-none absolute inset-0" style={style}>
      <Image src="/check/marker.svg" alt="水井位置" width={60} height={95} className="absolute left-[43.35%] top-[45.54%] h-auto w-[8.5%] max-w-none" />
    </div>
  );
}

interface CompareSurfaceProps {
  captures: Capture[];
  compareIndex: number;
  // where the divider is, % from the top of the frame
  position: number;
  onPosition: (position: number) => void;
  markerShown: boolean;
  // the frame's side (CSS)
  size: string | number;
  // zoomed in on (the expanded view); the inline one is never zoomed
  view?: ZoomView;
  // the expanded view: dragging the image moves it (only the grip moves the divider); inline, dragging anywhere moves
  // the divider
  onPan?: (dx: number, dy: number) => void;
  buttons: ReactNode;
  surfaceRef: RefObject<HTMLDivElement | null>;
  // the current capture's date in the bottom corner (not in the expanded view)
  currentDate?: boolean;
  // hidden in place while the expanded view stands for it
  hidden?: boolean;
}

// Compared capture on top, current capture below, split by a line dragged up and down (neither line nor compared date
// with a single capture)
export function CompareSurface({ captures, compareIndex, position, onPosition, markerShown, size, view = UNZOOMED, onPan, buttons, surfaceRef, currentDate = true, hidden = false }: CompareSurfaceProps) {
  const currentIndex = captures.length - 1;
  // a single capture: nothing to compare it with
  const comparing = captures.length > 1;
  const compared = captures[compareIndex];
  const current = captures[currentIndex];
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  // the photos, zoomed about the frame's middle; the marker only follows where the well (the middle) goes
  const zoomed = { transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` };
  const followed = { transform: `translate(${view.x}px, ${view.y}px)` };

  const moveTo = (clientY: number) => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const { top, height } = surface.getBoundingClientRect();
    onPosition(clampPercent(((clientY - top) / height) * 100));
  };

  // dragging the divider: from anywhere inline, from its grip in the expanded view
  const startDivider = (event: PointerEvent<HTMLElement>) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    moveTo(event.clientY);
  };
  const dragDivider = (event: PointerEvent<HTMLElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) moveTo(event.clientY);
  };
  // dragging the image (expanded)
  const startPan = (event: PointerEvent<HTMLElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    lastPoint.current = { x: event.clientX, y: event.clientY };
  };
  const pan = (event: PointerEvent<HTMLElement>) => {
    const last = lastPoint.current;
    if (!onPan || !last || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    onPan(event.clientX - last.x, event.clientY - last.y);
    lastPoint.current = { x: event.clientX, y: event.clientY };
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    const moves: Record<string, (current: number) => number> = {
      ArrowUp: (current) => current - step,
      ArrowDown: (current) => current + step,
      Home: () => 0,
      End: () => 100,
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    onPosition(clampPercent(move(position)));
  };

  const surfaceHandlers = onPan
    ? { onPointerDown: startPan, onPointerMove: pan, onPointerUp: () => (lastPoint.current = null) }
    : comparing
      ? { onPointerDown: startDivider, onPointerMove: dragDivider }
      : {};
  const cursor = onPan ? (view.scale > 1 ? 'cursor-grab active:cursor-grabbing' : '') : comparing ? 'cursor-ns-resize' : '';

  return (
    <div
      ref={surfaceRef}
      className={`group relative shrink-0 touch-none select-none overflow-hidden bg-[#464A3A] ${cursor}`}
      style={{ width: size, height: size, visibility: hidden ? 'hidden' : undefined }}
      {...surfaceHandlers}
    >
      {/* current capture underneath, compared capture clipped on top */}
      <div className="absolute inset-0" style={zoomed}>
        <CaptureImage capture={current} />
      </div>
      {comparing && (
        <div className="absolute inset-0" style={{ clipPath: `inset(0 0 ${100 - position}% 0)` }}>
          <div className="absolute inset-0" style={zoomed}>
            <CaptureImage capture={compared} />
          </div>
        </div>
      )}

      {markerShown && <WellMarkerPin style={followed} />}

      <div className="absolute right-4 top-4 flex flex-col gap-[8px]">{buttons}</div>

      {comparing && <CompareTag role="compare" date={formatDate(compared.capturedAt)} className="top-4" />}
      {currentDate && <CompareTag role="current" date={formatDate(current.capturedAt)} className="bottom-4" />}

      {/* divider: a line in the timeline's colors with a grip in the middle */}
      {comparing && (
        <>
          <div
            className="pointer-events-none absolute inset-x-0 h-[3px] -translate-y-1/2 bg-gradient-to-b from-[#62A4A7] to-[#3F7A7E] shadow-[0_0_0_1px_rgba(255,255,255,0.7),0_2px_10px_rgba(0,0,0,0.35)]"
            style={{ top: `${position}%` }}
          />
          <div
            role="slider"
            tabIndex={0}
            aria-label="影像分割線"
            aria-orientation="vertical"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(position)}
            aria-valuetext={`${formatDate(compared.capturedAt)} 佔 ${Math.round(position)}%`}
            onKeyDown={onKeyDown}
            {...(onPan ? { onPointerDown: startDivider, onPointerMove: dragDivider } : {})}
            className={`absolute left-1/2 flex h-[30px] w-[72px] -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-[6px] rounded-full border-2 border-white bg-[#2C322F] text-white shadow-[0_4px_14px_rgba(0,0,0,0.4)] outline-none transition-transform duration-300 ${EASE} group-active:scale-110 focus-visible:shadow-[0_0_0_3px_#62A4A7] ${onPan ? 'cursor-ns-resize' : ''}`}
            style={{ top: `${position}%` }}
          >
            <GripChevron direction="up" />
            <span className="h-[14px] w-px bg-white/40" />
            <GripChevron direction="down" />
          </div>
        </>
      )}
    </div>
  );
}

// The frame's side in the expanded view: the page's whole height or width, whichever is less, with a margin
const EXPANDED_MARGIN = 48;
const EXPANDED_SIZE = `min(calc(100vw - ${2 * EXPANDED_MARGIN}px), calc(100vh - ${2 * EXPANDED_MARGIN}px))`;
// how long the image takes to grow out of the page and back into it
const EXPAND_MS = 450;

// Where the expanded frame sits, drawn at the page's image instead (origin): the expanded view grows from there and
// shrinks back to it
function atOrigin(origin: DOMRect | null): CSSProperties | undefined {
  if (!origin) return undefined;
  const size = Math.min(window.innerWidth, window.innerHeight) - 2 * EXPANDED_MARGIN;
  const left = (window.innerWidth - size) / 2;
  const top = (window.innerHeight - size) / 2;
  return { transform: `translate(${origin.left - left}px, ${origin.top - top}px) scale(${origin.width / size})` };
}

interface ExpandedViewProps extends Omit<CompareSurfaceProps, 'size' | 'view' | 'onPan' | 'buttons' | 'surfaceRef'> {
  // where the page's image is now
  measureOrigin: () => DOMRect | null;
  onToggleMarker: () => void;
  // once it has shrunk back
  onClose: () => void;
}

// The image over the whole page (not the browser's full screen), grown out of the page's image, to zoom into with the
// wheel or the buttons and drag around; Esc, the close button or a click beside it shrinks it back
export function ExpandedView({ measureOrigin, onToggleMarker, onClose, ...surface }: ExpandedViewProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState(UNZOOMED);
  // drawn at the page's image (first, to grow from it, and last, to shrink back to it); null: at full size
  const [origin, setOrigin] = useState<DOMRect | null>(measureOrigin);
  const closing = useRef(false);
  const frameSize = () => surfaceRef.current?.getBoundingClientRect().width ?? 0;
  const zoomBy = (factor: number, at = { x: 0, y: 0 }) => setView((current) => zoomAt(current, current.scale * factor, at, frameSize()));

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    setView(UNZOOMED);
    setOrigin(measureOrigin());
    setTimeout(onClose, EXPAND_MS);
  }, [measureOrigin, onClose]);

  // grow once drawn at the page's image (two frames: the first lays it out there)
  useEffect(() => {
    let frame = requestAnimationFrame(() => (frame = requestAnimationFrame(() => setOrigin(null))));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Esc closes only this view (before the page's own Esc, e.g. the map page closing its card)
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      close();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [close]);

  // the wheel zooms about the pointer (a listener of its own: React's cannot stop the page zooming on a pinch)
  useEffect(() => {
    const element = surfaceRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const { left, top, width, height } = element.getBoundingClientRect();
      const at = { x: event.clientX - left - width / 2, y: event.clientY - top - height / 2 };
      setView((current) => zoomAt(current, current.scale * Math.exp(-event.deltaY * WHEEL_ZOOM), at, width));
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="放大檢視水井影像"
      className="fixed inset-0 z-[90] flex items-center justify-center"
      style={{ fontFamily: 'var(--font-noto-serif-tc), serif' }}
      onClick={(event) => event.target === event.currentTarget && close()}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-[#2C322F]/95 transition-opacity motion-reduce:transition-none ${origin ? 'opacity-0' : 'opacity-100'}`}
        style={{ transitionDuration: `${EXPAND_MS}ms` }}
      />
      <div
        className={`relative origin-top-left transition-transform ${EASE}`}
        style={{ ...atOrigin(origin), transitionDuration: `${EXPAND_MS}ms` }}
      >
        <CompareSurface
          {...surface}
          surfaceRef={surfaceRef}
          size={EXPANDED_SIZE}
          view={view}
          currentDate={false}
          onPan={(dx, dy) => setView((current) => panBy(current, dx, dy, frameSize()))}
          buttons={
            <>
              <ImageButton label="關閉放大檢視" onClick={close}>
                <ButtonIcon path={CLOSE_PATH} />
              </ImageButton>
              <ImageButton label={surface.markerShown ? '隱藏水井定位標' : '顯示水井定位標'} pressed={surface.markerShown} onClick={onToggleMarker}>
                <MarkerIcon shown={surface.markerShown} />
              </ImageButton>
              <ImageButton label="放大" disabled={view.scale >= MAX_SCALE} onClick={() => zoomBy(ZOOM_STEP)}>
                <ButtonIcon path={ZOOM_IN_PATH} />
              </ImageButton>
              <ImageButton label="縮小" disabled={view.scale <= MIN_SCALE} onClick={() => zoomBy(1 / ZOOM_STEP)}>
                <ButtonIcon path={ZOOM_OUT_PATH} />
              </ImageButton>
              <span className="bg-[#2C322F]/70 py-[4px] text-center text-[14px] font-bold text-white">{Math.round(view.scale * 100)}%</span>
            </>
          }
        />
      </div>
    </div>
  );
}
