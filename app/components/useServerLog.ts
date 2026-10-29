'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchLogPage, withNewLines, type LogFilter, type LogPage, type LogSource } from '../utils/serverLogs';

// How often a followed log is read again for the lines written since
const POLL_MS = 3000;

interface FollowedLog {
  // the log and filter these lines are for
  key: string;
  lines: string[];
  // the last page read (null until one is)
  page: LogPage | null;
  error: string | null;
}

// A log's lines, newest last: its end at first, then every POLL_MS the lines written since (not while paused). A new
// source or filter starts over from the end of the log.
export function useServerLog(source: LogSource, filter: LogFilter, paused: boolean): FollowedLog {
  const key = `${source}|${filter.level ?? ''}|${filter.text}`;
  const [log, setLog] = useState<FollowedLog>({ key, lines: [], page: null, error: null });
  // where the next read goes on from, kept across a pause
  const lastPage = useRef<{ key: string; page: LogPage } | null>(null);

  useEffect(() => {
    if (paused) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const read = async () => {
      const after = lastPage.current?.key === key ? lastPage.current.page : null;
      try {
        const page = await fetchLogPage(source, filter, after);
        if (stopped) return;
        lastPage.current = { key, page };
        setLog((shown) => ({ key, page, error: null, lines: shown.key === key ? withNewLines(shown.lines, page) : page.lines }));
      } catch (failure) {
        if (stopped) return;
        setLog((shown) => ({ ...(shown.key === key ? shown : { key, lines: [], page: null }), error: (failure as Error).message }));
      }
      timer = setTimeout(read, POLL_MS);
    };
    read();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
    // filter is read through key (its parts), so a new object with the same filter does not start over
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, paused]);

  return log.key === key ? log : { key, lines: [], page: null, error: null };
}
