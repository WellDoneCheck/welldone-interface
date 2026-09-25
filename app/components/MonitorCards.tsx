import Link from 'next/link';
import TrendChart from './TrendChart';
import {
  RECOGNITION_ACCURACY,
  SERVICES,
  TASKS,
  TASK_META,
  TREND,
  TREND_FIRST_DAY,
  TREND_TARGET,
  VERIFIED_THIS_WEEK,
  WELL_TOTALS,
  type ServiceStatus,
} from '../data/monitor';

const SERIF = { fontFamily: 'var(--font-noto-serif-tc), serif' };

const CARD = 'border-2 border-[#3F7A7E] bg-white shadow-[0_4px_2px_rgba(44,50,47,0.03)]';
const CARD_TITLE = 'text-xl font-bold tracking-[0.03em] text-[#6F7468]';

/* ─── Headline numbers ──────────────────────────────────────────── */

export function TotalCard() {
  return (
    <section className={`flex w-[259px] flex-col border-[3px] px-[22px] pt-5 ${CARD}`}>
      <h2 className={CARD_TITLE}>已驗證水井總量</h2>
      <p className="flex flex-1 items-center justify-center pb-6 text-[64px] font-bold leading-none text-[#3F7A7E]" style={SERIF}>
        {WELL_TOTALS.verified.toLocaleString()}
      </p>
    </section>
  );
}

export function AccuracyCard() {
  return (
    <section className={`flex w-[262px] flex-col border-[3px] px-[22px] pt-5 ${CARD}`}>
      <h2 className={CARD_TITLE}>辨識準確率</h2>
      <div className="flex flex-1 flex-col items-center justify-center pb-5">
        <p className="text-[64px] font-bold leading-none text-[#2C322F]" style={SERIF}>
          {RECOGNITION_ACCURACY}%
        </p>
        <p className="mt-3 text-base text-[#6F7468]">近 30 天</p>
      </div>
    </section>
  );
}

/* ─── Overview ──────────────────────────────────────────────────── */

function OverviewStat({ label, value, note, tone }: { label: string; value: string; note: string; tone: string }) {
  return (
    <div>
      <p className="text-sm text-[#6F7468]">{label}</p>
      <p className={`mt-1 text-4xl font-bold leading-none ${tone}`} style={SERIF}>
        {value}
      </p>
      <p className="mt-2 text-sm text-[#6F7468]">{note}</p>
    </div>
  );
}

export function OverviewCard() {
  return (
    <section className={`h-[261px] px-[23px] pt-[19px] ${CARD}`}>
      <h2 className={CARD_TITLE}>辨識概況</h2>
      <div className="mt-3 flex gap-14">
        <OverviewStat label="已驗證" value={WELL_TOTALS.verified.toLocaleString()} note={`本週 +${VERIFIED_THIS_WEEK}`} tone="text-[#3F7A7E]" />
        <OverviewStat label="待確認" value={String(WELL_TOTALS.pending)} note="需人工複核" tone="text-[#8A611C]" />
      </div>
      <div className="mt-3">
        <TrendChart data={TREND} target={TREND_TARGET} firstDay={TREND_FIRST_DAY} />
      </div>
    </section>
  );
}

/* ─── Latest tasks ──────────────────────────────────────────────── */

export function TasksCard() {
  return (
    <section className={`w-[532px] px-[23px] pt-[21px] ${CARD}`}>
      <h2 className="text-[15px] font-bold tracking-[0.03em] text-[#6F7468]">最新任務</h2>
      <table className="mt-4 w-full text-left">
        <thead>
          <tr className="border-b border-[#E7E3D8] text-xs font-medium text-[#6F7468]">
            <th className="w-[54%] px-1.5 py-2.5 font-medium">任務</th>
            <th className="w-[24%] px-1.5 py-2.5 font-medium">狀態</th>
            <th className="px-1.5 py-2.5 font-medium">建立時間</th>
          </tr>
        </thead>
        <tbody>
          {TASKS.map((task) => (
            <tr key={task.id} className="group border-b border-[#F1EFE9] transition-colors duration-300 last:border-0 hover:bg-[#F7F6F1]">
              <td className="h-12 px-1.5 text-[15px] text-[#2C322F]">
                <Link href="/upload" className="block py-2.5 outline-none focus-visible:underline">
                  {task.name}
                </Link>
              </td>
              <td className="px-1.5">
                <span className={`inline-block px-2.5 py-1 text-xs font-bold ${TASK_META[task.state].badge}`}>{TASK_META[task.state].label}</span>
              </td>
              <td className="px-1.5 text-[15px] text-[#2C322F]">{task.createdAgo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/* ─── Services ──────────────────────────────────────────────────── */

function UsageBar({ percent }: { percent: number }) {
  const tone = percent >= 80 ? 'bg-[#BC5646]' : percent >= 60 ? 'bg-[#D9A441]' : 'bg-[#3F7A7E]';
  return (
    <div className="h-[3px] w-full bg-[#E5E7EB]">
      <div className={`h-full ${tone}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

function ServiceItem({ service }: { service: ServiceStatus }) {
  const rows = [
    { label: '狀態', value: '運行中' },
    { label: '運行時間', value: service.uptime },
  ];

  return (
    <div className="min-w-0 flex-1 px-[22px] first:pl-0">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[15px] text-[#2C322F]">{service.name}</p>
        <span className="shrink-0 bg-[#D1E6E7] px-2 py-1 text-xs font-bold text-[#3F7A7E]">運行中</span>
      </div>
      <p className="mt-1 text-[11px] text-[#2C322F]/50">{service.code}</p>

      <dl className="mt-4 flex flex-col gap-2.5 text-[11px]">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between border-b border-[#F1EFE9] pb-2">
            <dt className="text-[#2C322F]/70">{row.label}</dt>
            <dd className="text-[#2C322F]">{row.value}</dd>
          </div>
        ))}
        <div className="flex flex-col gap-1.5 border-b border-[#F1EFE9] pb-2">
          <div className="flex items-center justify-between">
            <dt className="text-[#2C322F]/70">CPU 使用率</dt>
            <dd className="text-[#2C322F]">{service.cpu}%</dd>
          </div>
          <UsageBar percent={service.cpu} />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <dt className="text-[#2C322F]/70">記憶體使用量</dt>
            <dd className="text-[#2C322F]">
              {service.memoryUsed} / {service.memoryTotal}
            </dd>
          </div>
          <UsageBar percent={service.memoryPercent} />
        </div>
      </dl>
    </div>
  );
}

export function ServicesCard() {
  return (
    <section className={`h-[314px] px-[23px] pt-[19px] ${CARD}`}>
      <h2 className={CARD_TITLE}>服務狀態</h2>
      <div className="mt-4 flex divide-x divide-[#E5E7EB]">
        {SERVICES.map((service) => (
          <ServiceItem key={service.code} service={service} />
        ))}
      </div>
    </section>
  );
}
