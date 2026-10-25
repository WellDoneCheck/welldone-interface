// Skyhi, the AI copilot: the backend answers (POST /copilot/ask, well-back docs/COPILOT.md) from its question bank,
// filled with live data, or by looking up a well code, a coordinate, a year or a place; no LLM.
import { ApiError, api } from './api';
import { COPILOT_SUGGESTIONS, type CopilotAction, type CopilotReply } from '../data/copilot';

// POST /copilot/ask; only the fields the site uses
interface CopilotAnswer {
  text: string;
  details?: string[];
  actions?: CopilotAction[];
  suggestions: string[];
}

const UNAVAILABLE = '抱歉，目前無法回答，請稍後再試。';

// The assistant's reply to a question; a failed call is told in the reply rather than thrown
export async function askCopilot(question: string): Promise<CopilotReply> {
  try {
    const { text, details, actions, suggestions } = await api<CopilotAnswer>('/copilot/ask', { method: 'POST', body: { question } });
    return { text, details, actions, suggestions };
  } catch (error) {
    return { text: error instanceof ApiError ? `抱歉，${error.message}` : UNAVAILABLE };
  }
}

// Pages that show one imported map, given by ?record= (without it, the newest finished one)
const MAP_PAGES = ['/map', '/export', '/compare'];
// of those, the ones that only make sense about a map the user is looking at
const ABOUT_CURRENT_MAP = ['/export', '/compare'];

// An answer's buttons as they fit the page the user is on. A button to the page already open is left out. A button to
// one of the map pages without saying which map ("前往匯出頁") goes to the map on screen: shown only on a map page,
// carrying its ?record=; to the map page itself it is also offered elsewhere. Buttons to a given map or well, or to
// other pages, stay as they are.
export function actionsForPage(actions: CopilotAction[], pathname: string, record: string | null): CopilotAction[] {
  const onMapPage = MAP_PAGES.includes(pathname);
  return actions.flatMap((action) => {
    if (action.to === pathname) return [];
    if (!MAP_PAGES.includes(action.to)) return [action];
    if (!onMapPage) return ABOUT_CURRENT_MAP.includes(action.to) ? [] : [action];
    return [{ ...action, to: record ? `${action.to}?record=${encodeURIComponent(record)}` : action.to }];
  });
}

// The quick questions above the input, picked by the backend for the page and filled with where the map is (on a map
// page the map on screen, elsewhere the newest one); the fixed ones when it cannot be asked
export async function fetchSuggestions(pathname: string, record: string | null): Promise<string[]> {
  const query = new URLSearchParams({ page: pathname });
  if (record && MAP_PAGES.includes(pathname)) query.set('record', record);
  try {
    return (await api<{ suggestions: string[] }>(`/copilot/suggestions?${query}`)).suggestions;
  } catch {
    return COPILOT_SUGGESTIONS;
  }
}

// "座標：23.84, 120.51" (or "座標: …") as a label and its value; null when the detail is plain text
export function splitDetail(detail: string): { label: string; value: string } | null {
  const match = /^([^:：]+)(?::\s|：)(.+)$/.exec(detail);
  return match ? { label: match[1], value: match[2] } : null;
}
