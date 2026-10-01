import Link from 'next/link';
import type { ReactNode } from 'react';
import MapFileLabel from './MapFileLabel';
import { pagePart } from './SharedTransition';
import { CONTENT_TOP, PAGE_GUTTER } from './pageFrame';
import type { RecordItem } from '../data/mapRecords';

// Height of the link on screen (20px text, 28px line, 8px padding above and below)
export const BACK_LINK_HEIGHT = 44;

interface BackToMapLinkProps {
  href: string;
  transitionTypes?: string[];
  // the map file the page is about, named beside the link
  mapFile?: Pick<RecordItem, 'id' | 'timestamp'>;
  // where it goes back to (the map, unless said otherwise, e.g. the map page's own link back to the upload page)
  label?: string;
  // called as the link starts going there (not on a new tab or window)
  onNavigate?: () => void;
  // shown after the map file's name (e.g. where the pointer is on the map)
  children?: ReactNode;
}

// Back to the map, just under the navbar's left edge; a dark chip so it reads as a button over the bright photo.
// Fades out, then in, with the other page parts when the page changes.
export default function BackToMapLink({ href, transitionTypes, mapFile, label = '返回地圖', onNavigate, children }: BackToMapLinkProps) {
  return (
    <div className="absolute z-10 flex items-center gap-2.5" style={{ top: CONTENT_TOP, left: PAGE_GUTTER }}>
      <Link
        href={href}
        transitionTypes={transitionTypes}
        onNavigate={onNavigate}
        className="group flex items-center gap-2.5 bg-[#2C322F]/60 px-4 py-2 text-[20px] font-bold leading-7 text-white backdrop-blur-sm transition-colors hover:bg-[#2C322F]/80"
        style={pagePart('back-to-map')}
      >
        <span className="transition-transform duration-300 ease-[var(--ease-expo)] group-hover:-translate-x-1">←</span>
        {label}
      </Link>
      {mapFile && <MapFileLabel record={mapFile} />}
      {children}
    </div>
  );
}
