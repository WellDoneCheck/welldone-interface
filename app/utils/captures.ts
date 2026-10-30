// A well's captures: the same spot in every imported map (Backend-SPEC §4.5, GET /wells/:id/timeline), oldest first
import { taipeiDateTime } from './taipeiTime';
import { wellImageUrl, type Verdict } from './wells';

// One entry of the timeline as the backend sends it; only the fields the site uses
export interface TimelineEntry {
  task_id: string;
  task_created_at: string;
  // the well nearest the spot in that map
  well: { id: number; code: string; verdict: Verdict | null; distance_m: number };
}

export interface Capture {
  // the map it is from
  id: string;
  // when that map came in: 'YYYY-MM-DD HH:mm', Taipei time
  capturedAt: string;
  // the photo around the well in that map (a backend path)
  image: string;
}

// Square photos as large as the check page shows them
export const CAPTURE_IMAGE_SIZE = 702;

export function toCapture(entry: TimelineEntry): Capture {
  return { id: entry.task_id, capturedAt: taipeiDateTime(entry.task_created_at), image: wellImageUrl({ wellId: entry.well.id }, CAPTURE_IMAGE_SIZE) };
}

// '2023-10-11 14:30' -> '2023-10-11'
export function formatDate(capturedAt: string): string {
  return capturedAt.slice(0, 10);
}

// '2023-10-11 14:30' -> '2023'
export function formatYear(capturedAt: string): string {
  return capturedAt.slice(0, 4);
}

// '2023-10-11 14:30' -> '10/11'
export function formatMonthDay(capturedAt: string): string {
  return capturedAt.slice(5, 10).replace('-', '/');
}

// '上午' / '下午' when another capture falls on the same day, so identical dates can be told apart
export function dayPeriodLabel(captures: Capture[], index: number): string | null {
  const date = formatDate(captures[index].capturedAt);
  const sameDay = captures.filter((capture) => formatDate(capture.capturedAt) === date);
  if (sameDay.length < 2) return null;
  return Number(captures[index].capturedAt.slice(11, 13)) < 12 ? '上午' : '下午';
}

// Human readable distance between two captures: '同日', '18 天', '7 個月', '2 年 5 個月'
export function describeGap(earlier: string, later: string): string {
  const from = new Date(formatDate(earlier));
  const to = new Date(formatDate(later));
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  if (days === 0) return '同日';

  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  if (months < 1) return `${days} 天`;

  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} 個月`;
  return rest === 0 ? `${years} 年` : `${years} 年 ${rest} 個月`;
}
