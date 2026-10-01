'use client';

import RecordName from './RecordName';
import { pagePart } from './SharedTransition';
import type { RecordItem } from '../data/mapRecords';

// The map file the page shows, renamed in place: top left on the map page, beside the back link on the check and
// compare pages. A dark chip as tall as the back link, so it reads over the bright photo; fades with the other page
// parts when the page changes.
export default function MapFileLabel({ record }: { record: Pick<RecordItem, 'id' | 'timestamp'> }) {
  return (
    <div
      className="max-w-[480px] bg-[#2C322F]/60 px-4 py-2 text-[20px] font-bold leading-7 text-white backdrop-blur-sm"
      style={pagePart('map-file')}
    >
      <RecordName record={record} iconSize={22} />
    </div>
  );
}
