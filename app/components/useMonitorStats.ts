'use client';

import { useEffect, useState } from 'react';
import { useSiteChrome } from './SiteChrome';
import { REFRESH_MS } from '../utils/monitorLive';
import { fetchMonitorStats, type MonitorStats } from '../utils/monitorStats';

// The backend's monitor figures, read again every REFRESH_MS until paused; null while nobody is logged in or before
// the first answer (a failed read keeps the last one)
export function useMonitorStats(paused: boolean): MonitorStats | null {
  const { session } = useSiteChrome();
  const userId = session?.userId ?? null;
  const [read, setRead] = useState<{ userId: string; stats: MonitorStats } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let current = true;
    const refresh = () =>
      fetchMonitorStats().then(
        (stats) => current && setRead({ userId, stats }),
        () => undefined,
      );
    refresh();
    const timer = paused ? null : setInterval(refresh, REFRESH_MS);
    return () => {
      current = false;
      if (timer) clearInterval(timer);
    };
  }, [userId, paused]);

  return read && read.userId === userId ? read.stats : null;
}
