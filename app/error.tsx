'use client';

import StatusPage, { PRIMARY_BUTTON, SecondaryLink } from './components/StatusPage';

// Unexpected errors while rendering a page; the digest matches the server logs
export default function Error({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <>
      <title>系統發生錯誤 — SkyWell</title>
      <StatusPage
        kind="error"
        code="500"
        title="系統發生錯誤"
        description="頁面載入時發生問題，這通常是暫時的。請重試一次，若仍無法使用，請將下方的錯誤代碼提供給系統管理員。"
        actions={
          <>
            <button type="button" onClick={() => unstable_retry()} className={PRIMARY_BUTTON}>
              ↻ 重試
            </button>
            <SecondaryLink href="/">回首頁</SecondaryLink>
          </>
        }
        footnote={error.digest && <>錯誤代碼：{error.digest}</>}
      />
    </>
  );
}
