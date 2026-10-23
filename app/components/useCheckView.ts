'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSiteChrome } from './SiteChrome';
import { prefetch, useBackend, type Loaded } from './useBackend';
import { loadCheckView, type CheckView } from '../utils/routeRecords';

// How long a link into the check page holds on for the page to be read before it goes anyway
const READY_WAIT_MS = 1500;

const checkKey = (userId: string, code: string | null) => `check:${userId}:${code ?? ''}`;

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
    if (userId && code) prefetch(checkKey(userId, code), () => loadCheckView(code));
  }, [userId, code]);
}

// A link into a well's check page that never arrives before the page is ready: readAhead (on hover or focus) starts
// reading it; clicked while it is still being read, the link holds on until it is (READY_WAIT_MS at most), then goes,
// so the page shows at once and its shared elements fly over
export function useCheckLink(code: string, transitionTypes: string[]) {
  const router = useRouter();
  const { session } = useSiteChrome();
  const going = useRef(false);
  const href = `/check?record=${code}`;
  const read = () => (session ? prefetch(checkKey(session.userId, code), () => loadCheckView(code)) : null);

  const onNavigate = (event: { preventDefault: () => void }) => {
    const reading = read();
    if (!reading) return;
    event.preventDefault();
    if (going.current) return;
    going.current = true;
    const waited = new Promise((resolve) => setTimeout(resolve, READY_WAIT_MS));
    Promise.race([reading, waited]).then(() => {
      going.current = false;
      router.push(href, { transitionTypes });
    });
  };

  return { href, onNavigate, readAhead: () => void read() };
}
