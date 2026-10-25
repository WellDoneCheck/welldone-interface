// Skyhi (AI copilot): its name, the quick questions and the greeting. The answers come from the backend
// (utils/copilot.ts).

// A button under an answer, to a page of the site (e.g. the map with a well selected)
export interface CopilotAction {
  label: string;
  to: string;
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  // Bullet points shown under an assistant answer
  details?: string[];
  actions?: CopilotAction[];
  // Questions offered when the assistant is not sure what was asked; picking one asks it
  suggestions?: string[];
  // 'HH:mm'
  time: string;
}

export type CopilotReply = Pick<CopilotMessage, 'text' | 'details' | 'actions' | 'suggestions'>;

export const COPILOT_NAME = 'Skyhi';
export const COPILOT_STATUS = 'AI 智能助理已上線';

// Quick questions offered above the input until the backend's picks for the page arrive (utils/copilot.ts
// fetchSuggestions), and when it cannot be reached; the backend's fixed ones are the same three
export const COPILOT_SUGGESTIONS = ['水井辨識進度如何？', '如何匯出辨識結果？', '如何在地圖上查看水井位置？'];

// The greeting: what can be asked, as the backend's "你可以幫我做什麼？" answers it
export const SEED_MESSAGES: CopilotMessage[] = [
  {
    id: 'seed-1',
    role: 'assistant',
    text: `您好，我是 ${COPILOT_NAME}，可以幫您查詢系統資料，例如：`,
    details: [
      '找地圖：2026的雲林',
      '地區統計：雲林有多少疑似未登記的井？',
      '附近水井：23.8421, 120.5134 附近有沒有水井？',
      '單口井：查詢 SW-2026-A001',
      '操作說明：如何匯出辨識結果？',
    ],
    time: '',
  },
];
