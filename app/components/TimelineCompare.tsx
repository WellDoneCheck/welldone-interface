'use client';

import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import Image from 'next/image';
import { dayPeriodLabel, describeGap, formatDate, formatMonthDay, formatYear, type Capture } from '../data/captures';

const EASE = 'ease-[var(--ease-expo)] motion-reduce:transition-none';

// The compared imagery is square; the film strip below it is as wide as the image
const IMAGE_SIZE = 702;
// The placeholder tile has an empty strip along its bottom; only its top-left square (about 74%) holds imagery
const TILE_CONTENT_SIZE = '135%';
const KEY_STEP = 2;
const KEY_STEP_LARGE = 10;

/* ─── Selection ─────────────────────────────────────────────────── */

interface Selection {
  earlier: number;
  later: number;
}

// Clicking a capture moves whichever selected end is closer to it, so earlier < later always holds
export function nextSelection({ earlier, later }: Selection, clicked: number): Selection {
  if (clicked === earlier || clicked === later) return { earlier, later };
  if (clicked < earlier) return { earlier: clicked, later };
  if (clicked > later) return { earlier, later: clicked };
  return clicked - earlier < later - clicked ? { earlier: clicked, later } : { earlier, later: clicked };
}

// Fake difference between captures until real imagery is connected
function captureFilter(index: number, total: number): string {
  const progress = index / Math.max(total - 1, 1);
  return `hue-rotate(${Math.round((progress - 0.5) * 14)}deg) saturate(${(0.82 + progress * 0.3).toFixed(2)}) brightness(${(0.94 + progress * 0.1).toFixed(2)})`;
}

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

/* ─── Compare view ──────────────────────────────────────────────── */

interface CompareViewProps {
  captures: Capture[];
  selection: Selection;
}

// Square view of a capture's imagery (the tile's content square scaled up to fill the frame)
function CaptureImage({ index, total, size }: { index: number; total: number; size: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ filter: captureFilter(index, total) }}>
      <div className="absolute left-0 top-0" style={{ width: TILE_CONTENT_SIZE, height: TILE_CONTENT_SIZE }}>
        <Image src="/aerial-tile.png" alt="" fill sizes={`${Math.round(size * 1.35)}px`} className="object-cover" draggable={false} />
      </div>
    </div>
  );
}

