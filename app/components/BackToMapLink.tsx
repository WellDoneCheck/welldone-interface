import Link from 'next/link';
import { pagePart } from './SharedTransition';
import { CONTENT_TOP, PAGE_GUTTER } from './pageFrame';

// Height of the link on screen (16px text, 24px line, 6px padding above and below)
export const BACK_LINK_HEIGHT = 36;

// Back to the map, just under the navbar's left edge; a dark chip so it reads as a button over the bright photo.
// Fades out, then in, with the other page parts when the page changes.
export default function BackToMapLink({ href, transitionTypes }: { href: string; transitionTypes?: string[] }) {
  return (
    <Link
      href={href}
      transitionTypes={transitionTypes}
      className="group absolute z-10 flex items-center gap-2 bg-[#2C322F]/60 px-3 py-1.5 text-base font-bold text-white backdrop-blur-sm transition-colors hover:bg-[#2C322F]/80"
      style={{ ...pagePart('back-to-map'), top: CONTENT_TOP, left: PAGE_GUTTER }}
    >
      <span className="transition-transform duration-300 ease-[var(--ease-expo)] group-hover:-translate-x-1">←</span>
      返回地圖
    </Link>
  );
}
