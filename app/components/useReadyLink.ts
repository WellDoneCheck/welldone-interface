'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';

// How long a link holds on for its page to be ready before it goes anyway
const READY_WAIT_MS = 1500;

// A link that never arrives before its page is ready: readAhead (on hover or focus) starts getting it ready; clicked
// while that is still under way, the link holds on until it is (READY_WAIT_MS at most), then goes, so the page shows
// at once and its page transition runs on it. read gives back what is under way, or null once it is ready.
export function useReadyLink(href: string, read: () => Promise<unknown> | null, transitionTypes: string[]) {
  const router = useRouter();
  const going = useRef(false);

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
