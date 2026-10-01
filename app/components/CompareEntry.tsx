import Link from 'next/link';
import SharedTransition, { SHARED } from './SharedTransition';

// Map-page shortcut to the legal well comparison, styled to sit beside the export shortcut; it grows into the compare
// page's panel when opened. The compare page names the map it came from (recordId).
export default function CompareEntry({ recordId }: { recordId: string }) {
  return (
    <SharedTransition name={SHARED.compareArea}>
      <Link href={`/compare?record=${encodeURIComponent(recordId)}`} className="group block w-fit outline-none focus-visible:shadow-[0_0_0_4px_#62A4A7]">
        {/* only the contents lift on hover, like the export shortcut beside it */}
        <span className="flex h-[84px] items-center gap-[14px] bg-[rgba(247,246,241,0.88)] px-[22px] shadow-[8px_8px_50px_0_rgba(0,0,0,0.4)] backdrop-blur-md transition-transform duration-500 ease-[var(--ease-expo)] group-hover:-translate-y-1">
          <span className="flex h-[40px] w-[40px] shrink-0 items-center justify-center bg-[#62A4A7] text-[13px] font-black text-white">CSV</span>
          <span className="flex flex-col">
            <span className="text-[20px] font-bold leading-none text-[#2C322F]">合法井比對</span>
            <span className="mt-[7px] text-[13px] font-bold leading-none text-[#6F7468]">上傳清冊，比對辨識結果</span>
          </span>
          <span className="text-[22px] text-[#3F7A7E] transition-transform duration-500 ease-[var(--ease-expo)] group-hover:translate-x-1.5">→</span>
        </span>
      </Link>
    </SharedTransition>
  );
}
