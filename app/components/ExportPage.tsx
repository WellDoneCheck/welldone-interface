'use client';

import { startTransition, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useWellVerdicts } from './useWellVerdicts';
import { canVerify, lookOf, saveVerdict, verdictOf, type VerdictLook } from '../utils/wellVerdicts';
import Image from 'next/image';
import Link from 'next/link';
import { useFitScale, type FitStage } from './useFitScale';
import { NAVBAR_HEIGHT } from './pageFrame';
import SharedTransition, { ExportPageTransition, FROM_EXPORT, FROM_EXPORT_SHARE, SHARED } from './SharedTransition';
import LoadNotice from './LoadNotice';
import { useSiteChrome } from './SiteChrome';
import { useMapView } from './useMapView';
import { usePageSearchParams } from './usePageSearchParams';
import { fileUrl } from '../utils/api';
import { wellImageUrl, type MapWell, type Verdict } from '../utils/wells';
import { buildWellsCsv } from '../utils/wellsCsv';
import { downloadCsv } from '../utils/csv';
import { useCheckLink } from './useCheckView';

// Laid out for the 1920px-wide Figma frame; height 0 lets only the viewport width decide the scale
const EXPORT_STAGE: FitStage = { width: 1920, height: 0, marginX: 0, marginY: 0, minViewportWidth: 0 };
const CARD_WIDTH = 320;
const CARD_GAP = 28;
const CSV_FILE_NAME = 'skywell-wells.csv';
// The aerial photo at the top of the page, fading into the paper colour at its bottom
const HERO_HEIGHT = 1077;
const HERO_FADE = 'bg-[linear-gradient(to_top,#F7F6F1_7.692%,rgba(18,20,18,0.2))]';
// Space above the summary card: under the navbar on the page, under the handle in the sheet
const TOP_SPACE = { page: 238, sheet: 24 };
// Share of the hero height from where the page is plain paper, so the navbar needs dark text over it
const HERO_PAPER_FROM = 0.85;

// A section per verification, in the colours the map's pins wear (VERDICT_COLOR: teal a well, grey not one, red not
// yet verified); the counts on top and each card's tag the same
type SectionKind = VerdictLook;
const SECTION_ORDER: SectionKind[] = ['well', 'not-well', 'pending'];

const SECTIONS: Record<SectionKind, { title: string; count: string; countColor: string }> = {
  well: { title: '已驗證：是井', count: '是井 Well', countColor: 'text-[#62A4A7]' },
  'not-well': { title: '已驗證：不是井', count: '不是井 Not a well', countColor: 'text-[#8A8F8C]' },
  pending: { title: '未驗證的水井', count: '未驗證 Pending', countColor: 'text-[#BC5646]' },
};

const VERDICT_BUTTONS: { verdict: Verdict; label: string; className: string }[] = [
  { verdict: 'not-well', label: '不是井', className: 'border-[4px] border-[#8A8F8C] text-[#5E625F]' },
  { verdict: 'well', label: '是井', className: 'bg-[#62A4A7] text-[#FBFBF8]' },
];

const BADGES: Record<SectionKind, { label: string; className: string }> = {
  well: { label: '是井', className: 'bg-[rgba(209,230,231,0.92)] text-[#3F7A7E]' },
  'not-well': { label: '不是井', className: 'bg-[rgba(228,229,227,0.92)] text-[#55595A]' },
  pending: { label: '未驗證', className: 'bg-[rgba(247,229,223,0.92)] text-[#98412F]' },
};

/* ─── Selection circle ──────────────────────────────────────────── */

function SelectCircle({ checked, size, label, onToggle }: { checked: boolean; size: number; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className="relative shrink-0 rounded-full transition-transform duration-200 hover:scale-110"
      style={{ width: size, height: size }}
    >
      {checked ? (
        <Image src="/export/icon-check.png" alt="" fill sizes={`${size}px`} />
      ) : (
        <span className="absolute inset-[3px] rounded-full border-[5px] border-[#D1E6E7]" />
      )}
    </button>
  );
}

