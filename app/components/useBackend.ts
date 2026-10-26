'use client';

import { useEffect, useRef, useState } from 'react';

export type Loaded<T> = { status: 'loading' } | { status: 'failed'; message: string } | { status: 'ready'; value: T };

// The last answer for each key, shown at once when a page comes back to it (and its page transitions run as before)
// while it is read again
const answers = new Map<string, unknown>();
// What is being read ahead (prefetch), by key
const reading = new Map<string, Promise<void>>();

// Reads it ahead for a page about to be opened, which then shows it at once (and its page transitions run, their
// shared elements already there): read once, the read under way to wait for, or null once it has been read. A failed
// read is left to the page (and can be read ahead again).
export function prefetch<T>(key: string, load: () => Promise<T>): Promise<void> | null {
  if (answers.has(key)) return null;
  const pending = reading.get(key);
  if (pending) return pending;
  const read = load()
    .then(
      (value) => void answers.set(key, value),
      () => undefined,
    )
    .finally(() => reading.delete(key));
  reading.set(key, read);
  return read;
}

// Several reads ahead (prefetch) as one: what to wait for while any is under way, or null once they all are done
export function whenAllRead(reads: (Promise<unknown> | null)[]): Promise<unknown> | null {
  const pending = reads.filter((read) => read !== null);
  return pending.length > 0 ? Promise.all(pending) : null;
}

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
