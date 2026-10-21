'use client';

import { useCallback, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import Image from 'next/image';
import SharedTransition, { FROM_EXPORT_SHARE, SHARED } from './SharedTransition';
import { fileUrl } from '../utils/api';
import { dayPeriodLabel, describeGap, formatDate, formatMonthDay, formatYear, type Capture } from '../utils/captures';

const EASE = 'ease-[var(--ease-expo)] motion-reduce:transition-none';

// The compared imagery is square; the film strip beside it is as tall as the image
const IMAGE_SIZE = 702;
const KEY_STEP = 2;
const KEY_STEP_LARGE = 10;

/* ─── Roles ─────────────────────────────────────────────────────── */

// The newest capture is always the current one; any older capture can be picked to compare against it
type Role = 'compare' | 'current';

const ROLE_LABEL: Record<Role, string> = { compare: '比較', current: '目前' };
const ROLE_COLOR: Record<Role, string> = { compare: 'bg-[#62A4A7]', current: 'bg-[#3F7A7E]' };

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

/* ─── Compare view ──────────────────────────────────────────────── */

interface CompareViewProps {
  captures: Capture[];
  compareIndex: number;
}

// Square photo of the well in a capture, centred on it (from the backend; the frame's colour where it has none)
function CaptureImage({ capture }: { capture: Capture }) {
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

// Compared capture on top, current capture below, split by a line dragged up and down
function CompareView({ captures, compareIndex }: CompareViewProps) {
  const [position, setPosition] = useState(50);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const currentIndex = captures.length - 1;
  const compared = captures[compareIndex];
  const current = captures[currentIndex];

  const moveTo = useCallback((clientY: number) => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const { top, height } = surface.getBoundingClientRect();
    setPosition(clampPercent(((clientY - top) / height) * 100));
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    moveTo(event.clientY);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) moveTo(event.clientY);
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
    setPosition((current) => clampPercent(move(current)));
  };

  return (
    <SharedTransition name={SHARED.wellPhoto} share={FROM_EXPORT_SHARE}>
      <div
        ref={surfaceRef}
        className="group relative shrink-0 cursor-ns-resize touch-none select-none overflow-hidden bg-[#464A3A]"
        style={{ width: IMAGE_SIZE, height: IMAGE_SIZE }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
      >
        {/* current capture underneath, compared capture clipped on top */}
        <CaptureImage capture={current} />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 0 ${100 - position}% 0)` }}>
          <CaptureImage capture={compared} />
        </div>

        {/* well marker, its tip on the middle of the photo (where the well is), placed by % to stay there */}
        <Image
          src="/check/marker.svg"
          alt="水井位置"
          width={60}
          height={95}
          className="pointer-events-none absolute left-[43.35%] top-[45.54%] h-auto w-[8.5%] max-w-none"
        />

        <CompareTag role="compare" date={formatDate(compared.capturedAt)} className="top-4" />
        <CompareTag role="current" date={formatDate(current.capturedAt)} className="bottom-4" />

        {/* divider: a line in the timeline's colors with a grip in the middle */}
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
          className={`absolute left-1/2 flex h-[30px] w-[72px] -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-[6px] rounded-full border-2 border-white bg-[#2C322F] text-white shadow-[0_4px_14px_rgba(0,0,0,0.4)] outline-none transition-transform duration-300 ${EASE} group-active:scale-110 focus-visible:shadow-[0_0_0_3px_#62A4A7]`}
          style={{ top: `${position}%` }}
        >
          <GripChevron direction="up" />
          <span className="h-[14px] w-px bg-white/40" />
          <GripChevron direction="down" />
        </div>
      </div>
    </SharedTransition>
  );
}

/* ─── Film strip timeline ───────────────────────────────────────── */

// Each capture is a frame of a vertical film strip beside the image, oldest at the top:
// a preview of that capture with its date to the right, and the compare bracket along the image edge.
// Frames spread over the image height; when there are too many to fit, the strip scrolls.
const STRIP_PADDING = 26;
const STRIP_WIDTH = 270;
const FRAME_HEIGHT = 84;
const FRAME_SIZE = 72;
const FRAME_LEFT = 18;
const MIN_FRAME_PITCH = 94;
const BRACKET_X = 238;

const framePitch = (total: number) =>
  Math.max(MIN_FRAME_PITCH, (IMAGE_SIZE - 2 * STRIP_PADDING - FRAME_HEIGHT) / Math.max(total - 1, 1));
const frameTop = (index: number, total: number) => STRIP_PADDING + index * framePitch(total);
const frameCenter = (index: number, total: number) => frameTop(index, total) + FRAME_HEIGHT / 2;
const stripHeight = (total: number) => frameTop(total - 1, total) + FRAME_HEIGHT + STRIP_PADDING;

type FrameRole = Role | null;

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
    role === 'compare'
      ? 'outline outline-[3px] outline-[#62A4A7] shadow-[0_0_0_7px_rgba(98,164,167,0.22)]'
      : role === 'current'
        ? 'outline outline-[3px] outline-[#3F7A7E] shadow-[0_0_0_7px_rgba(63,122,126,0.2)]'
        : 'opacity-80 group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100';

  return (
    <button
      type="button"
      // the current capture stays fixed
      disabled={role === 'current'}
      aria-pressed={role !== null}
      aria-label={`${capture.capturedAt}${role === 'compare' ? '，比較影像' : role === 'current' ? '，目前影像' : '，點擊設為比較影像'}`}
      onClick={() => onSelect(index)}
      className="group absolute flex cursor-pointer items-center gap-4 text-left outline-none disabled:cursor-default"
      style={{ top: frameTop(index, total), left: FRAME_LEFT, height: FRAME_HEIGHT }}
    >
      <span className={`relative block shrink-0 overflow-hidden transition-all duration-300 ${EASE} ${border}`} style={{ width: FRAME_SIZE, height: FRAME_SIZE }}>
        <CaptureImage capture={capture} />
      </span>

      <span className="flex flex-col items-start">
        {/* which side of the comparison this frame is — or, on hover, its exact time */}
        <span className="flex h-[24px] items-center">
          {role ? (
            <span className={`px-2 text-sm font-bold leading-[22px] text-white ${ROLE_COLOR[role]}`}>{ROLE_LABEL[role]}</span>
          ) : (
            <span className="hidden whitespace-nowrap bg-[#2C322F] px-2 text-sm font-bold leading-[22px] text-[#F7F6F1] group-hover:block group-focus-visible:block">
              {capture.capturedAt.slice(11)}
            </span>
          )}
        </span>
        <span className={`text-[22px] font-bold leading-[26px] transition-colors duration-300 ${role ? 'text-[#2C322F]' : 'text-[#2C322F]/70 group-hover:text-[#2C322F]'}`}>
          {formatYear(capture.capturedAt)}
        </span>
        <span className={`whitespace-nowrap text-[15px] font-bold leading-[20px] transition-colors duration-300 ${role ? 'text-[#6F7468]' : 'text-[#6F7468]/80 group-hover:text-[#6F7468]'}`}>
          {formatMonthDay(capture.capturedAt)}
          {period && <span className="ml-1">{period}</span>}
        </span>
      </span>
    </button>
  );
}

interface FilmStripProps {
  captures: Capture[];
  compareIndex: number;
  onSelect: (index: number) => void;
}

function FilmStrip({ captures, compareIndex, onSelect }: FilmStripProps) {
  const total = captures.length;
  const currentIndex = total - 1;
  const compareY = frameCenter(compareIndex, total);
  const currentY = frameCenter(currentIndex, total);
  const gap = describeGap(captures[compareIndex].capturedAt, captures[currentIndex].capturedAt);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // open at the newest end, where the current capture is
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }, []);

  return (
    <div
      ref={scrollerRef}
      className="relative shrink-0 overflow-y-auto overflow-x-hidden overscroll-contain border-r border-[#E5E2D9] bg-[#F7F6F1] [scrollbar-color:rgba(44,50,47,0.3)_transparent] [scrollbar-width:thin]"
      style={{ width: STRIP_WIDTH, height: IMAGE_SIZE }}
    >
      <div className="relative" style={{ height: stripHeight(total) }}>
        {/* base rail beside all frames */}
        <div className="absolute w-px bg-[#2C322F]/20" style={{ left: BRACKET_X, top: frameCenter(0, total), bottom: stripHeight(total) - frameCenter(total - 1, total) }} />

        {/* bracket joining the two compared frames */}
        <div
          className={`absolute w-[2px] bg-gradient-to-b from-[#62A4A7] to-[#3F7A7E] transition-[top,height] duration-500 ${EASE}`}
          style={{ left: BRACKET_X - 1, top: compareY, height: currentY - compareY }}
        />
        {[
          { y: compareY, color: ROLE_COLOR.compare },
          { y: currentY, color: ROLE_COLOR.current },
        ].map(({ y, color }) => (
          <span
            key={color}
            className={`absolute h-[2px] w-[10px] -translate-y-1/2 transition-[top] duration-500 ${EASE} ${color}`}
            style={{ left: BRACKET_X - 9, top: y }}
          />
        ))}
        <span
          className={`absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap border border-[#62A4A7] bg-white py-2 text-sm leading-[22px] text-[#3F7A7E] transition-[top] duration-500 [writing-mode:vertical-rl] ${EASE}`}
          style={{ left: BRACKET_X, top: (compareY + currentY) / 2 }}
        >
          相隔 {gap}
        </span>

        {captures.map((capture, index) => (
          <FilmFrame
            key={capture.id}
            capture={capture}
            index={index}
            total={total}
            role={index === compareIndex ? 'compare' : index === currentIndex ? 'current' : null}
            period={dayPeriodLabel(captures, index)}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Panel ─────────────────────────────────────────────────────── */

export default function TimelineCompare({ captures }: { captures: Capture[] }) {
  const [compareIndex, setCompareIndex] = useState(Math.max(captures.length - 3, 0));

  return (
    <div
      className="flex bg-white shadow-[0_0_0_1px_rgba(44,50,47,0.14),0_4px_20px_0_rgba(0,0,0,0.5),0_10px_28px_0_rgba(44,50,47,0.06)]"
      style={{ height: IMAGE_SIZE }}
    >
      <FilmStrip captures={captures} compareIndex={compareIndex} onSelect={setCompareIndex} />
      <CompareView captures={captures} compareIndex={compareIndex} />
    </div>
  );
}
