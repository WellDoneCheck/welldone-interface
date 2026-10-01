// Monitor dashboard data. Placeholder until it comes from the backend.
import { getLatestFinishedRecord, wellsOf } from './mapRecords';

/* ─── Wells ─────────────────────────────────────────────────────── */

export type WellStatus = 'verified' | 'pending' | 'rejected';

// Marker colors are the status colors below: verified reads as good, pending as needing a look, rejected as critical
export const STATUS_META: Record<WellStatus, { label: string; dot: string }> = {
  verified: { label: '已驗證', dot: 'bg-[#62A4A7]' },
  pending: { label: '待確認', dot: 'bg-[#E0B24A]' },
  rejected: { label: '不是井', dot: 'bg-[#E5534B]' },
};

/* ─── Status levels ─────────────────────────────────────────────── */

// How healthy something is (a service, a task, the whole system) or how urgent an event is. The colors are reserved
// for these levels and always shown with an icon and a label (checked for color vision deficiency on the dark panels).
export type Level = 'good' | 'info' | 'warning' | 'critical';

export const LEVEL_META: Record<Level, { label: string; color: string }> = {
  good: { label: '正常', color: '#62A4A7' },
  info: { label: '通知', color: '#A9B8B4' },
  warning: { label: '注意', color: '#E0B24A' },
  critical: { label: '異常', color: '#E5534B' },
};

export const WELL_TOTALS: Record<WellStatus, number> = { verified: 1284, pending: 96, rejected: 13 };
export const RECOGNITION_ACCURACY = 97.3;
export const VERIFIED_THIS_WEEK = 37;

export interface WellMarker {
  recordId: string;
  coordinates: string;
  latitude: number;
  longitude: number;
  status: WellStatus;
  confidence: number;
}

// Status and confidence of each monitored well
const MARKER_STATES: Pick<WellMarker, 'status' | 'confidence'>[] = [
  { status: 'pending', confidence: 94.2 },
  { status: 'verified', confidence: 98.6 },
  { status: 'verified', confidence: 97.1 },
  { status: 'rejected', confidence: 41.5 },
  { status: 'verified', confidence: 99.0 },
  { status: 'pending', confidence: 88.7 },
  { status: 'verified', confidence: 96.4 },
  { status: 'verified', confidence: 95.9 },
  { status: 'pending', confidence: 91.3 },
  { status: 'verified', confidence: 98.2 },
  { status: 'rejected', confidence: 37.8 },
  { status: 'verified', confidence: 97.7 },
];

// One marker per state above, on wells of the newest finished map taken evenly through it, so a marker can lead
// straight to that well's verification page (recordId: the well's id, as /check?record= takes it)
const MONITORED_WELLS = wellsOf(getLatestFinishedRecord().id);
export const MARKERS: WellMarker[] = MARKER_STATES.map((state, index) => {
  const well = MONITORED_WELLS[Math.floor((index * MONITORED_WELLS.length) / MARKER_STATES.length)];
  return { recordId: well.id, coordinates: well.coordinates, latitude: well.latitude, longitude: well.longitude, ...state };
});

/* ─── Trend ─────────────────────────────────────────────────────── */

export const TREND_TARGET = 45;
export const TREND_FIRST_DAY = '2026-08-23';
// Wells verified per day over the last 30 days
export const TREND: number[] = Array.from({ length: 30 }, (_, day) =>
  Math.round(38 + 14 * Math.sin(day / 3.1) + 9 * Math.sin(day / 1.3)),
);

/* ─── Tasks ─────────────────────────────────────────────────────── */

export type TaskState = 'running' | 'done' | 'queued' | 'failed';

export const TASK_META: Record<TaskState, { label: string; level: Level }> = {
  running: { label: '辨識中', level: 'info' },
  done: { label: '已完成', level: 'good' },
  queued: { label: '排隊中', level: 'info' },
  failed: { label: '失敗', level: 'warning' },
};

