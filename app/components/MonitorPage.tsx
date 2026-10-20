'use client';

import { useState } from 'react';
import Image from 'next/image';
import MonitorMap from './MonitorMap';
import { useSiteChrome } from './SiteChrome';
import { EventsPanel, LockedPanel, ServicesPanel, StatTiles, StatusBar, TasksPanel, TrendPanel } from './MonitorCards';
import { useFitScale, type FitStage } from './useFitScale';
import { useLiveMonitor } from './useLiveMonitor';
import { MARKERS, type WellStatus } from '../data/monitor';

// Laid out like the Figma frame: panels from x=80 to x=1840, 848px tall, below the 120px navbar; scaled to the viewport.
// A status bar on top; below it the figures, the work in progress and the map side by side.
const STAGE_WIDTH = 1760;
const STAGE_HEIGHT = 848;
const NAVBAR_HEIGHT = 120;
const STAGE: FitStage = { width: STAGE_WIDTH + 160, height: STAGE_HEIGHT, marginX: 0, marginY: NAVBAR_HEIGHT + 80, minViewportWidth: 0 };

export default function MonitorPage() {
  const scale = useFitScale(STAGE);
  // anyone sees the summary, the services, the tasks and the map; the events, renaming a task and each well's details
  // are for logged-in users
  const { isLoggedIn, requireLogin } = useSiteChrome();
  const logIn = () => requireLogin(() => {});
  const { snapshot, paused, togglePaused, renameTask, cycle } = useLiveMonitor();
  const [filter, setFilter] = useState<WellStatus | null>(null);
  // Start on a well that needs attention
  const [selectedId, setSelectedId] = useState(() => (MARKERS.find((marker) => marker.status === 'pending') ?? MARKERS[0]).recordId);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#2C322F]" style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}>
      {/* the aerial photo, shaded towards the right edge like the map page, under the light panels */}
      <div className="absolute inset-0">
        <Image src="/aerial-bg.png" alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(to_left,rgba(3,3,3,0.4)_11.058%,rgba(35,35,35,0.28)_30.288%,rgba(255,255,255,0)_100%)]" />
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center" style={{ top: NAVBAR_HEIGHT }}>
        <div className="flex flex-col gap-4" style={{ zoom: scale, width: STAGE_WIDTH, height: STAGE_HEIGHT }}>
          <StatusBar snapshot={snapshot} paused={paused} onTogglePaused={togglePaused} cycle={cycle} />

          <div className="flex min-h-0 flex-1 gap-4">
            <div className="flex w-[560px] shrink-0 flex-col gap-4">
              <StatTiles totals={snapshot.totals} />
              <TrendPanel />
              <ServicesPanel services={snapshot.services} />
            </div>

            <div className="flex w-[540px] shrink-0 flex-col gap-4">
              <TasksPanel tasks={snapshot.tasks} now={snapshot.now} onRename={isLoggedIn ? renameTask : undefined} />
              {isLoggedIn ? (
                <EventsPanel events={snapshot.events} tasks={snapshot.tasks} now={snapshot.now} />
              ) : (
                <LockedPanel title="警示與事件" what="系統警示與事件紀錄" className="flex-1" onLogin={logIn} />
              )}
            </div>

            <MonitorMap
              markers={MARKERS}
              totals={snapshot.totals}
              filter={filter}
              onFilterChange={setFilter}
              selectedId={selectedId}
              onSelect={setSelectedId}
              scale={scale}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
