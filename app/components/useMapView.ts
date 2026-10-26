'use client';

import { useSiteChrome } from './SiteChrome';
import { prefetch, useBackend, whenAllRead, type Loaded } from './useBackend';
import { useReadyLink } from './useReadyLink';
import { markOpeningMap } from './SharedTransition';
import { preloadMapLibre } from './TileMap';
import { loadMapView, type MapView } from '../utils/routeRecords';

const mapKey = (userId: string, recordId: string | null) => `map:${userId}:${recordId ?? ''}`;

// The imported map named in the address (or the newest finished one) with its wells and imagery, read again for each
// map and user; null while nobody is logged in (the backend answers only to them)
export function useMapView(recordId: string | null): Loaded<MapView> | null {
  const { session } = useSiteChrome();
  const loaded = useBackend(session ? mapKey(session.userId, recordId) : null, () => loadMapView(recordId));
  return session ? loaded : null;
}

// A link into an imported map's map page that never arrives before the page is ready (useReadyLink): its map read and
// the map's code loaded. Otherwise the page arrives on its loading screen and the map starts in the middle of the page
// transition, its code (a megabyte) parsed and its first tiles drawn in the transition's frames.
export function useMapLink(recordId: string, transitionTypes: string[]) {
  const { session } = useSiteChrome();
  const read = () => whenAllRead([session ? prefetch(mapKey(session.userId, recordId), () => loadMapView(recordId)) : null, preloadMapLibre()]);
  const link = useReadyLink(`/map?record=${recordId}`, read, transitionTypes);
  const onNavigate = (event: { preventDefault: () => void }) => {
    markOpeningMap();
    link.onNavigate(event);
  };
  return { ...link, onNavigate };
}
