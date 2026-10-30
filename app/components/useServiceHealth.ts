'use client';

import { useEffect, useState } from 'react';
import { useSiteChrome } from './SiteChrome';
import { REFRESH_MS } from '../utils/monitorLive';
import { fetchServiceHealth, nextReading, type ServiceReading } from '../utils/monitorServices';

// The backend's service checks, read again every REFRESH_MS until paused, each keeping its recent CPU readings, with the
// events their changes logged; null while nobody is logged in or before the first answer (a failed read keeps the last one)
export function useServiceHealth(paused: boolean): ServiceReading | null {
  const { session } = useSiteChrome();
  const userId = session?.userId ?? null;
  const [read, setRead] = useState<{ userId: string; reading: ServiceReading } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let current = true;
    const refresh = () =>
      fetchServiceHealth().then(
        (checks) =>
          current &&
          setRead((last) => ({ userId, reading: nextReading(last?.userId === userId ? last.reading : null, checks, Date.now()) })),
        () => undefined,
      );
    refresh();
    const timer = paused ? null : setInterval(refresh, REFRESH_MS);
    return () => {
      current = false;
      if (timer) clearInterval(timer);
    };
  }, [userId, paused]);

  return read && read.userId === userId ? read.reading : null;
}
