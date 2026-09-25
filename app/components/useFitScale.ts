'use client';

import { useEffect, useState } from 'react';

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

// Scale that makes the Figma-sized stage fill the viewport (stage must be a module-level constant)
export function useFitScale(stage: FitStage): number {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const update = () =>
      setScale(computeScale(stage, document.documentElement.clientWidth, window.innerHeight));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [stage]);

  return scale;
}
