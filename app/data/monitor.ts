// Monitor dashboard data. Placeholder until it comes from the backend.
import { YEAR_GROUPS } from './mapRecords';

/* ─── Wells ─────────────────────────────────────────────────────── */

export type WellStatus = 'verified' | 'pending' | 'rejected';

export const STATUS_META: Record<WellStatus, { label: string; dot: string; badge: string }> = {
  verified: { label: '已驗證', dot: 'bg-[#62A4A7]', badge: 'bg-[#D1E6E7] text-[#3F7A7E]' },
  pending: { label: '待確認', dot: 'bg-[#D9A441]', badge: 'bg-[#F8EBD1] text-[#8A611C]' },
  rejected: { label: '不是井', dot: 'bg-[#BC5646]', badge: 'bg-[#F7E5DF] text-[#98412F]' },
};

export const WELL_TOTALS: Record<WellStatus, number> = { verified: 1284, pending: 96, rejected: 13 };
export const RECOGNITION_ACCURACY = 97.3;
export const VERIFIED_THIS_WEEK = 37;

export interface WellMarker {
  recordId: string;
  coordinates: string;
  status: WellStatus;
  confidence: number;
  // position on the map, in % of the map image
  x: number;
  y: number;
}

const MARKER_LAYOUT: Pick<WellMarker, 'status' | 'confidence' | 'x' | 'y'>[] = [
  { status: 'pending', confidence: 94.2, x: 22, y: 32 },
  { status: 'verified', confidence: 98.6, x: 31, y: 58 },
  { status: 'verified', confidence: 97.1, x: 44, y: 24 },
  { status: 'rejected', confidence: 41.5, x: 52, y: 47 },
  { status: 'verified', confidence: 99.0, x: 61, y: 68 },
  { status: 'pending', confidence: 88.7, x: 68, y: 36 },
  { status: 'verified', confidence: 96.4, x: 74, y: 55 },
  { status: 'verified', confidence: 95.9, x: 39, y: 77 },
  { status: 'pending', confidence: 91.3, x: 82, y: 27 },
  { status: 'verified', confidence: 98.2, x: 17, y: 71 },
  { status: 'rejected', confidence: 37.8, x: 88, y: 63 },
  { status: 'verified', confidence: 97.7, x: 57, y: 15 },
];

// The service table covers the lower half of the map, so markers are kept in the upper part
const MARKER_TOP = 24;
const MARKER_Y_SCALE = 0.42;

// One marker per imported record, so a marker can lead straight to that well's verification page
export const MARKERS: WellMarker[] = YEAR_GROUPS.flatMap((group) => group.records).map((record, index) => ({
  recordId: record.id,
  coordinates: record.coordinates,
  ...MARKER_LAYOUT[index % MARKER_LAYOUT.length],
})).map((marker) => ({ ...marker, y: MARKER_TOP + (marker.y - 15) * MARKER_Y_SCALE }));

/* ─── Trend ─────────────────────────────────────────────────────── */

export const TREND_TARGET = 45;
export const TREND_FIRST_DAY = '2026-08-23';
// Wells verified per day over the last 30 days
export const TREND: number[] = Array.from({ length: 30 }, (_, day) =>
  Math.round(38 + 14 * Math.sin(day / 3.1) + 9 * Math.sin(day / 1.3)),
);

/* ─── Tasks ─────────────────────────────────────────────────────── */

export type TaskState = 'running' | 'done' | 'queued' | 'failed';

export const TASK_META: Record<TaskState, { label: string; badge: string }> = {
  running: { label: '辨識中', badge: 'bg-[#F8EBD1] text-[#8A611C]' },
  done: { label: '已完成', badge: 'bg-[#D1E6E7] text-[#3F7A7E]' },
  queued: { label: '排隊中', badge: 'bg-[#F1EFE9] text-[#6F7468]' },
  failed: { label: '失敗', badge: 'bg-[#F7E5DF] text-[#98412F]' },
};

export interface MonitorTask {
  id: string;
  name: string;
  state: TaskState;
  createdAgo: string;
}

export const TASKS: MonitorTask[] = [
  { id: 'task-218', name: '雲林縣航照批次 #218', state: 'running', createdAgo: '10 分鐘前' },
  { id: 'task-217', name: '嘉義沿海測繪 #217', state: 'done', createdAgo: '1 小時前' },
  { id: 'task-216', name: '台南灌溉區塊 #216', state: 'queued', createdAgo: '2 小時前' },
  { id: 'task-215', name: '彰化平原掃描 #215', state: 'failed', createdAgo: '昨天' },
  { id: 'task-214', name: '屏東沿山航照 #214', state: 'done', createdAgo: '昨天' },
  { id: 'task-213', name: '南投埔里測繪 #213', state: 'done', createdAgo: '2 天前' },
  { id: 'task-212', name: '花蓮縱谷掃描 #212', state: 'done', createdAgo: '3 天前' },
  { id: 'task-211', name: '宜蘭平原航照 #211', state: 'done', createdAgo: '4 天前' },
];

/* ─── Services ──────────────────────────────────────────────────── */

export interface ServiceStatus {
  name: string;
  code: string;
  uptime: string;
  cpu: number;
  memoryUsed: string;
  memoryTotal: string;
  memoryPercent: number;
}

export const SERVICES: ServiceStatus[] = [
  { name: '水井後端服務', code: 'welldone-backend', uptime: '32 天 4 小時 12 分', cpu: 65.2, memoryUsed: '248 MB', memoryTotal: '2 GB', memoryPercent: 12 },
  { name: '切圖服務', code: 'welldone-splitter', uptime: '32 天 4 小時 12 分', cpu: 41.8, memoryUsed: '512 MB', memoryTotal: '2 GB', memoryPercent: 25 },
  { name: '拆圖服務', code: 'welldone-titiler', uptime: '32 天 4 小時 12 分', cpu: 23.5, memoryUsed: '396 MB', memoryTotal: '2 GB', memoryPercent: 19 },
  { name: '水井資料庫', code: 'welldone-postgres', uptime: '32 天 4 小時 12 分', cpu: 38.9, memoryUsed: '1.1 GB', memoryTotal: '4 GB', memoryPercent: 28 },
  { name: '模型辨識服務', code: 'welldone-aiservice', uptime: '32 天 4 小時 12 分', cpu: 72.4, memoryUsed: '3.4 GB', memoryTotal: '8 GB', memoryPercent: 43 },
];
