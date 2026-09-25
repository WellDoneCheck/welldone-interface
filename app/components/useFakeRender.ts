'use client';

import { useCallback, useEffect, useState } from 'react';

export type RenderStatus = 'idle' | 'rendering' | 'done';

const TICK_MS = 50;

// Fake render job: runs for `durationMs` and reports progress from 0 to 1.
// Stand-in until the real 3D generation is connected.
export function useFakeRender(durationMs: number) {
  const [status, setStatus] = useState<RenderStatus>('idle');
  const [progress, setProgress] = useState(0);

  const start = useCallback(() => {
    if (status === 'rendering') return;
    setProgress(0);
    setStatus('rendering');
  }, [status]);

  useEffect(() => {
    if (status !== 'rendering') return;
    const startedAt = performance.now();
    const timer = setInterval(() => {
      const elapsed = Math.min(1, (performance.now() - startedAt) / durationMs);
      setProgress(elapsed);
      if (elapsed >= 1) {
        clearInterval(timer);
        setStatus('done');
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [status, durationMs]);

  return { status, progress, start };
}
