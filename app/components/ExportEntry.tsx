import Image from 'next/image';
import Link from 'next/link';
import { EXPORT_WELLS } from '../data/exportWells';
import SharedTransition, { OPEN_SHEET, SHARED } from './SharedTransition';

const VERIFIED_COUNT = EXPORT_WELLS.filter((well) => well.verdict !== null).length;
const PENDING_COUNT = EXPORT_WELLS.length - VERIFIED_COUNT;

function WellCount({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div className="flex flex-col items-start">
      <span className={`text-[34px] font-bold leading-none ${color}`}>{count}</span>
      <span className="mt-[6px] text-[15px] font-bold leading-none text-[#6F7468]">{label}</span>
    </div>
  );
}

// Map-page shortcut to the export page: the well tally on paper, the action on the brand block
export default function ExportEntry() {
  return (
    // on every page in the same corner: it stays put while the rest of the page changes
    <SharedTransition name={SHARED.exportEntry}>
      <Link
        href="/export"
        transitionTypes={OPEN_SHEET}
        aria-label={`資料匯出：${VERIFIED_COUNT} 口已驗證、${PENDING_COUNT} 口未驗證`}
        className="group block w-fit outline-none focus-visible:shadow-[0_0_0_4px_#62A4A7]"
      >
        {/* only the contents lift on hover; the link itself stays put so its clickable area never slips from under the pointer */}
        <div className="flex h-[84px] items-stretch shadow-[8px_8px_50px_0_rgba(0,0,0,0.4)] transition-transform duration-500 ease-[var(--ease-expo)] group-hover:-translate-y-1">
          <div className="flex items-center gap-[20px] bg-[rgba(247,246,241,0.88)] px-[24px] backdrop-blur-md">
            <WellCount count={VERIFIED_COUNT} label="已驗證" color="text-[#62A4A7]" />
            <span className="h-[42px] w-px bg-[#2C322F]/15" />
            <WellCount count={PENDING_COUNT} label="未驗證" color="text-[#8A611C]" />
        </div>
        <div className="flex items-center gap-[10px] bg-[#62A4A7] pl-[20px] pr-[24px] text-[22px] font-bold text-[#FBFBF8] transition-colors duration-300 group-hover:bg-[#54999D]">
          <Image src="/export/icon-export-csv.png" alt="" width={30} height={30} className="invert" />
          資料匯出
          <span className="transition-transform duration-500 ease-[var(--ease-expo)] group-hover:translate-x-1.5">→</span>
        </div>
        </div>
      </Link>
    </SharedTransition>
  );
}
