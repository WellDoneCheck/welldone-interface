'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ExportPage from './ExportPage';

const SLIDE_MS = 700;

type Phase = 'below' | 'raised' | 'leaving';

// The export page opened from another page: it slides up from the bottom over that page, which stays visible
// through the top of the sheet, and slides back down before returning to it. It sits under the navbar.
export default function ExportSheet() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('below');
  const hasLeft = useRef(false);

  // back to the page underneath once, when the slide down ends (or its time is up, e.g. with reduced motion)
  const leave = useCallback(() => {
    if (hasLeft.current) return;
    hasLeft.current = true;
    router.back();
  }, [router]);

  const close = useCallback(() => {
    setPhase('leaving');
    setTimeout(leave, SLIDE_MS + 100);
  }, [leave]);

  // wait two frames so the sheet's content is laid out and painted before it starts to move
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="資料匯出"
      className={`fixed inset-0 z-40 overflow-y-auto overscroll-contain transition-transform ease-[var(--ease-expo)] will-change-transform motion-reduce:transition-none ${
        phase === 'raised' ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ transitionDuration: `${SLIDE_MS}ms` }}
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget && phase === 'leaving') leave();
      }}
    >
      <ExportPage onClose={close} />
    </div>
  );
}
