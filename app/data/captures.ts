// Capture dates of a well, oldest first. Placeholder data until they come from the backend.

export interface Capture {
  id: string;
  // 'YYYY-MM-DD HH:mm'
  capturedAt: string;
}

export const CAPTURES: Capture[] = [
  { id: 'c-2015-06-02', capturedAt: '2015-06-02 10:20' },
  { id: 'c-2017-11-20', capturedAt: '2017-11-20 09:45' },
  { id: 'c-2019-03-14', capturedAt: '2019-03-14 13:10' },
  { id: 'c-2021-08-09', capturedAt: '2021-08-09 11:05' },
  { id: 'c-2023-10-11-am', capturedAt: '2023-10-11 09:05' },
  { id: 'c-2023-10-11-pm', capturedAt: '2023-10-11 14:30' },
  { id: 'c-2024-05-30', capturedAt: '2024-05-30 10:40' },
];

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