/* ─── Hero summary ──────────────────────────────────────────────── */

function CountColumn({ count, countColor, label }: { count: number; countColor: string; label: string }) {
  return (
    <div className="flex w-[300px] flex-col items-center pt-[48px] font-bold text-[#2C322F]">
      <p className={`text-[64px] leading-none ${countColor}`}>{count}</p>
      <p className="mt-[14px] text-[28px] leading-[normal]">口井</p>
      <p className="mt-[40px] text-[20px] leading-[normal]">{label}</p>
    </div>
  );
}

function ExportAction({ selectedCount, onExport }: { selectedCount: number; onExport: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-[16px]">
      <button
        type="button"
        onClick={onExport}
        disabled={selectedCount === 0}
        className="flex items-center gap-[10px] px-[16px] py-[8px] text-[22px] font-black text-black transition-all duration-300 ease-[var(--ease-expo)] hover:bg-white/50 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <Image src="/export/icon-export-csv.png" alt="" width={48} height={48} />
        Export CSV
      </button>
      <p aria-live="polite" className="text-[16px] font-bold text-[#6F7468]">
        {selectedCount === 0 ? '請先勾選要匯出的水井' : `已選取 ${selectedCount} 口水井`}
      </p>
    </div>
  );
}

interface HeroSummaryProps {
  counts: Record<SectionKind, number>;
  selectedCount: number;
  onExport: () => void;
  // on the sheet's plain paper the card is white with a soft shadow; over the page's aerial photo it is frosted glass
  onPaper: boolean;
}

function HeroSummary({ counts, selectedCount, onExport, onPaper }: HeroSummaryProps) {
  return (
    <div
      className={`relative mx-[60px] flex h-[340px] ${
        onPaper ? 'bg-white shadow-[8px_8px_40px_0_rgba(0,0,0,0.12)]' : 'bg-[rgba(247,246,241,0.4)] shadow-[8px_8px_50px_0_rgba(0,0,0,0.4)] backdrop-blur-[2px]'
      }`}
    >
      <div className="flex w-[449px] flex-col justify-between pb-[48px] pl-[64px] pt-[48px] font-bold text-[#2C322F]">
        <p className="w-[280px] text-[20px] leading-[1.6]">管理並匯出 AI 水井辨識結果，支援多種地理資訊格式以利後續分析與建檔。</p>
        <h1 className="text-[36px] leading-[normal]">資料匯出</h1>
      </div>
      {SECTION_ORDER.map((kind) => (
        <CountColumn key={kind} count={counts[kind]} countColor={SECTIONS[kind].countColor} label={SECTIONS[kind].count} />
      ))}
      <ExportAction selectedCount={selectedCount} onExport={onExport} />
    </div>
  );
}

/* ─── Well card ─────────────────────────────────────────────────── */

