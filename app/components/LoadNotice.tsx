'use client';

import Link from 'next/link';
import PageLoading from './PageLoading';
import { useSiteChrome } from './SiteChrome';
import type { Loaded } from './useBackend';

// What a page shows while what it shows is not ready: the loading screen, or why it cannot be shown (nobody is logged
// in, or the backend failed) with the way on
export default function LoadNotice({ loaded }: { loaded: Loaded<unknown> | null }) {
  const { openLogin } = useSiteChrome();
  if (loaded?.status === 'loading') return <PageLoading />;
  const loggedOut = loaded === null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_center,#34403B_0%,#2C322F_45%,#1F2422_100%)] px-4">
      <div role="alert" className="flex max-w-[520px] flex-col items-center gap-6 text-center text-white">
        <p className="text-[22px] font-bold leading-relaxed">{loggedOut ? '請先登入' : loaded?.status === 'failed' && loaded.message}</p>
        {loggedOut ? (
          <button type="button" onClick={openLogin} className="bg-[#62A4A7] px-8 py-3 text-[18px] font-bold hover:bg-[#54999D]">
            登入
          </button>
        ) : (
          <Link href="/upload" className="bg-[#62A4A7] px-8 py-3 text-[18px] font-bold hover:bg-[#54999D]">
            前往上傳頁面
          </Link>
        )}
      </div>
    </div>
  );
}
