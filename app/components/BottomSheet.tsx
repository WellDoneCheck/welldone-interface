'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { CONTENT_TOP } from './pageFrame';

const SLIDE_MS = 600;
// Letting go of the handle this far down, or flicking it down this fast (px per ms) over at least FLICK_MIN_PX, closes it
const CLOSE_DRAG_PX = 120;
const CLOSE_FLICK_SPEED = 0.6;
const FLICK_MIN_PX = 24;

type Phase = 'below' | 'raised' | 'leaving';

interface BottomSheetProps {
  // what the sheet is, for screen readers
  label: string;
  // called once the sheet has slid away (e.g. to go back to the page underneath)
  onClosed: () => void;
  // a view-transition-name for the whole sheet, so page transitions can animate it as one layer
  layerName?: string;
  children: ReactNode;
}

// A panel pulled up from the bottom over the current page, which stays in view behind a dimmed backdrop. It stops where
// pages start their content under the navbar, scrolls inside itself, and closes by dragging or tapping its handle,
// tapping the backdrop, or Escape.
export default function BottomSheet({ label, onClosed, layerName, children }: BottomSheetProps) {
  const [phase, setPhase] = useState<Phase>('below');
  const [dragY, setDragY] = useState<number | null>(null);
  const drag = useRef<{ startY: number; lastY: number; lastTime: number; speed: number } | null>(null);
  const hasClosed = useRef(false);

  const finish = useCallback(() => {
    if (hasClosed.current) return;
    hasClosed.current = true;
    onClosed();
  }, [onClosed]);

  const close = useCallback(() => {
    setDragY(null);
    setPhase('leaving');
    // in case the slide never ends with a transitionend (e.g. with reduced motion)
    setTimeout(finish, SLIDE_MS + 100);
  }, [finish]);

  // wait two frames so the content is laid out and painted before the panel starts to move
  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setPhase('raised'));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  // the page behind stays put while the sheet is open
  useEffect(() => {
    const { style } = document.documentElement;
    const previous = style.overflow;
    style.overflow = 'hidden';
    return () => {
      style.overflow = previous;
    };
  }, []);

  const startDrag = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startY: event.clientY, lastY: event.clientY, lastTime: event.timeStamp, speed: 0 };
    setDragY(0);
  };

  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current) return;
    const elapsed = Math.max(event.timeStamp - current.lastTime, 1);
    current.speed = (event.clientY - current.lastY) / elapsed;
    current.lastY = event.clientY;
    current.lastTime = event.timeStamp;
    // only downwards: pulling up past the top gives a little resistance instead
    const offset = event.clientY - current.startY;
    setDragY(offset > 0 ? offset : offset / 6);
  };

  // a tap on the handle (no real movement) closes it too
  const endDrag = () => {
    const current = drag.current;
    drag.current = null;
    if (!current) return;
    const offset = current.lastY - current.startY;
    const flicked = offset > FLICK_MIN_PX && current.speed > CLOSE_FLICK_SPEED;
    if (offset > CLOSE_DRAG_PX || flicked || Math.abs(offset) < 4) close();
    else setDragY(null);
  };

  const raised = phase === 'raised';
  const panelOffset = raised ? `${dragY ?? 0}px` : '100%';

  return (
    <div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-40" style={{ viewTransitionName: layerName }}>
      {/* a layer of its own on page changes (`${layerName}-shade`), so it can fade while the panel slides away */}
      <div
        aria-hidden
        onClick={close}
        className={`absolute inset-0 bg-[rgba(20,24,22,0.45)] transition-opacity ease-[var(--ease-expo)] motion-reduce:transition-none ${
          raised ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ transitionDuration: `${SLIDE_MS}ms`, viewTransitionName: layerName && `${layerName}-shade` }}
      />

      <div
        className={`absolute inset-x-0 bottom-0 will-change-transform motion-reduce:transition-none ${dragY === null ? 'transition-transform ease-[var(--ease-expo)]' : ''}`}
        style={{ top: CONTENT_TOP, transform: `translateY(${panelOffset})`, transitionDuration: `${SLIDE_MS}ms` }}
        onTransitionEnd={(event) => {
          if (event.target === event.currentTarget && phase === 'leaving') finish();
        }}
      >
        {/* its shadow fades in and out as it slides (parked below the window, it would cast it over the bottom edge): a
            layer of its own fading, not a shadow changing, so the slide is never repainted (a stutter on every frame) */}
        <div
          aria-hidden
          className={`absolute inset-0 rounded-t-[28px] shadow-[0_-16px_48px_rgba(0,0,0,0.35)] transition-opacity ease-[var(--ease-expo)] motion-reduce:transition-none ${
            raised ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ transitionDuration: `${SLIDE_MS}ms` }}
        />
        <div className="relative flex h-full flex-col overflow-hidden rounded-t-[28px] bg-[#F7F6F1]">
          <button
            type="button"
            aria-label={`收合${label}`}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            // Enter or Space on the focused handle (a pointer's click is already handled by the drag)
            onClick={(event) => event.detail === 0 && close()}
            className="group flex h-[36px] w-full shrink-0 cursor-grab touch-none items-center justify-center outline-none active:cursor-grabbing"
          >
            <span className="h-[5px] w-[56px] rounded-full bg-[#2C322F]/25 transition-[width,background-color] duration-300 group-hover:w-[72px] group-hover:bg-[#2C322F]/40 group-focus-visible:bg-[#62A4A7]" />
          </button>
          {/* content sized to the window width would overflow by the scrollbar: it only scrolls up and down */}
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">{children}</div>
        </div>
      </div>
    </div>
  );
}
