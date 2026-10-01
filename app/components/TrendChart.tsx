'use client';

import { useState, type PointerEvent } from 'react';

interface TrendChartProps {
  data: number[];
  target: number;
  // Date of the first data point, 'YYYY-MM-DD'
  firstDay: string;
}

const WIDTH = 483;
const HEIGHT = 92;
const PAD = { left: 2, right: 2, top: 8, bottom: 20 };
const Y_MAX = 80;
const X_LABEL_STEP = 7;

const plotWidth = WIDTH - PAD.left - PAD.right;
const plotHeight = HEIGHT - PAD.top - PAD.bottom;

const xAt = (index: number, count: number) => PAD.left + (index * plotWidth) / Math.max(count - 1, 1);
const yAt = (value: number) => PAD.top + (1 - value / Y_MAX) * plotHeight;

function dayLabel(firstDay: string, offset: number): string {
  const date = new Date(firstDay);
  date.setDate(date.getDate() + offset);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

// Daily line with a dashed target and a hover read-out
export default function TrendChart({ data, target, firstDay }: TrendChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const line = `M${data.map((value, index) => `${xAt(index, data.length)},${yAt(value)}`).join(' L')}`;
  const area = `${line} L${xAt(data.length - 1, data.length)},${yAt(0)} L${xAt(0, data.length)},${yAt(0)} Z`;

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const { left, width } = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - left) / width) * WIDTH;
    const index = Math.round(((x - PAD.left) / plotWidth) * (data.length - 1));
    setHovered(Math.min(Math.max(index, 0), data.length - 1));
  };

  return (
    <div className="relative" onPointerMove={onPointerMove} onPointerLeave={() => setHovered(null)}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block w-full" role="img" aria-label={`近 30 天每日驗證數，目標 ${target}`}>
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#62A4A7" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#62A4A7" stopOpacity="0" />
          </linearGradient>
        </defs>

        <line x1={PAD.left} x2={WIDTH - PAD.right} y1={yAt(0)} y2={yAt(0)} stroke="#F2F1EC" strokeOpacity="0.14" />
        {/* the daily target: dashed, as a threshold rather than a gridline */}
        <line x1={PAD.left} x2={WIDTH - PAD.right} y1={yAt(target)} y2={yAt(target)} stroke="#F2F1EC" strokeOpacity="0.5" strokeDasharray="4 4" />

        <path d={area} fill="url(#trend-fill)" />
        <path d={line} fill="none" stroke="#62A4A7" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {data.map((_, index) =>
          index % X_LABEL_STEP === 0 || index === data.length - 1 ? (
            <text
              key={index}
              x={xAt(index, data.length)}
              y={HEIGHT - 5}
              fontSize="10"
              fill="#F2F1EC"
              fillOpacity="0.45"
              textAnchor={index === 0 ? 'start' : index === data.length - 1 ? 'end' : 'middle'}
            >
              {dayLabel(firstDay, index)}
            </text>
          ) : null,
        )}

        {hovered !== null && (
          <g>
            <line x1={xAt(hovered, data.length)} x2={xAt(hovered, data.length)} y1={PAD.top} y2={yAt(0)} stroke="#F2F1EC" strokeOpacity="0.3" />
            <circle cx={xAt(hovered, data.length)} cy={yAt(data[hovered])} r="4" fill="#62A4A7" stroke="#141917" strokeWidth="2" />
          </g>
        )}
      </svg>

      {hovered !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap border border-white/10 bg-[#0E1211] px-2 py-1 text-xs font-bold text-[#F2F1EC]"
          style={{
            left: `${(xAt(hovered, data.length) / WIDTH) * 100}%`,
            top: `${(yAt(data[hovered]) / HEIGHT) * 100}%`,
            marginTop: -8,
          }}
        >
          {dayLabel(firstDay, hovered)}　{data[hovered]} 口
        </div>
      )}
    </div>
  );
}
