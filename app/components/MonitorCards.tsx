import Link from 'next/link';
import { useState, type CSSProperties, type ReactNode } from 'react';
import TrendChart from './TrendChart';
import InlineNameInput from './InlineNameInput';
import SharedTransition, { ONLY_TO_MONITOR, SHARED } from './SharedTransition';
import {
  LEVEL_META,
  RECOGNITION_ACCURACY,
  TASK_META,
  TREND,
  TREND_FIRST_DAY,
  TREND_TARGET,
  VERIFIED_THIS_WEEK,
  type Level,
  type WellStatus,
} from '../data/monitor';
import {
  CPU_HISTORY_LENGTH,
  currentCpu,
  defaultTaskName,
  eventTitle,
  formatAgo,
  LOAD_WARNING,
  loadLevel,
  memoryPercent,
  minutesLeft,
  REFRESH_MS,
  serviceLevel,
  systemHealth,
  taskName,
  type LiveEvent,
  type LiveService,
  type LiveTask,
  type MonitorSnapshot,
} from '../utils/monitorLive';

// Text on the light panels: primary, secondary and muted ink. Values and labels always wear these, never a status color:
// the status icon beside them carries the level.
const INK = 'text-[#2C322F]';
const INK_2 = 'text-[#2C322F]/70';
const MUTED = 'text-[#2C322F]/50';
const RULE = 'border-[#2C322F]/[0.08]';
// the dark glyph drawn on a status icon
const GLYPH = '#141917';
// A light panel over the aerial photo, as the site's other cards (no backdrop blur: it would be worked out again on
// every repaint behind it)
const SURFACE = 'border border-[#2C322F]/10 bg-[#F7F6F1]/[0.94] shadow-[8px_8px_40px_0_rgba(0,0,0,0.25)]';

/* ─── Status icons ──────────────────────────────────────────────── */

// A different shape per level (circle with a check, circle with an i, triangle, octagon), so it never rests on color alone
export function StatusIcon({ level, size = 16 }: { level: Level; size?: number }) {
  const color = LEVEL_META[level].color;
  const glyph = { stroke: GLYPH, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 16 16" className="shrink-0">
      {level === 'good' && (
        <>
          <circle cx="8" cy="8" r="7" fill={color} />
          <path d="M4.8 8.2l2.1 2.1 4.3-4.6" {...glyph} />
        </>
      )}
      {level === 'info' && (
        <>
          <circle cx="8" cy="8" r="7" fill={color} />
          <path d="M8 7.3v4" {...glyph} />
          <circle cx="8" cy="4.9" r="1" fill={GLYPH} />
        </>
      )}
      {level === 'warning' && (
        <>
          <path d="M8 1.2 15.2 14H0.8Z" fill={color} strokeLinejoin="round" />
          <path d="M8 6v3.8" {...glyph} />
          <circle cx="8" cy="11.8" r="0.95" fill={GLYPH} />
        </>
      )}
      {level === 'critical' && (
        <>
          <path d="M5.1 1h5.8L15 5.1v5.8L10.9 15H5.1L1 10.9V5.1Z" fill={color} />
          <path d="M5.9 5.9l4.2 4.2M10.1 5.9l-4.2 4.2" {...glyph} />
        </>
      )}
    </svg>
  );
}

