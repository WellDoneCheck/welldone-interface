'use client';

import './globals.css';
import StatusPage, { PRIMARY_BUTTON } from './components/StatusPage';

// Errors in the root layout itself: this replaces the whole layout, so it has its own <html> and <body>
// and no navbar
export default function GlobalError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <html lang="zh-Hant">
      <body>
        <title>系統發生錯誤 — SkyWell</title>
        <StatusPage
          kind="error"
          code="500"
          title="系統發生錯誤"
          description="網站暫時無法正常顯示。請重試一次，若仍無法使用，請將下方的錯誤代碼提供給系統管理員。"
          actions={
            <button type="button" onClick={() => unstable_retry()} className={PRIMARY_BUTTON}>
              ↻ 重試
            </button>
          }
          footnote={error.digest && <>錯誤代碼：{error.digest}</>}
        />
      </body>
    </html>
  );
}
