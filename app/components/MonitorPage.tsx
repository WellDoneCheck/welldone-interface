'use client';

import { useState } from 'react';
import Image from 'next/image';
import MonitorMap from './MonitorMap';
import { AccuracyCard, OverviewCard, ServicesCard, TasksCard, TotalCard } from './MonitorCards';
import { useFitScale, type FitStage } from './useFitScale';
import { MARKERS, type WellStatus } from '../data/monitor';

// Laid out like the Figma frame: cards from x=80 to x=1840, 848px tall, below the 120px navbar; scaled to the viewport
const STAGE_WIDTH = 1760;
const STAGE_HEIGHT = 848;
const NAVBAR_HEIGHT = 120;
const STAGE: FitStage = { width: STAGE_WIDTH + 160, height: STAGE_HEIGHT, marginX: 0, marginY: NAVBAR_HEIGHT + 80, minViewportWidth: 0 };

export default function MonitorPage() {
  const scale = useFitScale(STAGE);
  const [filter, setFilter] = useState<WellStatus | null>(null);
  // Start on a well that needs attention
  const [selectedId, setSelectedId] = useState(() => (MARKERS.find((marker) => marker.status === 'pending') ?? MARKERS[0]).recordId);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#2C322F]" style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}>
      {/* same aerial background and shading as the map page */}
      <div className="absolute inset-0">
        <Image src="/aerial-bg.png" alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(to_left,rgba(3,3,3,0.4)_11.058%,rgba(35,35,35,0.28)_30.288%,rgba(255,255,255,0)_100%)]" />
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center" style={{ top: NAVBAR_HEIGHT }}>
        <div className="flex items-start gap-[34px]" style={{ zoom: scale, width: STAGE_WIDTH, height: STAGE_HEIGHT }}>
          <div className="flex w-[1096px] shrink-0 flex-col gap-[30px]">
            <div className="flex h-[504px] gap-[35px]">
              <div className="flex w-[529px] shrink-0 flex-col gap-[17px]">
                <div className="flex h-[226px] gap-2">
                  <TotalCard />
                  <AccuracyCard />
                </div>
                <OverviewCard />
              </div>
              <TasksCard />
            </div>
            <ServicesCard />
          </div>

          <MonitorMap markers={MARKERS} filter={filter} onFilterChange={setFilter} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
      </div>
    </div>
  );
}