function LevelTag({ level, label }: { level: Level; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] ${INK}`}>
      <StatusIcon level={level} size={14} />
      {label}
    </span>
  );
}

/* ─── Building blocks ───────────────────────────────────────────── */

interface PanelProps {
  title: string;
  // a short summary on the right of the title
  meta?: ReactNode;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

function Panel({ title, meta, className = '', style, children }: PanelProps) {
  return (
    <section
      aria-label={title}
      className={`flex min-h-0 flex-col ${SURFACE} ${className}`}
      style={style}
    >
      <header className="flex shrink-0 items-baseline justify-between gap-4 px-5 pb-3 pt-4">
        <h2 className={`text-[15px] font-bold tracking-[0.06em] ${INK}`}>{title}</h2>
        {meta && <p className={`truncate text-xs ${MUTED}`}>{meta}</p>}
      </header>
      {children}
    </section>
  );
}

// A panel whose contents are for logged-in users: its title and frame where it will be, and a way to log in
export function LockedPanel({ title, what, className = '', onLogin }: { title: string; what: string; className?: string; onLogin: () => void }) {
  return (
    <Panel title={title} className={className}>
      <div className={`flex flex-1 flex-col items-center justify-center gap-3 border-t ${RULE} px-6 py-6 text-center`}>
        <svg aria-hidden width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-[#2C322F]/45">
          <rect x="4" y="9.5" width="14" height="10" rx="1.5" />
          <path d="M7.5 9.5V7a3.5 3.5 0 0 1 7 0v2.5" />
        </svg>
        <p className={`text-sm ${INK_2}`}>登入後可查看{what}</p>
        <button
          type="button"
          onClick={onLogin}
          className="bg-[#62A4A7] px-4 py-1.5 text-sm font-bold text-white transition-colors duration-300 hover:bg-[#54999D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#62A4A7]"
        >
          登入
        </button>
      </div>
    </Panel>
  );
}

// A filled bar on a lighter track of the same color
function Meter({ percent, color, label }: { percent: number; color: string; label: string }) {
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      className="h-1 w-full overflow-hidden rounded-full"
      style={{ backgroundColor: `${color}33` }}
    >
      <div className="h-full rounded-full transition-[width] duration-700 ease-[var(--ease-expo)]" style={{ width: `${percent}%`, backgroundColor: color }} />
    </div>
  );
}

// Recent readings as a thin line with the warning threshold behind it; the latest reading is the dot, in its level's color
function Sparkline({ values, max = 100, threshold }: { values: number[]; max?: number; threshold: number }) {
  const width = 88;
  const height = 26;
  const x = (index: number) => 1 + (index * (width - 6)) / (CPU_HISTORY_LENGTH - 1);
  const y = (value: number) => 3 + (1 - value / max) * (height - 6);
  const last = values[values.length - 1];
  return (
    <svg aria-hidden width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0 overflow-visible">
      <line x1="0" x2={width - 4} y1={y(threshold)} y2={y(threshold)} stroke="#2C322F" strokeOpacity="0.14" />
      <polyline
        points={values.map((value, index) => `${x(index)},${y(value)}`).join(' ')}
        fill="none"
        stroke="#6F7468"
        strokeOpacity="0.8"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={x(values.length - 1)} cy={y(last)} r="3.5" fill={LEVEL_META[loadLevel(last)].color} stroke="#F7F6F1" strokeWidth="2" />
    </svg>
  );
}

/* ─── Status bar ────────────────────────────────────────────────── */

const HEALTH_LABEL: Record<Level, string> = { good: '系統正常', info: '系統正常', warning: '需要注意', critical: '系統異常' };

interface StatusBarProps {
  snapshot: MonitorSnapshot;
  paused: boolean;
  onTogglePaused: () => void;
  cycle: number;
}

// Live or paused, how the whole system is doing, and when the figures were last updated
export function StatusBar({ snapshot, paused, onTogglePaused, cycle }: StatusBarProps) {
  const health = systemHealth(snapshot);
  const updatedAt = new Date(snapshot.now).toLocaleTimeString('zh-TW', { hour12: false });

  return (
    <div className={`flex h-[52px] shrink-0 items-center gap-6 px-5 ${SURFACE}`}>
      <p className={`flex items-center gap-2.5 text-[13px] font-bold tracking-[0.12em] ${INK}`}>
        <span className="relative flex h-2.5 w-2.5">
          {!paused && <span className="absolute inset-0 animate-ping rounded-full bg-[#62A4A7] opacity-70 motion-reduce:animate-none" />}
          <span className={`relative h-2.5 w-2.5 rounded-full ${paused ? 'bg-[#2C322F]/30' : 'bg-[#62A4A7]'}`} />
        </span>
        {paused ? '已暫停' : '即時監控'}
      </p>

      <span className="h-5 w-px bg-[#2C322F]/15" />

      <p role="status" className={`flex items-center gap-2 text-[15px] font-bold ${INK}`}>
        <StatusIcon level={health.level} size={18} />
        {HEALTH_LABEL[health.level]}
        {health.issues > 0 && <span className={`text-[13px] font-normal ${INK_2}`}>・{health.issues} 項待處理</span>}
      </p>

      <div className="ml-auto flex items-center gap-5">
        <p className={`text-[13px] ${MUTED}`}>
          最後更新{' '}
          <time suppressHydrationWarning className={`tabular-nums ${INK_2}`}>
            {updatedAt}
          </time>
        </p>
        {/* how long until the next update */}
        <div aria-hidden className="h-1 w-[96px] overflow-hidden rounded-full bg-[#2C322F]/10">
          <div
            key={cycle}
            className="h-full origin-left rounded-full bg-[#62A4A7]/80 [animation:monitor-countdown_linear_both] motion-reduce:hidden"
            style={{ animationDuration: `${REFRESH_MS}ms`, animationPlayState: paused ? 'paused' : 'running' }}
          />
        </div>
        <button
          type="button"
          onClick={onTogglePaused}
          aria-pressed={paused}
          className={`flex items-center gap-2 border border-[#2C322F]/20 px-3 py-1.5 text-[13px] font-bold transition-colors duration-300 hover:bg-[#2C322F]/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#62A4A7] ${INK}`}
        >
          <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            {paused ? <path d="M3 1.5v9l7.5-4.5Z" /> : <path d="M2.5 1.5h2.5v9H2.5ZM7 1.5h2.5v9H7Z" />}
          </svg>
          {paused ? '繼續更新' : '暫停更新'}
        </button>
      </div>
    </div>
  );
}

