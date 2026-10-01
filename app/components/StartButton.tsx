'use client';

import type { MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SharedTransition, { ONLY_TO_UPLOAD, SHARED, TO_UPLOAD } from './SharedTransition';
import { useSiteChrome } from './SiteChrome';

const UPLOAD_HREF = '/upload';

// White map pin with a chevron: the button's "go" mark
function PinArrow() {
  return (
    <svg aria-hidden width="50" height="62" viewBox="0 0 50 62" className="shrink-0">
      <path d="M25 0a25 25 0 0 1 8.2 48.6L25 62l-8.2-13.4A25 25 0 0 1 25 0Z" fill="#fff" />
      <path d="M21 16l9 9-9 9" fill="none" stroke="#62A4A7" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Home-page call to action into image upload; it grows into the upload page's upload panel (animation in globals.css).
// Upload needs an account: logged out, it opens the login panel first and goes on once logged in.
export default function StartButton() {
  const router = useRouter();
  const { isLoggedIn, requireLogin } = useSiteChrome();

  const onClick = (event: MouseEvent) => {
    if (isLoggedIn) return;
    event.preventDefault();
    requireLogin(() => router.push(UPLOAD_HREF, { transitionTypes: TO_UPLOAD }));
  };

  return (
    <SharedTransition name={SHARED.startUpload} share={ONLY_TO_UPLOAD}>
      <Link
        href={UPLOAD_HREF}
        transitionTypes={TO_UPLOAD}
        onClick={onClick}
        className="flex h-[108px] w-[371px] items-center justify-between bg-[#62A4A7] pl-[60px] pr-[45px] shadow-[8px_8px_50px_0_rgba(0,0,0,0.3)] outline-none transition-[translate,filter] duration-500 ease-[var(--ease-expo)] hover:-translate-y-1.5 hover:brightness-110 motion-reduce:transition-none focus-visible:shadow-[0_0_0_4px_#D1E6E7]"
      >
        <span className="text-[48px] font-black leading-none tracking-[0.04em] text-white" style={{ fontFamily: 'var(--font-noto-serif-tc), serif' }}>
          開始使用
        </span>
        <PinArrow />
      </Link>
    </SharedTransition>
  );
}
