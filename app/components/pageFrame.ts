'use client';

import { useSyncExternalStore } from 'react';
import { subscribeToResize } from './useFitScale';

// Pages line their content up with the shared navbar, which is fixed and never scaled.
export const NAVBAR_HEIGHT = 120;
// The navbar's logo and login button sit this far in from the window's sides (md and up)
export const PAGE_GUTTER = 112;
// Gap between the navbar and the content, and between the content and the window's bottom edge
export const PAGE_GAP = 24;
export const CONTENT_TOP = NAVBAR_HEIGHT + PAGE_GAP;

// Space around the content box, for a FitStage that should fill it
export const FRAME_MARGIN_X = 2 * PAGE_GUTTER;
export const FRAME_MARGIN_Y = CONTENT_TOP + PAGE_GAP;

export interface ViewportSize {
  width: number;
  height: number;
}

// The Figma frame size, used on the server and during hydration
const SERVER_VIEWPORT: ViewportSize = { width: 1920, height: 1080 };
let currentViewport = SERVER_VIEWPORT;

// The same object until the size changes, as useSyncExternalStore requires
function readViewport(): ViewportSize {
  const width = document.documentElement.clientWidth;
  const height = window.innerHeight;
  if (width !== currentViewport.width || height !== currentViewport.height) currentViewport = { width, height };
  return currentViewport;
}

// Window size in CSS pixels, read on the very first render of a client-side navigation
export function useViewportSize(): ViewportSize {
  return useSyncExternalStore(subscribeToResize, readViewport, () => SERVER_VIEWPORT);
}
