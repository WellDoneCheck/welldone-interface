// Imported maps: the backend's tasks (Backend-SPEC §4.2), each cut into tiles by the splitter and then recognised by
// the AI, shown on the import page as records with their progress.
import { api } from './api';
import type { Role, Session } from './session';
import { taipeiDateTime } from './taipeiTime';

type Stage = 'waiting' | 'active' | 'completed' | 'failed';
type Cell = { row: number; col: number };

// A task as the backend sends it (GET /tasks); only the fields the site uses
export interface Task {
  id: string;
  // its creation time in Taipei time ('YYYY-MM-DD HH:mm') until someone renames it
  name: string;
  split_status: Stage;
  ai_status: Stage;
  created_by_id: string | null;
  created_at: string;
}

// GET /tasks/:id/progress; only the fields the site uses
export interface TaskProgress {
  splitter: {
    status: Stage | 'queued' | 'processing';
    progress?: number;
    completedCount?: number;
    totalCount?: number;
    queuePosition?: number;
  };
  ai: {
    status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
    completedCount: number;
    failedCount: number;
    // the tiles started on so far, unless the backend knows how many there are: not to rely on (pendingCount)
    totalCount?: number;
    progress?: number;
    failedTiles: Cell[];
    // once finished (or marked failed): the tiles not reached, and whether any tile is left to retry
    pendingCount?: number;
    retryable?: boolean;
    queuePosition?: number;
    // when the AI last sent anything in (epoch ms)
    updatedAtMs: number;
  };
}

export type RecordStatus = 'waiting' | 'cutting' | 'recognizing' | 'done' | 'failed';

export interface TaskRecord {
  id: string;
  name: string;
  // when it came in: 'YYYY-MM-DD HH:mm', Taipei time
  timestamp: string;
  // the same as the backend sends it (UTC ISO)
  createdAt: string;
  createdById: string | null;
  status: RecordStatus;
  statusLabel: string;
  // 0–100 of the current stage (cutting or recognising)
  progress: number;
  // tiles done of the current stage; unknown until its progress has been read
  tiles: { done: number; total: number } | null;
  // its recognition has stopped with tiles failed or not reached, which can be sent to the AI again
  retryable: boolean;
}

// What a page needs to name an imported map, and rename it
export type NamedTask = Pick<Task, 'id' | 'name' | 'created_at'>;

// Waiting, cutting and recognising change on their own: those are polled until they finish
export const isFinished = (record: TaskRecord) => record.status === 'done' || record.status === 'failed';

const DEFAULT_NAME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

// An imported map (or a monitor batch) is named after when it came in until someone renames it: '2023/10/11 16:40 匯入'.
// Not after its well: a well keeps its own code (SW-2023-A001).
export function importName(dateTime: string): string {
  return `${dateTime.slice(0, 16).replaceAll('-', '/')} 匯入`;
}

// The backend names a task after when it came in ('2026-10-20 13:52'), shown as '2026/10/20 13:52 匯入' like the
// site's other default names; a name someone gave is shown as it is
export function displayName(name: string): string {
  return DEFAULT_NAME.test(name) ? importName(name) : name;
}

// The name someone gave the map, or '' while it still has its default one
export const givenName = (name: string) => (DEFAULT_NAME.test(name) ? '' : name);

// A blank name goes back to the default one: when it came in
export function renameTask(task: Pick<Task, 'id' | 'created_at'>, name: string): Promise<Task> {
  return api<Task>(`/tasks/${task.id}/name`, { method: 'PATCH', body: { name: name.trim() || taipeiDateTime(task.created_at) } });
}

// The map the map page shows: the one asked for, or else the newest finished recognising (GET /tasks is newest first)
export function pickMapTask(tasks: Task[], recordId: string | null): Task | undefined {
  return tasks.find((task) => task.id === recordId) ?? tasks.find((task) => task.ai_status === 'completed');
}

// The backend marks the AI failed when it cannot reach the AI service for a while, though the AI may carry on and send
// its tiles in: one that sent a tile in this recently is taken as still recognising (and polled on)
const STILL_SENDING_MS = 3 * 60 * 1000;

const queued = (label: string, position: number | undefined) => (position ? `${label}（第 ${position} 位）` : label);
const tilesOf = (done: number | undefined, total: number | undefined) => (total ? { done: done ?? 0, total } : null);

type Stateful = Pick<TaskRecord, 'status' | 'statusLabel' | 'progress' | 'tiles'>;

function cuttingState(splitter: TaskProgress['splitter']): Stateful {
  const tiles = tilesOf(splitter.completedCount, splitter.totalCount);
  if (splitter.status === 'failed') return { status: 'failed', statusLabel: '切圖失敗', progress: 0, tiles };
  if (splitter.status === 'waiting' || splitter.status === 'queued') {
    return { status: 'waiting', statusLabel: queued('等待切圖', splitter.queuePosition), progress: 0, tiles };
  }
  return { status: 'cutting', statusLabel: '正在切圖中', progress: splitter.progress ?? 0, tiles };
}

