// The monitor page's live state and how it changes from one update to the next. Simulated until the backend sends
// real figures: each update nudges the services' load, moves the running batch on, and logs what happened as events.
import { EVENTS, SERVICES, TASKS, WELL_TOTALS, type Level, type MonitorTask, type WellStatus } from '../data/monitor';
import { givenName, importName, type RecordStatus, type TaskRecord } from './tasks';

export const REFRESH_MS = 5000;
// CPU readings kept per service for its trend line
export const CPU_HISTORY_LENGTH = 24;
// Service load at or above these (%) needs a look / is overloaded
export const LOAD_WARNING = 80;
export const LOAD_CRITICAL = 90;
const MAX_EVENTS = 20;
const MAX_TASKS = 6;
const MINUTE = 60 * 1000;

export interface LiveService {
  name: string;
  code: string;
  cpuBase: number;
  // oldest first; the last one is the current reading
  cpu: number[];
  memoryUsedGb: number;
  memoryTotalGb: number;
}

export interface LiveTask extends Omit<MonitorTask, 'createdMinutesAgo'> {
  createdAt: number;
}

export interface LiveEvent {
  id: string;
  level: Level;
  // for an event about a batch, what happened to it (eventTitle adds the batch's name)
  title: string;
  // the batch it is about, with its name at the time (kept for batches no longer listed)
  task?: { id: string; name: string };
  detail?: string;
  href?: string;
  at: number;
}

export interface MonitorSnapshot {
  now: number;
  totals: Record<WellStatus, number>;
  services: LiveService[];
  // newest first
  tasks: LiveTask[];
  // newest first
  events: LiveEvent[];
  // numbers the next new event and batch
  nextEventNumber: number;
  nextTaskNumber: number;
}

type Random = () => number;

const round1 = (value: number) => Math.round(value * 10) / 10;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// A made-up but steady history, so the page renders the same on the server and in the browser
function initialCpu(base: number): number[] {
  return Array.from({ length: CPU_HISTORY_LENGTH }, (_, index) => round1(base + 5 * Math.sin(index * 0.8 + base)));
}

export function createSnapshot(now: number): MonitorSnapshot {
  const tasks: LiveTask[] = TASKS.map(({ createdMinutesAgo, ...task }) => ({ ...task, createdAt: now - createdMinutesAgo * MINUTE }));
  const aboutTask = (id: string | undefined) => {
    const task = tasks.find((candidate) => candidate.id === id);
    return task && { id: task.id, name: taskName(task) };
  };
  return {
    now,
    totals: { ...WELL_TOTALS },
    services: SERVICES.map((service) => ({ ...service, cpu: initialCpu(service.cpuBase) })),
    tasks,
    events: EVENTS.map(({ minutesAgo, taskId, ...event }) => ({ ...event, task: aboutTask(taskId), at: now - minutesAgo * MINUTE })),
    nextEventNumber: EVENTS.length + 1,
    nextTaskNumber: 220,
  };
}

/* ─── Real batches ────────────────────────────────────────────── */

const STATE_OF: Record<RecordStatus, LiveTask['state']> = { waiting: 'queued', cutting: 'running', recognizing: 'running', done: 'done', failed: 'failed' };

// An imported map from the backend as a batch: its tiles as the images, its stage's label as why it failed; no pace
// (rate 0) nor wells found, which the backend does not tell
export function liveTask(record: TaskRecord): LiveTask {
  return {
    id: record.id,
    name: givenName(record.name) || undefined,
    state: STATE_OF[record.status],
    createdAt: Date.parse(record.createdAt),
    images: record.tiles?.total ?? 0,
    processed: record.tiles?.done ?? 0,
    rate: 0,
    error: record.status === 'failed' ? record.statusLabel : undefined,
  };
}

// What the page shows once logged in: the real batches, and only the simulated events not about a simulated batch
export function withRealTasks(snapshot: MonitorSnapshot, tasks: LiveTask[]): MonitorSnapshot {
  return { ...snapshot, tasks, events: snapshot.events.filter((event) => !event.task) };
}

/* ─── Names ─────────────────────────────────────────────────────── */

const pad = (value: number) => String(value).padStart(2, '0');

// A batch is named after when it was created until someone renames it, like an imported map: '2026/09/30 14:32 匯入'
export function defaultTaskName(createdAt: number): string {
  const date = new Date(createdAt);
  return importName(`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`);
}

export const taskName = (task: LiveTask) => task.name ?? defaultTaskName(task.createdAt);

// '批次完成：嘉義沿海測繪', with the batch's current name when it is still listed
export function eventTitle(event: LiveEvent, tasks: LiveTask[]): string {
  if (!event.task) return event.title;
  const task = tasks.find((candidate) => candidate.id === event.task?.id);
  return `${event.title}：${task ? taskName(task) : event.task.name}`;
}

/* ─── Levels ────────────────────────────────────────────────────── */

export function loadLevel(percent: number): Level {
  if (percent >= LOAD_CRITICAL) return 'critical';
  if (percent >= LOAD_WARNING) return 'warning';
  return 'good';
}

export const currentCpu = (service: LiveService) => service.cpu[service.cpu.length - 1];
export const memoryPercent = (service: LiveService) => (service.memoryUsedGb / service.memoryTotalGb) * 100;

// The worse of the service's CPU and memory load
export function serviceLevel(service: LiveService): Level {
  const levels = [loadLevel(currentCpu(service)), loadLevel(memoryPercent(service))];
  return levels.includes('critical') ? 'critical' : levels.includes('warning') ? 'warning' : 'good';
}

