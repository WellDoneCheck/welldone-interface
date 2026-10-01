'use client';

import { useState } from 'react';
import MonitorMap from './MonitorMap';
import TileMap, { stripFit } from './TileMap';
import { useViewportSize } from './pageFrame';
import { EventsPanel, ServicesPanel, StatTiles, StatusBar, TasksPanel, TrendPanel } from './MonitorCards';
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
  const viewport = useViewportSize();
  const { snapshot, paused, togglePaused, renameTask, cycle } = useLiveMonitor();
  const [filter, setFilter] = useState<WellStatus | null>(null);
  // Start on a well that needs attention
  const [selectedId, setSelectedId] = useState(() => (MARKERS.find((marker) => marker.status === 'pending') ?? MARKERS[0]).recordId);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0E1211]" style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}>
      {/* the same survey map as the map page, darkened for the control panels on top */}
      <div className="absolute inset-0">
        <TileMap fit={stripFit(viewport)} />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(11,15,13,0.72),rgba(11,15,13,0.86))]" />
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
              <TasksPanel tasks={snapshot.tasks} now={snapshot.now} onRename={renameTask} />
              <EventsPanel events={snapshot.events} tasks={snapshot.tasks} now={snapshot.now} />
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
