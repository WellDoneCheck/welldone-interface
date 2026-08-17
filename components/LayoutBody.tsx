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
    <body className="font-noto-serif-tc h-screen w-full flex overflow-hidden bg-[#f8faff] dark:bg-[#0c1117] dark:text-[#e2e8f0]">
      <ThemeToggle />
      {hideSidebar ? (
        <>{children}</>
      ) : (
        <>
          <Siderbar />
          <main className="flex-1 h-screen flex flex-col gap-6 overflow-y-auto px-10 py-7 bg-linear-to-b from-[#f8faff] to-[#eef3ff] dark:from-[#0c1117] dark:to-[#111a24]">
            {children}
          </main>
        </>
      )}
    </body>
  );
}