// The whole system: overloaded services are critical; busy services and failed batches need a look
export function systemHealth(snapshot: MonitorSnapshot): { level: Level; issues: number } {
  const serviceLevels = snapshot.services.map(serviceLevel);
  const critical = serviceLevels.filter((level) => level === 'critical').length;
  const warnings = serviceLevels.filter((level) => level === 'warning').length + snapshot.tasks.filter((task) => task.state === 'failed').length;
  const level = critical > 0 ? 'critical' : warnings > 0 ? 'warning' : 'good';
  return { level, issues: critical + warnings };
}

// Minutes left for a running batch at its current pace
export function minutesLeft(task: LiveTask): number {
  if (task.rate <= 0) return 0;
  return Math.ceil((((task.images - task.processed) / task.rate) * REFRESH_MS) / MINUTE);
}

// '剛剛', '8 分鐘前', '3 小時前', '2 天前'
export function formatAgo(ms: number): string {
  const minutes = Math.floor(ms / MINUTE);
  if (minutes < 1) return '剛剛';
  if (minutes < 60) return `${minutes} 分鐘前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小時前`;
  return `${Math.floor(hours / 24)} 天前`;
}

/* ─── One update ────────────────────────────────────────────────── */

type NewEvent = Omit<LiveEvent, 'id' | 'at'>;

// Drifts around the service's usual load, a little each update
function nextService(service: LiveService, random: Random): LiveService {
  const last = currentCpu(service);
  const cpu = round1(clamp(last + (random() - 0.5) * 10 + (service.cpuBase - last) * 0.2, 3, 99));
  const memoryUsedGb = Math.round(clamp(service.memoryUsedGb * (0.98 + random() * 0.04), 0.05, service.memoryTotalGb) * 100) / 100;
  return { ...service, cpu: [...service.cpu.slice(1), cpu], memoryUsedGb };
}

// Logs a service getting busier or calming down
function loadEvent(before: LiveService, after: LiveService): NewEvent | null {
  const from = serviceLevel(before);
  const to = serviceLevel(after);
  if (from === to) return null;
  const detail = `CPU ${currentCpu(after)}%・記憶體 ${Math.round(memoryPercent(after))}%`;
  if (to === 'critical') return { level: 'critical', title: `服務過載：${after.name}`, detail };
  if (to === 'warning' && from === 'good') return { level: 'warning', title: `負載偏高：${after.name}`, detail };
  if (to === 'good') return { level: 'good', title: `負載恢復正常：${after.name}`, detail };
  return null;
}

interface TaskStep {
  tasks: LiveTask[];
  events: NewEvent[];
  foundWells: number;
  nextTaskNumber: number;
}

// Moves the running batch on; once it finishes, the oldest queued batch starts, and a new batch is queued when none waits
function nextTasks(tasks: LiveTask[], now: number, nextTaskNumber: number, random: Random): TaskStep {
  const events: NewEvent[] = [];
  let foundWells = 0;

  let updated = tasks.map((task) => {
    if (task.state !== 'running') return task;
    const processed = Math.min(task.images, task.processed + Math.round(task.rate * (0.7 + random() * 0.6)));
    if (processed < task.images) return { ...task, processed };
    const found = 1 + Math.floor(random() * 4);
    foundWells += found;
    events.push({ level: 'good', title: '批次完成', task: { id: task.id, name: taskName(task) }, detail: `新增 ${found} 口待確認水井`, href: '/upload' });
    return { ...task, processed, state: 'done' as const, rate: 0, found };
  });

  if (!updated.some((task) => task.state === 'running')) {
    const oldestQueued = updated.findLastIndex((task) => task.state === 'queued');
    if (oldestQueued >= 0) {
      const task = { ...updated[oldestQueued], state: 'running' as const };
      updated = updated.with(oldestQueued, task);
      events.push({
        level: 'info',
        title: '開始辨識',
        task: { id: task.id, name: taskName(task) },
        detail: `${task.images.toLocaleString()} 張空拍影像`,
        href: '/upload',
      });
    }
  }

  if (!updated.some((task) => task.state === 'queued')) {
    const images = 600 + Math.round(random() * 10) * 80;
    const task: LiveTask = {
      id: `task-${nextTaskNumber}`,
      state: 'queued',
      createdAt: now,
      images,
      processed: 0,
      rate: 30 + Math.round(random() * 12),
    };
    updated = [task, ...updated];
    events.push({
      level: 'info',
      title: '新批次排入',
      task: { id: task.id, name: taskName(task) },
      detail: `${images.toLocaleString()} 張空拍影像`,
      href: '/upload',
    });
    nextTaskNumber += 1;
  }

  return { tasks: updated.slice(0, MAX_TASKS), events, foundWells, nextTaskNumber };
}

export function nextSnapshot(snapshot: MonitorSnapshot, now: number, random: Random): MonitorSnapshot {
  const services = snapshot.services.map((service) => nextService(service, random));
  const loadEvents = snapshot.services.map((before, index) => loadEvent(before, services[index])).filter((event) => event !== null);
  const taskStep = nextTasks(snapshot.tasks, now, snapshot.nextTaskNumber, random);

  const newEvents = [...loadEvents, ...taskStep.events].map((event, index) => ({
    ...event,
    id: `event-${snapshot.nextEventNumber + index}`,
    at: now,
  }));

  return {
    now,
    totals: { ...snapshot.totals, pending: snapshot.totals.pending + taskStep.foundWells },
    services,
    tasks: taskStep.tasks,
    // newest first: the last one logged in this update goes on top
    events: [...newEvents.reverse(), ...snapshot.events].slice(0, MAX_EVENTS),
    nextEventNumber: snapshot.nextEventNumber + newEvents.length,
    nextTaskNumber: taskStep.nextTaskNumber,
  };
}
