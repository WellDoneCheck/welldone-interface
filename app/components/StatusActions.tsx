'use client';

import { useRouter } from 'next/navigation';
import { useSiteChrome } from './SiteChrome';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from './StatusPage';

export function BackButton() {
  const router = useRouter();
  return (
    <button type="button" onClick={() => router.back()} className={SECONDARY_BUTTON}>
      ← 返回上一頁
    </button>
  );
}

// Opens the site's login panel on the page that asked for a sign-in
export function LoginButton() {
  const { openLogin } = useSiteChrome();
  return (
    <button type="button" onClick={openLogin} className={PRIMARY_BUTTON}>
      登入
    </button>
  );
}