function InfoLine({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-[6px] text-[14px] font-bold leading-[normal] text-[#6F7468]">
      <Image src={icon} alt="" width={16} height={16} />
      {text}
    </div>
  );
}

interface WellCardProps {
  well: MapWell;
  selected: boolean;
  // this card's photo, id, coordinates and time move to the check page (only the card being opened: a name is unique)
  shared: boolean;
  onToggle: () => void;
  // null: the user may not verify (a viewer)
  onVerdict: ((verdict: Verdict) => void) | null;
  onOpen: () => void;
}

function WellCard({ well, selected, shared, onToggle, onVerdict, onOpen }: WellCardProps) {
  const badge = BADGES[lookOf(well.verdict)];
  // read ahead as the pointer or focus comes to the photo, so the check page is ready when it is opened
  const check = useCheckLink(well.id, FROM_EXPORT);

  return (
    // cards scrolled out of the row are not rendered until they come into view (50 cards with large shadows)
    <article className="w-[320px] shrink-0 snap-start bg-white pb-[16px] shadow-[8px_8px_50px_0_rgba(0,0,0,0.4)] [contain-intrinsic-size:auto_320px_auto_440px] [content-visibility:auto]">
      <div className="relative h-[320px] w-[320px]">
        {/* the photo opens this well on the check page to compare its captures; clicking it first marks this card as the
            one whose parts move there */}
        <SharedTransition name={SHARED.wellPhoto} enabled={shared} share={FROM_EXPORT_SHARE}>
          <Link
            href={check.href}
            transitionTypes={FROM_EXPORT}
            onClick={onOpen}
            onNavigate={check.onNavigate}
            onPointerEnter={check.readAhead}
            onFocus={check.readAhead}
            aria-label={`檢查 ${well.id}：比對多期影像`}
            className="group/photo absolute inset-0 block overflow-hidden outline-none focus-visible:shadow-[inset_0_0_0_4px_#62A4A7]"
          >
            {/* once opened, the photo drops its hover look at once, so it flies to the check page as the bare capture */}
            {/* eslint-disable-next-line @next/next/no-img-element -- from the backend, with the token in its address */}
            <img
              src={fileUrl(wellImageUrl(well, CARD_WIDTH))}
              alt={`${well.id} 空拍影像`}
              loading="lazy"
              onError={(event) => (event.currentTarget.style.visibility = 'hidden')}
              className={`absolute inset-0 h-full w-full object-cover ${shared ? '' : 'transition-transform duration-500 ease-[var(--ease-expo)] group-hover/photo:scale-[1.04]'}`}
            />
            <span
              className={`absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 via-transparent to-transparent pb-[14px] opacity-0 transition-opacity duration-300 group-hover/photo:opacity-100 group-focus-visible/photo:opacity-100 ${
                shared ? 'invisible' : ''
              }`}
            >
              <span className="text-[16px] font-bold text-white">進入檢查　比對多期影像 →</span>
            </span>
            <Image
              src="/export/icon-eye.png"
              alt=""
              width={24}
              height={24}
              className={`absolute bottom-[8px] right-[10px] ${shared ? 'invisible' : ''}`}
            />
          </Link>
        </SharedTransition>
        <span className={`pointer-events-none absolute left-[8px] top-[8px] flex h-[30px] items-center px-[12px] text-[16px] font-black ${badge.className}`}>
          {badge.label}
        </span>
        <div className="absolute right-[4px] top-[6px]">
          <SelectCircle checked={selected} size={30} label={`選取 ${well.id}`} onToggle={onToggle} />
        </div>
      </div>

      <div className="px-[20px] pt-[14px]">
        <SharedTransition name={SHARED.wellId} enabled={shared} share={FROM_EXPORT_SHARE}>
          <h3 className="text-[22px] font-bold leading-[normal] text-[#2C322F]">{well.id}</h3>
        </SharedTransition>
        <div className="mt-[6px] flex flex-col gap-[3px] pl-[2px]">
          <SharedTransition name={SHARED.wellCoordinates} enabled={shared} share={FROM_EXPORT_SHARE}>
            <InfoLine icon="/export/icon-location.png" text={well.coordinates} />
          </SharedTransition>
          <SharedTransition name={SHARED.wellTime} enabled={shared} share={FROM_EXPORT_SHARE}>
            <InfoLine icon="/export/icon-clock.png" text={well.timestamp} />
          </SharedTransition>
        </div>
        {well.verdict === null && onVerdict && (
          <div className="mt-[20px] flex gap-[16px]">
            {VERDICT_BUTTONS.map((button) => (
              <button
                key={button.verdict}
                type="button"
                onClick={() => onVerdict(button.verdict)}
                className={`h-[46px] w-[132px] text-[18px] font-bold transition-all duration-300 ease-[var(--ease-expo)] hover:brightness-110 active:scale-[0.97] ${button.className}`}
              >
                {button.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

/* ─── Section ───────────────────────────────────────────────────── */

function ScrollArrow({ direction, onClick }: { direction: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={direction === 'left' ? '上一張' : '下一張'}
      onClick={onClick}
      className="shrink-0 transition-transform duration-200 hover:scale-110 active:scale-95"
    >
      <Image src={`/export/icon-sort-${direction}.png`} alt="" width={56} height={56} />
    </button>
  );
}

// A row shows about five cards; the rest are off to the right. Only the first few are rendered at first and the rest
// are added once the browser is idle, so opening the page (or sliding up the sheet) only renders what is visible.
const INITIAL_CARDS = 6;
const REVEAL_TIMEOUT_MS = 1500;

function useRenderedCount(total: number): number {
  const [count, setCount] = useState(() => Math.min(total, INITIAL_CARDS));

  useEffect(() => {
    if (count >= total) return;
    const reveal = () => startTransition(() => setCount(total));
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(reveal, { timeout: REVEAL_TIMEOUT_MS });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(reveal, REVEAL_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [count, total]);

  return Math.min(count, total);
}

interface WellSectionProps {
  kind: SectionKind;
  wells: MapWell[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], select: boolean) => void;
  onVerdict: ((well: MapWell, verdict: Verdict) => void) | null;
  // the well being opened on the check page
  openingId: string | null;
  onOpen: (id: string) => void;
}

function WellSection({ kind, wells, selectedIds, onToggle, onToggleAll, onVerdict, openingId, onOpen }: WellSectionProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const { title, countColor } = SECTIONS[kind];
  const allSelected = wells.length > 0 && wells.every((well) => selectedIds.has(well.id));
  const renderedCount = useRenderedCount(wells.length);

  const scrollByCard = (direction: 1 | -1) =>
    listRef.current?.scrollBy({ left: direction * (CARD_WIDTH + CARD_GAP), behavior: 'smooth' });

  return (
    <section className="mt-[96px]">
      <div className="flex items-end justify-between pl-[150px] pr-[160px]">
        <div className="flex items-end gap-[24px]">
          <h2 className="text-[40px] font-black leading-[normal] text-[#2C322F]">{title}</h2>
          <p className={`pb-[8px] text-[20px] font-black ${countColor}`}>{wells.length}口水井</p>
        </div>
        <label className="flex cursor-pointer items-center gap-[12px] pb-[8px] text-[20px] font-black text-[#2C322F]">
          全選
          <SelectCircle checked={allSelected} size={30} label={`全選${title}`} onToggle={() => onToggleAll(wells.map((well) => well.id), !allSelected)} />
        </label>
      </div>

      <div className="mt-[24px] flex items-center gap-[5px] px-[60px]">
        <ScrollArrow direction="left" onClick={() => scrollByCard(-1)} />
        <div
          ref={listRef}
          className="flex flex-1 snap-x snap-mandatory overflow-x-auto px-[5px] pb-[60px] pt-[20px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ gap: CARD_GAP }}
        >
          {wells.length === 0 && <p className="py-[120px] text-[32px] font-bold text-[#6F7468]">目前沒有水井</p>}
          {wells.slice(0, renderedCount).map((well) => (
            <WellCard
              key={well.id}
              well={well}
              selected={selectedIds.has(well.id)}
              shared={openingId === well.id}
              onToggle={() => onToggle(well.id)}
              onVerdict={onVerdict && ((verdict) => onVerdict(well, verdict))}
              onOpen={() => onOpen(well.id)}
            />
          ))}
        </div>
        <ScrollArrow direction="right" onClick={() => scrollByCard(1)} />
      </div>
    </section>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

// True once the marker has scrolled up under the navbar; the navbar then switches to dark text (see Navbar's data-nav-light).
// Scroll events are caught on the document so this works both when the window scrolls and when the sheet does.
function useNavLightPast(marker: RefObject<HTMLDivElement | null>): boolean {
  const [light, setLight] = useState(false);

  useEffect(() => {
    const update = () => {
      const element = marker.current;
      if (element) setLight(element.getBoundingClientRect().top < NAVBAR_HEIGHT);
    };
    update();
    document.addEventListener('scroll', update, { capture: true, passive: true });
    window.addEventListener('resize', update);
    return () => {
      document.removeEventListener('scroll', update, { capture: true });
      window.removeEventListener('resize', update);
    };
  }, [marker]);

  // the navbar re-reads data-nav-light on window scroll events: tell it right after the attribute is written,
  // and again once this page is gone
  useLayoutEffect(() => {
    window.dispatchEvent(new Event('scroll'));
  }, [light]);
  useEffect(() => () => void requestAnimationFrame(() => window.dispatchEvent(new Event('scroll'))), []);

  return light;
}

// As a page: the aerial photo at the top, fading into paper. In the pull-up sheet (inSheet), only the summary and the
// wells on the sheet's paper, with the page it was opened from behind the sheet.
export default function ExportPage({ inSheet = false }: { inSheet?: boolean }) {
  const scale = useFitScale(EXPORT_STAGE);
  const heroHeight = HERO_HEIGHT * scale;
  const paperMarker = useRef<HTMLDivElement>(null);
  const navLight = useNavLightPast(paperMarker);
  // the wells of the map the page was opened from (?record=; the newest finished map if none), with the verdicts
  // given so far, here or on the check page
  const loaded = useMapView(usePageSearchParams('/export').get('record'));
  const verdicts = useWellVerdicts();
  const fetched = loaded?.status === 'ready' ? loaded.value.wells : null;
  const wells = useMemo(() => (fetched ?? []).map((well) => ({ ...well, verdict: verdictOf(well, verdicts) })), [fetched, verdicts]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [verdictError, setVerdictError] = useState<string | null>(null);
  const { session } = useSiteChrome();

  const giveVerdict = (well: MapWell, verdict: Verdict) => {
    setVerdictError(null);
    saveVerdict(well, verdict).catch((error: Error) => setVerdictError(`${well.id}：${error.message}`));
  };

  const wellsOf = (kind: SectionKind) => wells.filter((well) => lookOf(well.verdict) === kind);

  const toggleWell = (id: string) =>
    setSelectedIds((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const toggleAll = (ids: string[], select: boolean) =>
    setSelectedIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => (select ? next.add(id) : next.delete(id)));
      return next;
    });

  const onVerdict = session && canVerify(session.role) ? giveVerdict : null;
  const sectionProps = { selectedIds, onToggle: toggleWell, onToggleAll: toggleAll, onVerdict, openingId, onOpen: setOpeningId };
  if (loaded?.status !== 'ready') return <LoadNotice loaded={loaded} />;

  const content = (
    <div className="relative mx-auto w-[1920px] pb-[160px]" style={{ zoom: scale, paddingTop: inSheet ? TOP_SPACE.sheet : TOP_SPACE.page }}>
      <HeroSummary
        counts={{ well: wellsOf('well').length, 'not-well': wellsOf('not-well').length, pending: wellsOf('pending').length }}
        selectedCount={selectedIds.size}
        onExport={() => downloadCsv(CSV_FILE_NAME, buildWellsCsv(wells.filter((well) => selectedIds.has(well.id))))}
        onPaper={inSheet}
      />
      {verdictError && (
        <p role="alert" className="mx-[60px] mt-[24px] text-[20px] font-bold text-[#BC5646]">
          {verdictError}
        </p>
      )}
      {SECTION_ORDER.map((kind) => (
        <WellSection key={kind} kind={kind} wells={wellsOf(kind)} {...sectionProps} />
      ))}
    </div>
  );

  if (inSheet) return <div style={{ fontFamily: 'var(--font-noto-serif-tc), serif' }}>{content}</div>;

  return (
    <ExportPageTransition>
      <div
        data-nav-light={String(navLight)}
        className="relative min-h-screen overflow-hidden bg-[#F7F6F1]"
        style={{ fontFamily: 'var(--font-noto-serif-tc), serif' }}
      >
        <div className="absolute inset-x-0 top-0" style={{ height: heroHeight }}>
          <Image src="/aerial-bg.webp" unoptimized alt="" fill priority sizes="100vw" className="object-cover" />
          <div className={`absolute inset-0 ${HERO_FADE}`} />
        </div>
        <div ref={paperMarker} className="pointer-events-none absolute inset-x-0 h-px" style={{ top: heroHeight * HERO_PAPER_FROM }} />
        {content}
      </div>
    </ExportPageTransition>
  );
}
