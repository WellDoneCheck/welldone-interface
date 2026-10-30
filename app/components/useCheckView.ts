'use client';

import { useEffect } from 'react';
import { useSiteChrome } from './SiteChrome';
import { prefetch, useBackend, type Loaded } from './useBackend';
import { useReadyLink } from './useReadyLink';
import { checkViewImages, loadCheckView, type CheckView } from '../utils/routeRecords';
import { readFileAhead } from '../utils/sharedFile';

const checkKey = (userId: string, code: string | null) => `check:${userId}:${code ?? ''}`;

// A well's check page read ahead (prefetch), its photos with it: once the page is read they are read too, without
// holding it up, so the page finds them in the browser's cache
function readCheckAhead(userId: string, code: string): Promise<void> | null {
  return prefetch(checkKey(userId, code), async () => {
    const view = await loadCheckView(code);
    checkViewImages(view).forEach(readFileAhead);
    return view;
  });
}

// The well named in the address (or the first of the newest finished map) with its map and captures, read again for
// each well and user; null while nobody is logged in (the backend answers only to them)
export function useCheckView(code: string | null): Loaded<CheckView> | null {
  const { session } = useSiteChrome();
  const loaded = useBackend(session ? checkKey(session.userId, code) : null, () => loadCheckView(code));
  return session ? loaded : null;
}

// Reads a well's check page ahead (code: the well's; null: none), so going there shows it at once and its shared
// elements (the well's photo, id, coordinates and time) fly over from this page instead of waiting for it to load
export function usePrefetchCheckView(code: string | null): void {
  const { session } = useSiteChrome();
  const userId = session?.userId;
  useEffect(() => {
    if (userId && code) readCheckAhead(userId, code);
  }, [userId, code]);
}

// A link into a well's check page that never arrives before the page is read (useReadyLink), so the page shows at
// once and its shared elements fly over
export function useCheckLink(code: string, transitionTypes: string[]) {
  const { session } = useSiteChrome();
  const read = () => (session ? readCheckAhead(session.userId, code) : null);
  return useReadyLink(`/check?record=${code}`, read, transitionTypes);
}
