'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import SharedTransition, { OPEN_SHEET, SHARED } from './SharedTransition';
import { useWellVerdicts } from './useWellVerdicts';
import { useMapView } from './useMapView';
import { countVerdicts } from '../utils/wellVerdicts';
import { exportHref } from '../utils/exportCover';
import type { MapWell } from '../utils/wells';

function WellCount({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div className="flex flex-col items-start">
      <span className={`text-[34px] font-bold leading-none ${color}`}>{count}</span>
      <span className="mt-[6px] text-[15px] font-bold leading-none text-[#6F7468]">{label}</span>
    </div>
  );
}

// Map-page shortcut to the export page of a map (recordId; the newest finished one if none): the well tally on paper,
// the action on the brand block. wells: the map's wells when the page has them newer than when they were read (the map
// page, while the AI is still adding wells)
export default function ExportEntry({ recordId, wells }: { recordId?: string; wells?: MapWell[] }) {
  const loaded = useMapView(recordId ?? null);
  // as verified so far, on the check and export pages
  const { verified, pending } = countVerdicts(wells ?? (loaded?.status === 'ready' ? loaded.value.wells : []), useWellVerdicts());
  // the sheet opens over this page, and over it again when reloaded
  const search = useSearchParams().toString();
  const over = `${usePathname()}${search ? `?${search}` : ''}`;
  return (
    // on every page in the same corner: it stays put while the rest of the page changes
    <SharedTransition name={SHARED.exportEntry}>
      <Link
        href={exportHref(recordId, over)}
        transitionTypes={OPEN_SHEET}
        aria-label={`資料匯出：${verified} 口已驗證、${pending} 口未驗證`}
        className="group block w-fit outline-none focus-visible:shadow-[0_0_0_4px_#62A4A7]"
      >
        {/* only the contents lift on hover; the link itself stays put so its clickable area never slips from under the pointer */}
        <div className="flex h-[84px] items-stretch shadow-[8px_8px_50px_0_rgba(0,0,0,0.4)] transition-transform duration-500 ease-[var(--ease-expo)] group-hover:-translate-y-1">
          <div className="flex items-center gap-[20px] bg-[rgba(247,246,241,0.95)] px-[24px]">
            <WellCount count={verified} label="已驗證" color="text-[#62A4A7]" />
            <span className="h-[42px] w-px bg-[#2C322F]/15" />
            <WellCount count={pending} label="未驗證" color="text-[#8A611C]" />
        </div>
        <div className="flex items-center gap-[10px] bg-[#62A4A7] pl-[20px] pr-[24px] text-[22px] font-bold text-[#FBFBF8] transition-colors duration-300 group-hover:bg-[#54999D]">
          {/* the wells' photos (a framed picture), not a file type: it opens the photos to check and export */}
          <svg aria-hidden width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
            <rect x="3" y="5" width="22" height="18" rx="2" />
            <circle cx="10" cy="11" r="2.2" />
            <path d="M3.5 21l7-7 5 5 3.5-3.5 5.5 5.5" strokeLinecap="round" />
          </svg>
          資料匯出
          {/* up: it pulls the export sheet up over the page */}
          <span className="transition-transform duration-500 ease-[var(--ease-expo)] group-hover:-translate-y-1">↑</span>
        </div>
        </div>
      </Link>
    </SharedTransition>
  );
}
