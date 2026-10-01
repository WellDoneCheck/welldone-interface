'use client';

import { useEffect, useState } from 'react';
import type { Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl';
import { pagePart } from './SharedTransition';

// Where the pointer is on the map, beside the map file's name: a chip like the name's, shown while the pointer is over
// the map (fading out, with the last place, when it leaves)
export default function CursorCoordinates({ map }: { map: MapLibreMap | null }) {
  const [text, setText] = useState('');
  const [over, setOver] = useState(false);

  useEffect(() => {
    if (!map) return;
    const move = (event: MapMouseEvent) => {
      setText(`${event.lngLat.lat.toFixed(5)}, ${event.lngLat.lng.toFixed(5)}`);
      setOver(true);
    };
    const out = () => setOver(false);
    map.on('mousemove', move);
    map.on('mouseout', out);
    return () => {
      map.off('mousemove', move);
      map.off('mouseout', out);
    };
  }, [map]);

  return (
    <div
      aria-hidden
      className={`flex items-center gap-2 bg-[#2C322F]/60 px-4 py-2 text-[20px] font-bold leading-7 text-white tabular-nums backdrop-blur-sm transition-opacity duration-300 ${
        over ? 'opacity-100' : 'opacity-0'
      }`}
      style={pagePart('map-cursor')}
    >
      {/* crosshair */}
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <circle cx="9" cy="9" r="4.5" />
        <path d="M9 1v4M9 13v4M1 9h4M13 9h4" />
      </svg>
      {text}
    </div>
  );
}
