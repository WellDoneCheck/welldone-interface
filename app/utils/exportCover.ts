// The export sheet covers the page it was opened from; its address names that page (`over`: its path and search), so
// reloading it shows the sheet over that same page again, not over another

// The pages the sheet can be reloaded over (any other `over` is ignored: it is only ever one of these)
const COVERED_PAGES = ['/map', '/check', '/compare'];

// The export address for a map's export (recordId; the newest finished map if none), opened over the page at `over`
export function exportHref(recordId: string | undefined, over: string): string {
  const params = new URLSearchParams();
  if (recordId) params.set('record', recordId);
  params.set('over', over);
  return `/export?${params}`;
}

// The page under the sheet, from the export address's params: the one it was opened over, else the map page of its map
export function coveredPage(params: URLSearchParams): { path: string; search: string } {
  const [path, search = ''] = (params.get('over') ?? '').split('?');
  if (COVERED_PAGES.includes(path)) return { path, search };
  const record = params.get('record');
  return { path: '/map', search: record ? new URLSearchParams({ record }).toString() : '' };
}
