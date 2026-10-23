'use client';

import { useSiteChrome } from './SiteChrome';
import { useBackend, type Loaded } from './useBackend';
import { loadMapView, type MapView } from '../utils/routeRecords';

// The imported map named in the address (or the newest finished one) with its wells and imagery, read again for each
// map and user; null while nobody is logged in (the backend answers only to them)
export function useMapView(recordId: string | null): Loaded<MapView> | null {
  const { session } = useSiteChrome();
  const loaded = useBackend(session ? `map:${session.userId}:${recordId ?? ''}` : null, () => loadMapView(recordId));
  return session ? loaded : null;
}
