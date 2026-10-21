'use client';

import { useEffect, useState } from 'react';
import { fetchWells, type MapWell } from '../utils/wells';
import type { NamedTask } from '../utils/tasks';

// A map's wells, read again whenever the AI has recognised more of its tiles (recognised: how many so far; null until
// known), as each may add wells; the wells the page came with until then
export function useRecognisedWells(task: Pick<NamedTask, 'id' | 'created_at'>, wells: MapWell[], recognised: number | null): MapWell[] {
  const [read, setRead] = useState<{ taskId: string; wells: MapWell[] } | null>(null);
  const { id, created_at } = task;

  useEffect(() => {
    if (recognised === null) return;
    let current = true;
    fetchWells({ id, created_at }).then(
      (latest) => current && setRead({ taskId: id, wells: latest }),
      () => undefined,
    );
    return () => {
      current = false;
    };
  }, [id, created_at, recognised]);

  return read?.taskId === id ? read.wells : wells;
}
