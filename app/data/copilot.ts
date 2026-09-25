// Skyhi (AI copilot) conversation data. Fake until the assistant is connected.

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  // Bullet points shown under an assistant answer
  details?: string[];
  // 'HH:mm'
  time: string;
}

export const COPILOT_NAME = 'Skyhi';
export const COPILOT_STATUS = 'AI 智能助理已上線';

// The example conversation from the design
export const SEED_MESSAGES: CopilotMessage[] = [
  {
    id: 'seed-1',
    role: 'user',
    text: '請幫我查詢溪州段 412 地號的探測結果，是否有異常水井？',
    time: '14:32',
  },
  {
    id: 'seed-2',
    role: 'assistant',
    text: '已為您檢索「溪州段 412 地號」探測結果。系統在該區域偵測到 1 處潛在未登記水井：',
    details: ['座標: 23.8421, 120.5134', '信賴度: 94.2%', '影像辨識狀態: 待確認（琥珀標記）', '建議派遣巡查員前往現場核實。'],
    time: '14:33',
  },
];

const REPLIES: { keywords: string[]; text: string; details?: string[] }[] = [
  {
    keywords: ['水井', '井'],
    text: '目前資料庫中共有 12 筆匯入的空拍影像紀錄，其中：',
    details: ['已完成辨識: 4 筆', '正在辨識中: 4 筆', '正在切圖中: 4 筆'],
  },
  {
    keywords: ['匯出', '下載'],
    text: '匯出功能可以將辨識結果輸出成常見的地理資訊格式，需要我帶您前往匯出頁面嗎？',
  },
  {
    keywords: ['地圖', '位置', '座標'],
    text: '您可以在「地圖檢視」頁面查看水井位置，點選地圖上的圖釘就能看到該口井的影像與座標。',
  },
];

const FALLBACK_REPLY = { text: '已收到您的訊息。這是示範回覆，正式版將由 AI 助理根據系統資料回答。' };

// Fake answer picked by keyword
export function replyTo(question: string): Pick<CopilotMessage, 'text' | 'details'> {
  return REPLIES.find((reply) => reply.keywords.some((keyword) => question.includes(keyword))) ?? FALLBACK_REPLY;
}
