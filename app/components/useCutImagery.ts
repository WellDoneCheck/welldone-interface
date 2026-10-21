'use client';

import { useEffect, useState } from 'react';
import { fetchImagery, type Imagery } from '../utils/tileServer';

// A map's imagery: the one the page came with, or, for a map opened while it was being cut, read once it is cut
// (cut: known to be cut by now)
export function useCutImagery(taskId: string, imagery: Imagery | null, cut: boolean): Imagery | null {
  const [read, setRead] = useState<{ taskId: string; imagery: Imagery } | null>(null);

  useEffect(() => {
    if (imagery || !cut) return;
    let current = true;
    fetchImagery(taskId).then(
      (cutImagery) => current && setRead({ taskId, imagery: cutImagery }),
      () => undefined,
    );
    return () => {
      current = false;
    };
  }, [taskId, imagery, cut]);

  return imagery ?? (read?.taskId === taskId ? read.imagery : null);
}