export interface MonitorTask {
  id: string;
  // a name someone gave it; until then it is named after when it was created (taskName in utils/monitorLive)
  name?: string;
  state: TaskState;
  createdMinutesAgo: number;
  // aerial images in the batch, and how many are recognized so far
  images: number;
  processed: number;
  // images recognized per update while running
  rate: number;
  // wells found, once done
  found?: number;
  // why it failed
  error?: string;
}

// Newest first
export const TASKS: MonitorTask[] = [
  { id: 'task-219', state: 'queued', createdMinutesAgo: 6, images: 860, processed: 0, rate: 30 },
  { id: 'task-218', state: 'running', createdMinutesAgo: 14, images: 1200, processed: 540, rate: 36 },
  { id: 'task-217', state: 'failed', createdMinutesAgo: 42, images: 980, processed: 312, rate: 0, error: '切圖服務逾時' },
  { id: 'task-216', name: '嘉義沿海測繪', state: 'done', createdMinutesAgo: 70, images: 640, processed: 640, rate: 0, found: 4 },
  { id: 'task-215', state: 'done', createdMinutesAgo: 1440, images: 1520, processed: 1520, rate: 0, found: 9 },
  { id: 'task-214', name: '屏東沿山航照', state: 'done', createdMinutesAgo: 2880, images: 720, processed: 720, rate: 0, found: 3 },
];

/* ─── Services ──────────────────────────────────────────────────── */

export interface ServiceStatus {
  name: string;
  code: string;
  // CPU usage it hovers around (%)
  cpuBase: number;
  memoryUsedGb: number;
  memoryTotalGb: number;
}

export const SERVICES: ServiceStatus[] = [
  { name: '水井後端服務', code: 'welldone-backend', cpuBase: 45, memoryUsedGb: 0.25, memoryTotalGb: 2 },
  { name: '切圖服務', code: 'welldone-splitter', cpuBase: 42, memoryUsedGb: 0.5, memoryTotalGb: 2 },
  { name: '拆圖服務', code: 'welldone-titiler', cpuBase: 24, memoryUsedGb: 0.39, memoryTotalGb: 2 },
  { name: '水井資料庫', code: 'welldone-postgres', cpuBase: 39, memoryUsedGb: 1.1, memoryTotalGb: 4 },
  { name: '模型辨識服務', code: 'welldone-aiservice', cpuBase: 74, memoryUsedGb: 3.4, memoryTotalGb: 8 },
];

/* ─── Events ────────────────────────────────────────────────────── */

export interface MonitorEvent {
  id: string;
  level: Level;
  // for an event about a batch: what happened to it; the batch's name follows ('批次完成：…')
  title: string;
  taskId?: string;
  detail?: string;
  // where to deal with it
  href?: string;
  minutesAgo: number;
}

const LOW_CONFIDENCE_WELL = MARKERS.find((marker) => marker.status === 'pending') ?? MARKERS[0];

// Newest first
export const EVENTS: MonitorEvent[] = [
  { id: 'event-5', level: 'info', title: '新批次排入', taskId: 'task-219', detail: '860 張空拍影像', href: '/upload', minutesAgo: 6 },
  { id: 'event-4', level: 'info', title: '開始辨識', taskId: 'task-218', detail: '1,200 張空拍影像', href: '/upload', minutesAgo: 14 },
  { id: 'event-3', level: 'warning', title: '批次失敗', taskId: 'task-217', detail: '切圖服務逾時，請重新匯入', href: '/upload', minutesAgo: 42 },
  { id: 'event-2', level: 'good', title: '批次完成', taskId: 'task-216', detail: '新增 4 口待確認水井', href: '/upload', minutesAgo: 70 },
  {
    id: 'event-1',
    level: 'warning',
    title: `辨識信賴度偏低：${LOW_CONFIDENCE_WELL.recordId}`,
    detail: `信賴度 ${LOW_CONFIDENCE_WELL.confidence}%，建議人工確認`,
    href: `/check?record=${LOW_CONFIDENCE_WELL.recordId}`,
    minutesAgo: 180,
  },
];