/* ─── Headline numbers ──────────────────────────────────────────── */

function StatTile({ label, note, children }: { label: string; note: string; children: ReactNode }) {
  return (
    <div className={`flex flex-col justify-between px-5 py-4 ${SURFACE}`}>
      <p className={`text-sm ${INK_2}`}>{label}</p>
      <div className={`text-[40px] font-semibold leading-none tracking-tight ${INK}`}>{children}</div>
      <p className={`text-xs ${MUTED}`}>{note}</p>
    </div>
  );
}

export function StatTiles({ totals }: { totals: Record<WellStatus, number> }) {
  return (
    <div className="grid h-[236px] shrink-0 grid-cols-2 grid-rows-2 gap-3">
      <StatTile label="已驗證水井" note={`本週 +${VERIFIED_THIS_WEEK}`}>
        {totals.verified.toLocaleString()}
      </StatTile>
      <StatTile label="待確認" note="需人工複核">
        <span className="inline-flex items-center gap-3">
          {totals.pending.toLocaleString()}
          <StatusIcon level="warning" size={20} />
        </span>
      </StatTile>
      <StatTile label="判定不是井" note="已排除">
        {totals.rejected.toLocaleString()}
      </StatTile>
      <StatTile label="辨識準確率" note="近 30 天">
        {/* the home page's big figure flies in here */}
        <SharedTransition name={SHARED.recognitionAccuracy} share={ONLY_TO_MONITOR}>
          <p className="w-fit">
            {RECOGNITION_ACCURACY}
            <span className={`ml-0.5 text-[24px] ${INK_2}`}>%</span>
          </p>
        </SharedTransition>
      </StatTile>
    </div>
  );
}

/* ─── Trend ─────────────────────────────────────────────────────── */

export function TrendPanel() {
  return (
    <Panel
      title="每日驗證數"
      className="h-[180px] shrink-0"
      meta={
        <span className="inline-flex items-center gap-2">
          近 30 天
          <span className="inline-block w-4 border-t border-dashed border-[#2C322F]/50" />
          目標 {TREND_TARGET} 口／日
        </span>
      }
    >
      <div className="px-5 pb-3">
        <TrendChart data={TREND} target={TREND_TARGET} firstDay={TREND_FIRST_DAY} />
      </div>
    </Panel>
  );
}

/* ─── Services ──────────────────────────────────────────────────── */

const SERVICE_LABEL: Record<Level, string> = { good: '正常', info: '正常', warning: '偏高', critical: '過載' };
const SERVICE_COLUMNS = 'grid grid-cols-[1fr_64px_148px_128px] items-center gap-4';

