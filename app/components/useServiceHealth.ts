'use client';

import { useEffect, useState } from 'react';
import { useSiteChrome } from './SiteChrome';
import { REFRESH_MS, type LiveService } from '../utils/monitorLive';
import { fetchServiceHealth, liveServices } from '../utils/monitorServices';

// The backend's service checks, read again every REFRESH_MS until paused, each keeping its recent CPU readings; null
// while nobody is logged in or before the first answer (a failed read keeps the last one)
export function useServiceHealth(paused: boolean): LiveService[] | null {
  const { session } = useSiteChrome();
  const userId = session?.userId ?? null;
  const [read, setRead] = useState<{ userId: string; services: LiveService[] } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let current = true;
    const refresh = () =>
      fetchServiceHealth().then(
        (checks) =>
          current &&
          setRead((before) => ({ userId, services: liveServices(checks, before?.userId === userId ? before.services : []) })),
        () => undefined,
      );
    refresh();
    const timer = paused ? null : setInterval(refresh, REFRESH_MS);
    return () => {
      current = false;
      if (timer) clearInterval(timer);
    };
  }, [userId, paused]);

  return read && read.userId === userId ? read.services : null;
}
