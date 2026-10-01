'use client';

import { useEffect, useState } from 'react';
import { createSnapshot, nextSnapshot, REFRESH_MS, renameTask, type MonitorSnapshot } from '../utils/monitorLive';

interface LiveMonitor {
  snapshot: MonitorSnapshot;
  paused: boolean;
  togglePaused: () => void;
  // a blank name goes back to the batch's default one
  renameTask: (id: string, name: string) => void;
  // changes whenever the wait for the next update starts over (an update, or resuming), to restart its countdown
  cycle: number;
}

// The monitor figures, updated every REFRESH_MS until paused
export function useLiveMonitor(): LiveMonitor {
  const [snapshot, setSnapshot] = useState(() => createSnapshot(Date.now()));
  const [paused, setPaused] = useState(false);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setSnapshot((current) => nextSnapshot(current, Date.now(), Math.random));
      setCycle((current) => current + 1);
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [paused]);

  const togglePaused = () => {
    setPaused((current) => !current);
    setCycle((current) => current + 1);
  };

  const rename = (id: string, name: string) => setSnapshot((current) => renameTask(current, id, name));

  return { snapshot, paused, togglePaused, renameTask: rename, cycle };
}
