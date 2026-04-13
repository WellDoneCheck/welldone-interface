'use client';

import { usePathname } from 'next/navigation';
import Siderbar from '@/app/sidebar/page';

const noSidebarPages = ['/', '/login'];

const login_state = true;

export default function LayoutBody({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideSidebar = noSidebarPages.includes(pathname);

  return (
    <body>
      {!login_state ? (
        <>{children}</>
      ) : (
        <>
          <Siderbar />
          <main className="main-content">{children}</main>
        </>
      )}
    </body>
  );
}