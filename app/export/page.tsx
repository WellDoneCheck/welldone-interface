import { ExportOverPage } from '../components/ExportSheet';

export const metadata = {
  title: '資料匯出 — SkyWell',
  description: '管理並匯出 AI 水井辨識結果',
};

// Loading /export directly (or reloading it) shows the sheet over the page it was opened from, as opening it from that
// page does (app/@modal intercepts that); closing the sheet then goes on to that page
export default function ExportRoute() {
  return <ExportOverPage />;
}
