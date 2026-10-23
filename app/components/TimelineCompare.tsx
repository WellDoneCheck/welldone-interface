'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import SharedTransition, { FROM_EXPORT_SHARE, SHARED } from './SharedTransition';
import { CaptureImage, CompareSurface, EASE, EXPAND_PATH, ExpandedView, ButtonIcon, ImageButton, MarkerIcon, ROLE_COLOR, ROLE_LABEL, type Role } from './CompareImage';
import { dayPeriodLabel, describeGap, formatMonthDay, formatYear, type Capture } from '../utils/captures';

// The compared imagery is square; the film strip beside it is as tall as the image
const IMAGE_SIZE = 702;

/* ─── Compare view ──────────────────────────────────────────────── */

interface CompareViewProps {
  captures: Capture[];
  compareIndex: number;
}

// The compare image in the page, and over the whole page when expanded: both show the same divider and marker
function CompareView({ captures, compareIndex }: CompareViewProps) {
  const [position, setPosition] = useState(50);
  const [markerShown, setMarkerShown] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const toggleMarker = () => setMarkerShown((shown) => !shown);
  const measureOrigin = useCallback(() => surfaceRef.current?.getBoundingClientRect() ?? null, []);
  const shared = { captures, compareIndex, position, onPosition: setPosition, markerShown };

  return (
    <>
      <SharedTransition name={SHARED.wellPhoto} share={FROM_EXPORT_SHARE}>
        <CompareSurface
          {...shared}
          surfaceRef={surfaceRef}
          size={IMAGE_SIZE}
          hidden={expanded}
          buttons={
            <>
              <ImageButton label="放大檢視" onClick={() => setExpanded(true)}>
                <ButtonIcon path={EXPAND_PATH} />
              </ImageButton>
              <ImageButton label={markerShown ? '隱藏水井定位標' : '顯示水井定位標'} pressed={markerShown} onClick={toggleMarker}>
                <MarkerIcon shown={markerShown} />
              </ImageButton>
            </>
          }
        />
      </SharedTransition>
      {/* on the page's body: out of the page's scaled stage, over everything */}
      {expanded &&
        createPortal(
          <ExpandedView {...shared} measureOrigin={measureOrigin} onToggleMarker={toggleMarker} onClose={() => setExpanded(false)} />,
          document.body,
        )}
    </>
  );
}

/* ─── Film strip timeline ───────────────────────────────────────── */

// Each capture is a frame of a vertical film strip to the right of the image, oldest at the top:
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
      className="relative shrink-0 overflow-y-auto overflow-x-hidden overscroll-contain border-l border-[#E5E2D9] bg-[#F7F6F1] [scrollbar-color:rgba(44,50,47,0.3)_transparent] [scrollbar-width:thin]"
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
      <CompareView captures={captures} compareIndex={compareIndex} />
      <FilmStrip captures={captures} compareIndex={compareIndex} onSelect={setCompareIndex} />
    </div>
  );
}