function ServiceRow({ service }: { service: LiveService }) {
  const memory = memoryPercent(service);
  return (
    <li className={`${SERVICE_COLUMNS} border-t ${RULE} px-5 py-1.5`}>
      <div className="min-w-0">
        <p className={`truncate text-sm ${INK}`}>{service.name}</p>
        <p className={`truncate text-[11px] ${MUTED}`}>{service.code}</p>
      </div>
      <LevelTag level={serviceLevel(service)} label={SERVICE_LABEL[serviceLevel(service)]} />
      <div className="flex items-center gap-2.5">
        <Sparkline values={service.cpu} threshold={LOAD_WARNING} />
        <span className={`w-[46px] text-right text-[13px] tabular-nums ${INK}`}>{currentCpu(service).toFixed(1)}%</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className={`text-right text-[12px] tabular-nums ${INK_2}`}>
          {service.memoryUsedGb.toFixed(2)} / {service.memoryTotalGb} GB
        </span>
        <Meter percent={memory} color={LEVEL_META[loadLevel(memory)].color} label={`${service.name}記憶體使用率`} />
      </div>
    </li>
  );
}

export function ServicesPanel({ services }: { services: LiveService[] }) {
  const needsLook = services.filter((service) => serviceLevel(service) !== 'good').length;
  return (
    <Panel title="服務健康" meta={needsLook > 0 ? `${needsLook} 項負載偏高` : `${services.length} 項服務皆正常`} className="flex-1">
      <div className={`${SERVICE_COLUMNS} px-5 pb-2 text-[11px] ${MUTED}`}>
        <span>服務</span>
        <span>狀態</span>
        <span>CPU（近 2 分鐘）</span>
        <span className="text-right">記憶體</span>
      </div>
      <ul>
        {services.map((service) => (
          <ServiceRow key={service.code} service={service} />
        ))}
      </ul>
    </Panel>
  );
}

/* ─── Tasks ─────────────────────────────────────────────────────── */

function TaskIcon({ task }: { task: LiveTask }) {
  if (task.state !== 'running') return <StatusIcon level={TASK_META[task.state].level} size={16} />;
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" className="shrink-0 animate-spin motion-reduce:animate-none">
      <circle cx="8" cy="8" r="6" fill="none" stroke="#62A4A7" strokeOpacity="0.25" strokeWidth="2.4" />
      <path d="M8 2a6 6 0 0 1 6 6" fill="none" stroke="#62A4A7" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function TaskProgress({ task }: { task: LiveTask }) {
  const images = `${task.processed.toLocaleString()} / ${task.images.toLocaleString()} 張`;
  if (task.state === 'running') {
    return (
      <div className="mt-2 flex items-center gap-3">
        <Meter percent={(task.processed / task.images) * 100} color="#62A4A7" label={`${taskName(task)}辨識進度`} />
        <span className={`shrink-0 text-xs tabular-nums ${INK_2}`}>
          {images}・約 {minutesLeft(task)} 分鐘
        </span>
      </div>
    );
  }
  const summary = {
    queued: `等待辨識・${task.images.toLocaleString()} 張`,
    failed: `${task.error}・停在 ${images}`,
    done: `找到 ${task.found} 口水井・${task.images.toLocaleString()} 張`,
  }[task.state];
  return <p className={`mt-1 text-xs ${task.state === 'failed' ? INK_2 : MUTED}`}>{summary}</p>;
}

function PencilIcon() {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
      <path d="M9.6 1.9l2.5 2.5-7.3 7.3-3 .5.5-3z" />
      <path d="M8.3 3.2l2.5 2.5" />
    </svg>
  );
}