function CompareView({ captures, selection }: CompareViewProps) {
  const [position, setPosition] = useState(50);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const earlier = captures[selection.earlier];
  const later = captures[selection.later];

  const moveTo = useCallback((clientX: number) => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const { left, width } = surface.getBoundingClientRect();
    setPosition(clampPercent(((clientX - left) / width) * 100));
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    moveTo(event.clientX);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) moveTo(event.clientX);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    const moves: Record<string, (current: number) => number> = {
      ArrowLeft: (current) => current - step,
      ArrowRight: (current) => current + step,
      Home: () => 0,
      End: () => 100,
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    setPosition((current) => clampPercent(move(current)));
  };

  return (
    <div
      ref={surfaceRef}
      className="relative shrink-0 cursor-ew-resize touch-none select-none overflow-hidden bg-[#464A3A]"
      style={{ width: IMAGE_SIZE, height: IMAGE_SIZE }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
    >
      {/* later capture underneath, earlier capture clipped on top */}
      <CaptureImage index={selection.later} total={captures.length} size={IMAGE_SIZE} />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <CaptureImage index={selection.earlier} total={captures.length} size={IMAGE_SIZE} />
      </div>

      {/* well marker, placed by % so it stays on the same spot of the square image */}
      <Image
        src="/check/marker.svg"
        alt="水井位置"
        width={60}
        height={95}
        className="pointer-events-none absolute left-[47.3%] top-[9.1%] h-auto w-[8.5%] max-w-none"
      />

      <span className="pointer-events-none absolute left-3 top-3 bg-[#2C322F]/65 px-3 py-[3px] text-base font-bold text-white">
        {formatDate(earlier.capturedAt)}
      </span>
      <span className="pointer-events-none absolute right-3 top-3 bg-[#2C322F]/65 px-3 py-[3px] text-base font-bold text-white">
        {formatDate(later.capturedAt)}
      </span>

      {/* divider */}
      <div className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white" style={{ left: `${position}%` }} />
      <div
        role="slider"
        tabIndex={0}
        aria-label="影像分割線"
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        aria-valuetext={`${formatDate(earlier.capturedAt)} 佔 ${Math.round(position)}%`}
        onKeyDown={onKeyDown}
        className="absolute top-1/2 flex h-[46px] w-[18px] -translate-x-1/2 -translate-y-1/2 items-center justify-center border-2 border-[#2C322F] bg-white outline-none focus-visible:shadow-[0_0_0_3px_#62A4A7]"
        style={{ left: `${position}%` }}
      >
        <span className="h-[22px] w-0.5 bg-[#6F7468]" />
      </div>
    </div>
  );
}

/* ─── Film strip timeline ───────────────────────────────────────── */

// Each capture is a frame of a film strip: a preview of that capture with its date under it
const STRIP_PADDING = 26;
const FRAME_WIDTH = 76;
const FRAME_SIZE = 64;
const STRIP_HEIGHT = 186;
const BRACKET_Y = 168;

const frameLeft = (index: number, total: number) =>
  STRIP_PADDING + (index * (IMAGE_SIZE - 2 * STRIP_PADDING - FRAME_WIDTH)) / Math.max(total - 1, 1);
const frameCenter = (index: number, total: number) => frameLeft(index, total) + FRAME_WIDTH / 2;

type FrameRole = 'earlier' | 'later' | null;

interface FilmFrameProps {
  capture: Capture;
  index: number;
  total: number;
  role: FrameRole;
  period: string | null;
  onSelect: (index: number) => void;
}

function FilmFrame({ capture, index, total, role, period, onSelect }: FilmFrameProps) {
  const border =
    role === 'earlier'
      ? 'outline outline-[3px] outline-[#62A4A7] shadow-[0_0_0_7px_rgba(98,164,167,0.22)]'
      : role === 'later'
        ? 'outline outline-[3px] outline-[#3F7A7E] shadow-[0_0_0_7px_rgba(63,122,126,0.2)]'
        : 'opacity-80 group-hover:-translate-y-0.5 group-hover:opacity-100 group-focus-visible:opacity-100';

  return (
    <button
      type="button"
      aria-pressed={role !== null}
      aria-label={`${capture.capturedAt}${role === 'earlier' ? '，比對較早影像' : role === 'later' ? '，比對較晚影像' : '，點擊加入比對'}`}
      onClick={() => onSelect(index)}
      className="group absolute top-0 flex cursor-pointer flex-col items-center pt-2 outline-none"
      style={{ left: frameLeft(index, total), width: FRAME_WIDTH }}
    >
      {/* which side of the comparison this frame is — or, on hover, its exact time */}
      <span className="flex h-[22px] items-center justify-center">
        {role ? (
          <span className={`px-2 text-xs font-bold leading-[18px] text-white ${role === 'earlier' ? 'bg-[#62A4A7]' : 'bg-[#3F7A7E]'}`}>
            {role === 'earlier' ? '較早' : '較晚'}
          </span>
        ) : (
          <span className="hidden whitespace-nowrap bg-[#2C322F] px-2 text-xs font-bold leading-[18px] text-[#F7F6F1] group-hover:block group-focus-visible:block">
            {capture.capturedAt.slice(11)}
          </span>
        )}
      </span>

      <span className={`relative mt-2 block overflow-hidden transition-all duration-300 ${EASE} ${border}`} style={{ width: FRAME_SIZE, height: FRAME_SIZE }}>
        <CaptureImage index={index} total={total} size={FRAME_SIZE} />
      </span>

      <span className={`mt-2 text-[15px] font-bold leading-[18px] transition-colors duration-300 ${role ? 'text-[#2C322F]' : 'text-[#2C322F]/70 group-hover:text-[#2C322F]'}`}>
        {formatYear(capture.capturedAt)}
      </span>
      <span className={`text-xs font-normal leading-[15px] transition-colors duration-300 ${role ? 'text-[#6F7468]' : 'text-[#6F7468]/80 group-hover:text-[#6F7468]'}`}>
        {formatMonthDay(capture.capturedAt)}
        {period && <span className="ml-1">{period}</span>}
      </span>
    </button>
  );
}

interface FilmStripProps {
  captures: Capture[];
  selection: Selection;
  onSelect: (index: number) => void;
}

function FilmStrip({ captures, selection, onSelect }: FilmStripProps) {
  const total = captures.length;
  const earlierX = frameCenter(selection.earlier, total);
  const laterX = frameCenter(selection.later, total);
  const gap = describeGap(captures[selection.earlier].capturedAt, captures[selection.later].capturedAt);

  return (
    <div
      className="relative shrink-0 overflow-hidden border-t border-[#E5E2D9] bg-[#F7F6F1]"
      style={{ width: IMAGE_SIZE, height: STRIP_HEIGHT }}
    >
      {/* base rail under all frames */}
      <div className="absolute h-px bg-[#2C322F]/20" style={{ top: BRACKET_Y, left: frameCenter(0, total), right: IMAGE_SIZE - frameCenter(total - 1, total) }} />

      {/* bracket joining the two compared frames */}
      <div
        className={`absolute h-[2px] bg-gradient-to-r from-[#62A4A7] to-[#3F7A7E] transition-[left,width] duration-500 ${EASE}`}
        style={{ top: BRACKET_Y - 1, left: earlierX, width: laterX - earlierX }}
      />
      {[
        { x: earlierX, color: 'bg-[#62A4A7]' },
        { x: laterX, color: 'bg-[#3F7A7E]' },
      ].map(({ x, color }) => (
        <span
          key={color}
          className={`absolute h-[10px] w-[2px] -translate-x-1/2 transition-[left] duration-500 ${EASE} ${color}`}
          style={{ top: BRACKET_Y - 9, left: x }}
        />
      ))}
      <span
        className={`absolute -translate-x-1/2 whitespace-nowrap border border-[#62A4A7] bg-white px-2 text-xs leading-[18px] text-[#3F7A7E] transition-[left] duration-500 ${EASE}`}
        style={{ top: BRACKET_Y - 10, left: (earlierX + laterX) / 2 }}
      >
        相隔 {gap}
      </span>

      {captures.map((capture, index) => (
        <FilmFrame
          key={capture.id}
          capture={capture}
          index={index}
          total={total}
          role={index === selection.earlier ? 'earlier' : index === selection.later ? 'later' : null}
          period={dayPeriodLabel(captures, index)}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

/* ─── Panel ─────────────────────────────────────────────────────── */

export default function TimelineCompare({ captures }: { captures: Capture[] }) {
  const [selection, setSelection] = useState<Selection>({
    earlier: Math.max(captures.length - 3, 0),
    later: captures.length - 1,
  });

  return (
    <div
      className="flex flex-col bg-white shadow-[0_0_0_1px_rgba(44,50,47,0.14),0_4px_20px_0_rgba(0,0,0,0.5),0_10px_28px_0_rgba(44,50,47,0.06)]"
      style={{ width: IMAGE_SIZE }}
    >
      <CompareView captures={captures} selection={selection} />
      <FilmStrip captures={captures} selection={selection} onSelect={(index) => setSelection((current) => nextSelection(current, index))} />
    </div>
  );
}
