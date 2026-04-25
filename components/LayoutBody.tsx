'use client';

import { usePathname } from 'next/navigation';
import Siderbar from '@/app/sidebar/page';
import ThemeToggle from './ThemeToggle';

const noSidebarPages = ['/', '/login'];

const login_state = true;

export default function LayoutBody({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideSidebar = noSidebarPages.includes(pathname);

  return (
    <body>
      <ThemeToggle />
      {hideSidebar ? (
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