// onRename: renaming the task (left out, e.g. before logging in: no pencil)
function TaskRow({ task, now, onRename }: { task: LiveTask; now: number; onRename?: (id: string, name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const name = taskName(task);

  const finishEditing = (draft: string | null) => {
    setEditing(false);
    if (draft !== null) onRename?.(task.id, draft);
  };

  return (
    <li className={`group/task border-t ${RULE} px-5 py-3 transition-colors duration-300 hover:bg-[#2C322F]/[0.04]`}>
      <div className="flex items-center gap-2.5">
        <TaskIcon task={task} />
        {editing ? (
          <InlineNameInput
            initial={task.name ?? ''}
            placeholder={defaultTaskName(task.createdAt)}
            label="批次名稱"
            onDone={finishEditing}
            className={`border-[#62A4A7] text-sm placeholder:text-[#2C322F]/35 ${INK}`}
          />
        ) : (
          <>
            {/* a default name comes from the time, which may differ by a minute between the server and the browser */}
            <Link href="/upload" suppressHydrationWarning className={`min-w-0 truncate text-sm outline-none hover:underline focus-visible:underline ${INK}`}>
              {name}
            </Link>
            {onRename && (
              <button
                type="button"
                aria-label={`重新命名「${name}」`}
                onClick={() => setEditing(true)}
                className="shrink-0 p-1 text-[#2C322F]/50 opacity-0 transition-opacity duration-300 hover:text-[#2C322F] focus-visible:opacity-100 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#62A4A7] group-hover/task:opacity-100"
              >
                <PencilIcon />
              </button>
            )}
            <span className="flex-1" />
          </>
        )}
        <span className={`shrink-0 text-xs ${INK_2}`}>{TASK_META[task.state].label}</span>
        <span className={`w-[64px] shrink-0 text-right text-xs ${MUTED}`}>{formatAgo(now - task.createdAt)}</span>
      </div>
      <div className="pl-[26px]">
        <TaskProgress task={task} />
      </div>
    </li>
  );
}

interface TasksPanelProps {
  tasks: LiveTask[];
  now: number;
  onRename?: (id: string, name: string) => void;
}

export function TasksPanel({ tasks, now, onRename }: TasksPanelProps) {
  const count = (state: LiveTask['state']) => tasks.filter((task) => task.state === state).length;
  return (
    <Panel title="辨識任務" meta={`辨識中 ${count('running')}・排隊 ${count('queued')}・失敗 ${count('failed')}`} className="h-[382px] shrink-0">
      <ul className="min-h-0 flex-1 overflow-y-auto [scrollbar-color:rgba(44,50,47,0.2)_transparent] [scrollbar-width:thin]">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} now={now} onRename={onRename} />
        ))}
      </ul>
    </Panel>
  );
}

/* ─── Events ────────────────────────────────────────────────────── */

function EventContent({ event, tasks, now }: { event: LiveEvent; tasks: LiveTask[]; now: number }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5">
        <StatusIcon level={event.level} />
      </span>
      <div className="min-w-0 flex-1">
        <p suppressHydrationWarning className={`truncate text-sm ${INK}`}>
          {eventTitle(event, tasks)}
        </p>
        {event.detail && <p className={`mt-0.5 truncate text-xs ${MUTED}`}>{event.detail}</p>}
      </div>
      <span className={`shrink-0 text-xs ${MUTED}`}>{formatAgo(now - event.at)}</span>
    </div>
  );
}

// Newest on top; a new one slides in
export function EventsPanel({ events, tasks, now }: { events: LiveEvent[]; tasks: LiveTask[]; now: number }) {
  const needsLook = events.filter((event) => event.level === 'warning' || event.level === 'critical').length;
  return (
    <Panel title="警示與事件" meta={needsLook > 0 ? `${needsLook} 則需注意` : '沒有需要注意的事件'} className="flex-1">
      <ol aria-live="polite" className="min-h-0 flex-1 overflow-y-auto [scrollbar-color:rgba(44,50,47,0.2)_transparent] [scrollbar-width:thin]">
        {events.map((event) => (
          <li key={event.id} className={`border-t ${RULE} [animation:monitor-event-in_600ms_var(--ease-expo)_both] motion-reduce:[animation:none]`}>
            {event.href ? (
              <Link href={event.href} className="block px-5 py-3 outline-none transition-colors duration-300 hover:bg-[#2C322F]/[0.04] focus-visible:bg-[#2C322F]/[0.06]">
                <EventContent event={event} tasks={tasks} now={now} />
              </Link>
            ) : (
              <div className="px-5 py-3">
                <EventContent event={event} tasks={tasks} now={now} />
              </div>
            )}
          </li>
        ))}
      </ol>
    </Panel>
  );
}
