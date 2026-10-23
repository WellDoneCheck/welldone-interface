'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import TimelineCompare from './TimelineCompare';
import BackToMapLink, { BACK_LINK_HEIGHT } from './BackToMapLink';
import ExportEntry from './ExportEntry';
import SharedTransition, { FROM_EXPORT_SHARE, PageBackgroundTransition, SHARED, TO_MAP, pagePart } from './SharedTransition';
import { useFitScale, type FitStage } from './useFitScale';
import { CONTENT_TOP, FRAME_MARGIN_X, FRAME_MARGIN_Y, PAGE_GAP, PAGE_GUTTER } from './pageFrame';
import { useSiteChrome } from './SiteChrome';
import { useWellVerdicts } from './useWellVerdicts';
import { canVerify, saveVerdict, verdictOf } from '../utils/wellVerdicts';
import { rememberVisit } from '../utils/lastVisit';
import type { CheckView } from '../utils/routeRecords';
import type { MapWell, Verdict } from '../utils/wells';

// The info column (560 wide: a 72px well id like SW-2023-A005 needs ~530) and the compare panel (film strip + square
// image, 972 wide and 702 tall) with at least 60px between them, scaled to fit the content area lined up with the navbar
const PANEL_HEIGHT = 702;
const INFO_WIDTH = 560;
// The link back to the map sits just above the content (which starts where it does on the map page), in the navbar's
// bottom margin, so it never covers the well id (whose line starts with some room above the letters)
const BACK_LINK_TOP = CONTENT_TOP - BACK_LINK_HEIGHT;
const OVERLAY_STAGE: FitStage = { width: INFO_WIDTH + 60 + 972, height: PANEL_HEIGHT, marginX: FRAME_MARGIN_X, marginY: FRAME_MARGIN_Y, minViewportWidth: 0 };

// 是井 in the teal a verified well wears everywhere (VERDICT_COLOR); 不是井 keeps the page's own red
const VERDICTS: { verdict: Verdict; label: string; color: string }[] = [
  { verdict: 'not-well', label: '不是井', color: 'bg-[#BC5646]' },
  { verdict: 'well', label: '是井', color: 'bg-[#62A4A7]' },
];

/* ─── Background ────────────────────────────────────────────────── */

function Background() {
  return (
    <PageBackgroundTransition>
      <div className="absolute inset-0">
        <Image src="/aerial-tile.webp" unoptimized alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,3,3,0.4)_0%,rgba(35,35,35,0.28)_47%,rgba(255,255,255,0)_100%)]" />
        <div className="absolute inset-0 opacity-40 [background:radial-gradient(ellipse_1707px_960px_at_50%_50%,rgba(99,83,54,0)_6%,rgba(150,126,82,0.5)_38%,rgb(201,169,110)_70%)]" />
      </div>
    </PageBackgroundTransition>
  );
}

/* ─── Well info ─────────────────────────────────────────────────── */

function InfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-[22px] text-[40px] font-black leading-[normal] text-[#FBFBF8]">
      <Image src={icon} alt="" width={60} height={60} />
      {text}
    </div>
  );
}

interface VerdictButtonProps {
  label: string;
  color: string;
  selected: boolean;
  dimmed: boolean;
  disabled: boolean;
  onClick: () => void;
}

function VerdictButton({ label, color, selected, dimmed, disabled, onClick }: VerdictButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={`h-[77px] w-[200px] text-[32px] font-bold text-[#FBFBF8] transition-all duration-300 ease-[var(--ease-expo)] hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:hover:brightness-100 ${color} ${
        selected ? 'shadow-[0_0_0_3px_rgba(251,251,248,0.85)]' : ''
      } ${dimmed ? 'opacity-45' : ''}`}
    >
      {label}
    </button>
  );
}

// What the line under the buttons says: saving, why it failed, the verdict given, or that viewers cannot give one
function verdictNote(saving: boolean, error: string | null, chosen: string | undefined, allowed: boolean): string {
  if (saving) return '儲存中…';
  if (error) return error;
  if (chosen) return `已標記為「${chosen}」`;
  return allowed ? '' : '檢視者帳號無法驗證水井';
}

function WellInfo({ record }: { record: MapWell }) {
  // shared with the export page (and its counts on the map page): a verdict given here shows there, and the other way
  const verdict = verdictOf(record, useWellVerdicts());
  const chosen = VERDICTS.find((item) => item.verdict === verdict);
  const { session } = useSiteChrome();
  const allowed = session !== null && canVerify(session.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = async (next: Verdict) => {
    setSaving(true);
    setError(null);
    try {
      await saveVerdict(record, next);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ width: INFO_WIDTH }}>
      <SharedTransition name={SHARED.wellId} share={FROM_EXPORT_SHARE}>
        <h1 className="whitespace-nowrap text-[72px] font-black leading-[normal] text-[#FBFBF8]">{record.id}</h1>
      </SharedTransition>
      <div className="mt-[9px] flex flex-col gap-[35px] pl-[5px]">
        <SharedTransition name={SHARED.wellCoordinates} share={FROM_EXPORT_SHARE}>
          <InfoRow icon="/check/icon-location.png" text={record.coordinates} />
        </SharedTransition>
        <SharedTransition name={SHARED.wellTime} share={FROM_EXPORT_SHARE}>
          <InfoRow icon="/check/icon-clock.png" text={record.timestamp.slice(0, 16)} />
        </SharedTransition>
      </div>
      <div className="mt-[129px] flex gap-[50px] pl-px">
        {VERDICTS.map((item) => (
          <VerdictButton
            key={item.verdict}
            label={item.label}
            color={item.color}
            selected={verdict === item.verdict}
            dimmed={verdict !== null && verdict !== item.verdict}
            disabled={!allowed || saving}
            onClick={() => choose(item.verdict)}
          />
        ))}
      </div>
      <p aria-live="polite" className="mt-5 h-[30px] pl-px text-[22px] font-bold text-[#FBFBF8]/80">
        {verdictNote(saving, error, chosen?.label, allowed)}
      </p>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

export default function CheckPage({ view }: { view: CheckView }) {
  const { well: record, task, captures, backHref } = view;
  const scale = useFitScale(OVERLAY_STAGE);
  // the navbar's 水井檢查 comes back to the well checked last
  useEffect(() => rememberVisit('check', record.id), [record.id]);

  return (
    <div className="relative h-screen overflow-hidden bg-[#2C322F]" style={{ fontFamily: 'var(--font-noto-serif-tc), serif' }}>
      <Background />

      {/* beside it, the map file the well was found in */}
      <BackToMapLink href={backHref} transitionTypes={TO_MAP} mapFile={task} top={BACK_LINK_TOP} />

      {/* lined up with the navbar left and right, centred in the height between the navbar and the window's bottom */}
      <div className="absolute flex items-center" style={{ ...pagePart('check-content'), top: CONTENT_TOP, bottom: PAGE_GAP, left: PAGE_GUTTER, right: PAGE_GUTTER }}>
        <div className="flex w-full items-stretch justify-between" style={{ height: PANEL_HEIGHT * scale }}>
          {/* well info at the top of the column, the export shortcut level with the compare panel's bottom */}
          <div className="flex flex-col justify-between">
            <div style={{ zoom: scale }}>
              <WellInfo key={record.id} record={record} />
            </div>
            <div className="self-start" style={{ zoom: scale }}>
              <ExportEntry recordId={task.id} />
            </div>
          </div>
          <div style={{ zoom: scale }}>
            <TimelineCompare captures={captures} />
          </div>
        </div>
      </div>
    </div>
  );
}
