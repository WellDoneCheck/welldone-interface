'use client';

import { useState } from 'react';
import Image from 'next/image';
import TimelineCompare from './TimelineCompare';
import { useFitScale, type FitStage } from './useFitScale';
import { CAPTURES } from '../data/captures';
import type { RecordItem } from '../data/mapRecords';

// Content is laid out for the 1920×1080 Figma frame and scaled to the viewport; the height is that of the
// square compare panel plus its film strip, with the navbar (120px) and some breathing room kept free
const OVERLAY_STAGE: FitStage = { width: 1920, height: 890, marginX: 0, marginY: 180, minViewportWidth: 0 };
const NAVBAR_HEIGHT = 120;
const LEFT_MARGIN = 129;
const RIGHT_MARGIN = 80;
// Figma places the info column 149px below the navbar edge
const INFO_TOP_OFFSET = 149;

type Verdict = 'yes' | 'no';

const VERDICTS: { verdict: Verdict; label: string; color: string }[] = [
  { verdict: 'no', label: '不是井', color: 'bg-[#BC5646]' },
  { verdict: 'yes', label: '是井', color: 'bg-[#62A4A7]' },
];

/* ─── Background ────────────────────────────────────────────────── */

function Background() {
  return (
    <div className="absolute inset-0">
      <Image src="/aerial-tile.png" alt="" fill priority sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,3,3,0.4)_0%,rgba(35,35,35,0.28)_47%,rgba(255,255,255,0)_100%)]" />
      <div className="absolute inset-0 opacity-40 [background:radial-gradient(ellipse_1707px_960px_at_50%_50%,rgba(99,83,54,0)_6%,rgba(150,126,82,0.5)_38%,rgb(201,169,110)_70%)]" />
    </div>
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

function VerdictButton({ label, color, selected, dimmed, onClick }: { label: string; color: string; selected: boolean; dimmed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`h-[77px] w-[200px] text-[32px] font-bold text-[#FBFBF8] transition-all duration-300 ease-[var(--ease-expo)] hover:brightness-110 active:scale-[0.97] ${color} ${
        selected ? 'shadow-[0_0_0_3px_rgba(251,251,248,0.85)]' : ''
      } ${dimmed ? 'opacity-45' : ''}`}
    >
      {label}
    </button>
  );
}

function WellInfo({ record }: { record: RecordItem }) {
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const chosen = VERDICTS.find((item) => item.verdict === verdict);

  return (
    <div className="w-[700px]">
      <h1 className="text-[96px] font-black leading-[normal] text-[#FBFBF8]">{record.id}</h1>
      <div className="mt-[9px] flex flex-col gap-[35px] pl-[5px]">
        <InfoRow icon="/check/icon-location.png" text={record.coordinates} />
        <InfoRow icon="/check/icon-clock.png" text={record.timestamp.slice(0, 16)} />
      </div>
      <div className="mt-[129px] flex gap-[50px] pl-px">
        {VERDICTS.map((item) => (
          <VerdictButton
            key={item.verdict}
            label={item.label}
            color={item.color}
            selected={verdict === item.verdict}
            dimmed={verdict !== null && verdict !== item.verdict}
            onClick={() => setVerdict(item.verdict)}
          />
        ))}
      </div>
      <p aria-live="polite" className="mt-5 h-[30px] pl-px text-[22px] font-bold text-[#FBFBF8]/80">
        {chosen ? `已標記為「${chosen.label}」（示意，尚未儲存）` : ''}
      </p>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

export default function CheckPage({ record }: { record: RecordItem }) {
  const scale = useFitScale(OVERLAY_STAGE);

  return (
    <div className="relative h-screen overflow-hidden bg-[#2C322F]" style={{ fontFamily: 'var(--font-noto-serif-tc), serif' }}>
      <Background />

      <div
        className="absolute inset-x-0 bottom-0 flex items-center justify-between"
        style={{ top: NAVBAR_HEIGHT, paddingLeft: LEFT_MARGIN * scale, paddingRight: RIGHT_MARGIN * scale }}
      >
        <div className="self-start" style={{ marginTop: INFO_TOP_OFFSET * scale }}>
          <div style={{ zoom: scale }}>
            <WellInfo key={record.id} record={record} />
          </div>
        </div>
        <div style={{ zoom: scale }}>
          <TimelineCompare captures={CAPTURES} />
        </div>
      </div>
    </div>
  );
}