// How many tiles there are: those recognised, failed and not reached once the backend tells the last; until then its
// total (or how far it has got, as it gives it)
function tileTotal(ai: TaskProgress['ai']): { total: number | undefined; progress: number } {
  if (ai.pendingCount === undefined) return { total: ai.totalCount, progress: ai.progress ?? 0 };
  const total = ai.completedCount + ai.failedCount + ai.pendingCount;
  return { total, progress: total ? Math.floor(((ai.completedCount + ai.failedCount) / total) * 100) : 0 };
}

function recognisingState(ai: TaskProgress['ai'], now: number): Stateful {
  const { total, progress } = tileTotal(ai);
  const tiles = tilesOf(ai.completedCount, total);
  // the splitter found no data anywhere in the image: no tiles were cut, so there is nothing to recognise or show
  if (ai.status === 'completed' && total === 0) return { status: 'failed', statusLabel: '影像沒有資料', progress: 0, tiles };
  // the backend calls it completed once the tiles it was last sent are done, though others may never have been sent
  if (ai.status === 'completed' && ai.pendingCount) {
    return { status: 'failed', statusLabel: `辨識未完成（${ai.pendingCount} 張未辨識）`, progress, tiles };
  }
  if (ai.status === 'completed') {
    const failed = ai.failedTiles.length;
    return { status: 'done', statusLabel: failed ? `已完成（${failed} 張小圖失敗）` : '已完成', progress: 100, tiles };
  }
  const stillSending = ai.status === 'failed' && ai.pendingCount !== 0 && now - ai.updatedAtMs < STILL_SENDING_MS;
  if (ai.status === 'processing' || stillSending) return { status: 'recognizing', statusLabel: '正在辨識中', progress, tiles };
  if (ai.status === 'failed') return { status: 'failed', statusLabel: '辨識失敗', progress, tiles };
  return { status: 'waiting', statusLabel: queued('等待辨識', ai.queuePosition), progress: 0, tiles };
}

// The task's state from its own fields, before its progress has been read
function stateOfTask(task: Task): Stateful {
  const progress: TaskProgress = {
    splitter: { status: task.split_status },
    ai: {
      status: task.ai_status === 'waiting' ? 'pending' : task.ai_status === 'active' ? 'processing' : task.ai_status,
      completedCount: 0,
      failedCount: 0,
      failedTiles: [],
      updatedAtMs: 0,
    },
  };
  // nothing known to have been sent in lately: a failed task is taken as failed
  return stateOfProgress(progress, Infinity);
}

function stateOfProgress(progress: TaskProgress, now: number): Stateful {
  return progress.splitter.status === 'completed' ? recognisingState(progress.ai, now) : cuttingState(progress.splitter);
}

export function toRecord(task: Task, progress?: TaskProgress, now = Date.now()): TaskRecord {
  const state = progress ? stateOfProgress(progress, now) : stateOfTask(task);
  // not while the AI is still sending tiles in (stillSending): the backend refuses a retry until it has finished
  const retryable = progress?.ai.retryable === true && state.status !== 'recognizing';
  return {
    id: task.id,
    name: task.name,
    timestamp: taipeiDateTime(task.created_at),
    createdAt: task.created_at,
    createdById: task.created_by_id,
    ...state,
    retryable,
  };
}

// Sends every tile failed or not reached to the AI again, or only the tiles given (Backend-SPEC §4.2 AI retry)
export const retryRecognition = (taskId: string, tiles?: { row: number; col: number }[]) =>
  api(`/tasks/${encodeURIComponent(taskId)}/ai/retry`, { method: 'POST', body: tiles && { tiles } });

export interface YearGroup {
  year: string;
  records: TaskRecord[];
}

// Records by the year they came in (Taipei time), in the order given (newest first)
export function groupByYear(records: TaskRecord[]): YearGroup[] {
  const groups: YearGroup[] = [];
  for (const record of records) {
    const year = record.timestamp.slice(0, 4);
    const last = groups.at(-1);
    if (last?.year === year) last.records.push(record);
    else groups.push({ year, records: [record] });
  }
  return groups;
}

export const isTiff = (fileName: string) => /\.tiff?$/i.test(fileName);

// Why a file cannot be uploaded, or null if it can (the backend answers 500 to other formats, §5)
export function uploadError(file: Pick<File, 'name'>): string | null {
  return isTiff(file.name) ? null : '格式錯誤，只接受 .tif／.tiff';
}

// Who may do what to imported maps (§3): viewers only look; operators delete only the ones they uploaded
export const canUpload = (role: Role) => role !== 'viewer';
export const canRename = (role: Role) => role !== 'viewer';
export const canRetry = (role: Role) => role !== 'viewer';
export function canDelete(session: Pick<Session, 'role' | 'userId'>, record: Pick<TaskRecord, 'createdById'>): boolean {
  if (session.role === 'root' || session.role === 'admin') return true;
  return session.role === 'operator' && record.createdById === session.userId;
}
