'use client';

import { useSyncExternalStore } from 'react';

// A Figma-sized area that should be scaled to fit the viewport
export interface FitStage {
  width: number;
  height: number;
  // Space kept free around the stage (px)
  marginX: number;
  marginY: number;
  // Below this viewport width no scaling is applied
  minViewportWidth: number;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 2;

function computeScale(stage: FitStage, viewportWidth: number, viewportHeight: number): number {
  if (viewportWidth < stage.minViewportWidth) return 1;
  const fit = Math.min(
    (viewportWidth - stage.marginX) / stage.width,
    (viewportHeight - stage.marginY) / stage.height,
  );
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, fit));
}

export function subscribeToResize(onResize: () => void): () => void {
  window.addEventListener('resize', onResize);
  return () => window.removeEventListener('resize', onResize);
}

// Scale that makes the Figma-sized stage fill the viewport (stage must be a module-level constant).
// Read from the window on the very first render of a client-side navigation, so the page never shows at the wrong
// size first; the server (and hydration) use 1 and update right after.
// withScrollbar measures the whole window, scrollbar included: a page that scrolls then scales like one that doesn't.
export function useFitScale(stage: FitStage, withScrollbar = false): number {
  return useSyncExternalStore(
    subscribeToResize,
    () => computeScale(stage, withScrollbar ? window.innerWidth : document.documentElement.clientWidth, window.innerHeight),
    () => 1,
  );
}
