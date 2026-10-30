// The monitor page's services once logged in: the backend's checks (GET /monitor/services, well-back docs/API.md), each
// one actually reaching the service and reading its container's load from Docker; and the events they log
import { api } from './api';
import { CPU_HISTORY_LENGTH, MAX_EVENTS, serviceEvent, type LiveEvent, type LiveService } from './monitorLive';

export type ServiceCode = 'backend' | 'postgres' | 'redis' | 'splitter' | 'titiler' | 'ai';

export interface ServiceHealth {
  code: ServiceCode;
  // answered within 5 s
  up: boolean;
  latencyMs: number | null;
  // its container's load; null when Docker cannot tell (not running, or not in Docker like the AI service)
  usage: { cpuPercent: number; memoryUsedBytes: number; memoryLimitBytes: number } | null;
}

export const fetchServiceHealth = () => api<ServiceHealth[]>('/monitor/services', { cache: 'no-store' });

// The services the panel has room for (five rows): the queue's Redis is left out
const SERVICE_NAMES: Partial<Record<ServiceCode, string>> = {
  backend: '水井後端服務',
  postgres: '水井資料庫',
  splitter: '切圖服務',
  titiler: '拆圖服務',
  ai: '模型辨識服務',
};

const GB = 1024 ** 3;

// A check as a service row, its CPU reading added after the ones read before (previous); a check without a load
// starts the readings over
export function liveService(health: ServiceHealth, previous?: LiveService): LiveService {
  const usage = health.usage;
  return {
    name: SERVICE_NAMES[health.code] ?? health.code,
    code: `welldone-${health.code}`,
    up: health.up,
    cpuBase: 0,
    cpu: usage ? [...(previous?.cpu ?? []), usage.cpuPercent].slice(-CPU_HISTORY_LENGTH) : [],
    memory: usage && {
      usedGb: Math.round((usage.memoryUsedBytes / GB) * 100) / 100,
      totalGb: Math.round((usage.memoryLimitBytes / GB) * 10) / 10,
    },
  };
}

// The new checks of the services shown as rows, each continuing the CPU readings of its row before
export function liveServices(checks: ServiceHealth[], before: LiveService[]): LiveService[] {
  return checks
    .filter((health) => SERVICE_NAMES[health.code])
    .map((health) => liveService(health, before.find((service) => service.code === `welldone-${health.code}`)));
}

// The services as last read, and what changed in them so far (newest first)
export interface ServiceReading {
  services: LiveService[];
  events: LiveEvent[];
  // numbers the next event
  nextEventNumber: number;
}

// A new read of the checks after the last (null: the first): a service going down or coming back, or its load going
// up or down, is logged as an event; at the first read only the services down are
export function nextReading(last: ServiceReading | null, checks: ServiceHealth[], now: number): ServiceReading {
  const before = last?.services ?? [];
  const services = liveServices(checks, before);
  const found = services
    .map((service) => serviceEvent(before.find((candidate) => candidate.code === service.code), service))
    .filter((event) => event !== null);
  const nextEventNumber = last?.nextEventNumber ?? 1;
  const events = found.map((event, index) => ({ ...event, id: `service-event-${nextEventNumber + index}`, at: now }));
  return {
    services,
    // newest first: the last one logged in this read goes on top
    events: [...events.reverse(), ...(last?.events ?? [])].slice(0, MAX_EVENTS),
    nextEventNumber: nextEventNumber + events.length,
  };
}
