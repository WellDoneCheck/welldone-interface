// The servers' logs for root (GET /server-logs/:source, Backend-SPEC): the backend's own and the splitter's, each its
// newest month file, followed as they grow
import { api, fetchFile } from './api';
import { saveFile } from './csv';
import type { Role } from './session';

export type LogSource = 'backend' | 'splitter';
// errors only, or warnings and errors
export type LogLevel = 'error' | 'warn';

export const LOG_SOURCES: { source: LogSource; label: string }[] = [
  { source: 'backend', label: '後端' },
  { source: 'splitter', label: '切圖' },
];

export const LOG_LEVELS: { level: LogLevel | null; label: string }[] = [
  { level: null, label: '全部' },
  { level: 'warn', label: '警告以上' },
  { level: 'error', label: '錯誤' },
];

// What the backend sends: the lines read, and where to go on from (next, in file)
export interface LogPage {
  file: string;
  size: number;
  next: number;
  lines: string[];
}

export interface LogFilter {
  // '' for every line
  text: string;
  level: LogLevel | null;
}

// Only root reads the servers' logs (§3)
export const canReadServerLogs = (role: Role) => role === 'root';

// How many lines the page keeps while following (the oldest go)
export const MAX_SHOWN_LINES = 5000;

// The address of a page of a log: its end (after null), or the lines written since the last page
export function logPagePath(source: LogSource, filter: LogFilter, after: Pick<LogPage, 'file' | 'next'> | null): string {
  const params = new URLSearchParams();
  if (after) {
    params.set('file', after.file);
    params.set('after', String(after.next));
  }
  if (filter.text) params.set('q', filter.text);
  if (filter.level) params.set('level', filter.level);
  const query = params.toString();
  return `/server-logs/${source}${query ? `?${query}` : ''}`;
}

export const fetchLogPage = (source: LogSource, filter: LogFilter, after: Pick<LogPage, 'file' | 'next'> | null) =>
  api<LogPage>(logPagePath(source, filter, after), { cache: 'no-store' });

// The lines shown with a page's added, the newest MAX_SHOWN_LINES
export const withNewLines = (shown: string[], page: Pick<LogPage, 'lines'>) => [...shown, ...page.lines].slice(-MAX_SHOWN_LINES);

// How a line reads, as the backend filters them: Nest's ERROR / WARN, or the splitter's words for a failure
export function lineLevel(line: string): LogLevel | null {
  if (/\b(error|fatal|panic|fail(ed|ure)?)\b/i.test(line)) return 'error';
  if (/\bwarn(ing)?\b/i.test(line)) return 'warn';
  return null;
}

// Saves the log's whole month file (file: its name, as a page gives it: '2026/10.log')
export async function downloadLog(source: LogSource, file: string): Promise<void> {
  saveFile(`${source}-${file.replace('/', '-')}`, await fetchFile(`/server-logs/${source}/file`));
}
