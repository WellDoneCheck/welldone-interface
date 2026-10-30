'use client';

import { useState } from 'react';
import { STATUS_META, type MapWells, type WellStatus } from '../data/monitor';
import { mapLabels, mapTotal } from '../utils/monitorStats';

const WIDTH = 483;
const HEIGHT = 104;
const PAD = { left: 2, right: 2, top: 14, bottom: 18 };
const MAX_BAR_WIDTH = 32;
// stacked from the bottom: what is settled first, what still needs a look on top
const STACK: WellStatus[] = ['verified', 'rejected', 'pending'];

const plotWidth = WIDTH - PAD.left - PAD.right;
const plotHeight = HEIGHT - PAD.top - PAD.bottom;
const baseline = PAD.top + plotHeight;

// The wells of each map as a bar, stacked by verdict, with its total above and a hover read-out
export default function MapWellsChart({ maps }: { maps: MapWells[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const labels = mapLabels(maps);
  const max = Math.max(1, ...maps.map(mapTotal));
  const slot = plotWidth / Math.max(maps.length, 1);
  const barWidth = Math.min(MAX_BAR_WIDTH, slot * 0.6);
  const center = (index: number) => PAD.left + slot * (index + 0.5);
  const heightOf = (count: number) => (count / max) * plotHeight;

  return (
    <div className="relative" onPointerLeave={() => setHovered(null)}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block w-full" role="img" aria-label="各地圖水井數，依驗證結果分色">
        <line x1={PAD.left} x2={WIDTH - PAD.right} y1={baseline} y2={baseline} stroke="#2C322F" strokeOpacity="0.14" />
        {maps.map((map, index) => {
          let top = baseline;
          return (
            <g key={map.taskId} onPointerEnter={() => setHovered(index)} opacity={hovered === null || hovered === index ? 1 : 0.55}>
              {/* the whole slot answers the pointer, not only the bar */}
              <rect x={center(index) - slot / 2} y={PAD.top} width={slot} height={plotHeight} fill="transparent" />
              {STACK.map((status) => {
                const height = heightOf(map[status]);
                top -= height;
                return height > 0 ? (
                  <rect key={status} x={center(index) - barWidth / 2} y={top} width={barWidth} height={height} fill={STATUS_META[status].color} />
                ) : null;
              })}
              <text x={center(index)} y={top - 4} fontSize="10" fill="#2C322F" fillOpacity="0.7" textAnchor="middle">
                {mapTotal(map)}
              </text>
              <text x={center(index)} y={HEIGHT - 4} fontSize="10" fill="#2C322F" fillOpacity="0.5" textAnchor="middle">
                {labels[index]}
              </text>
            </g>
          );
        })}
      </svg>

      {hovered !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap bg-[#2C322F] px-2 py-1 text-xs font-bold text-[#F7F6F1]"
          style={{ left: `${(center(hovered) / WIDTH) * 100}%`, top: 0 }}
        >
          {labels[hovered]}　{STACK.map((status) => `${STATUS_META[status].label} ${maps[hovered][status]}`).join('・')}
        </div>
      )}
    </div>
  );
}
