'use client';

import { useEffect, useRef, useState } from 'react';

export type Loaded<T> = { status: 'loading' } | { status: 'failed'; message: string } | { status: 'ready'; value: T };

// The last answer for each key, shown at once when a page comes back to it (and its page transitions run as before)
// while it is read again
const answers = new Map<string, unknown>();

// Reads something from the backend, again whenever key changes; null reads nothing (e.g. nobody is logged in)
export function useBackend<T>(key: string | null, load: () => Promise<T>): Loaded<T> {
  const [result, setResult] = useState<{ key: string; loaded: Loaded<T> } | null>(null);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    if (key === null) return;
    let current = true;
    loadRef.current().then(
      (value) => {
        answers.set(key, value);
        if (current) setResult({ key, loaded: { status: 'ready', value } });
      },
      (error: Error) => current && setResult({ key, loaded: { status: 'failed', message: error.message } }),
    );
    return () => {
      current = false;
    };
  }, [key]);

  if (result?.key === key) return result.loaded;
  if (key !== null && answers.has(key)) return { status: 'ready', value: answers.get(key) as T };
  return { status: 'loading' };
}
