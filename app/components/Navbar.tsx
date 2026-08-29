'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface NavbarProps {
  onLoginOpen: () => void;
  contentFaded: boolean;
  heroAnimating?: boolean;
}

const NAV_ITEMS = ['水井辨識', '地圖檢視', '匯出', '歷史紀錄', '帳號管理'];

export default function Navbar({ onLoginOpen, contentFaded, heroAnimating = false }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [inKove, setInKove] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogoClick = useCallback(() => {
    if (pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      router.push('/');
    }
  }, [pathname, router]);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 50);
      // Detect Kove section: find its top position relative to the document
      const section = document.querySelector('[data-section="kove"]');
      if (section) {
        const rect = section.getBoundingClientRect();
        // Turn black when the Kove section top reaches the middle of the viewport
        setInKove(rect.top < window.innerHeight * 0.5);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on outside click
  useEffect(() => {
    if (!mobileOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [mobileOpen]);

  const style = inKove
    ? {
        navBg: 'bg-white/70 backdrop-blur-md shadow-lg',
        textColor: 'text-black',
        linkColor: 'text-black/80 hover:text-black',
        hamburgerColor: 'bg-black',
        pyClass: 'py-3 md:py-4',
      }
    : {
        // navBg: scrolled ? 'bg-black/60 backdrop-blur-md shadow-lg' : 'bg-transparent',
        navBg: scrolled ? 'bg-black/20 shadow-lg ' : 'bg-transparent',
        textColor: 'text-white',
        linkColor: 'text-white/90 hover:text-white',
        hamburgerColor: 'bg-white',
        pyClass: scrolled ? 'py-3 md:py-4' : 'py-6 md:py-8',
      };

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 px-8 md:px-20 transition-all duration-500 ${style.navBg} ${
        heroAnimating ? 'opacity-0 -translate-y-full pointer-events-none' : 'opacity-100 translate-y-0'
      }`}
    >
      <div className={`flex items-center justify-between px-6 transition-all duration-300 md:px-8 ${style.pyClass}`}>
        {/* Logo */}
        <button type="button" onClick={handleLogoClick} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-0 p-0">
          <div className="h-8 w-8 rounded-md bg-[#68B9A5]" />
          <span
            className={`text-4xl font-bold tracking-wide transition-colors duration-500 ${style.textColor}`}
            style={{ fontFamily: 'var(--font-noto-serif-tc), serif' }}
          >
            <span className="text-[#68B9A5]">Sky</span>
            <span className={inKove ? 'text-gray-900' : 'text-white'}>Well</span>
          </span>
        </button>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-12">
          {NAV_ITEMS.map((item) => (
            <a
              key={item}
              href="#"
              className={`text-2xl font-semibold transition-all duration-500 ${style.linkColor} ${
                contentFaded ? 'opacity-0 translate-y-[-8px]' : 'opacity-100 translate-y-0'
              }`}
            >
              {item}
            </a>
          ))}
        </div>

        {/* Right side: login + hamburger */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={onLoginOpen}
            className={`bg-[#68B9A5] px-12 py-3 text-2xl font-bold text-white shadow-md transition-all duration-500 hover:bg-[#5aa897] hover:shadow-lg ${
              contentFaded ? 'opacity-0 translate-y-[-8px]' : 'opacity-100 translate-y-0'
            }`}
          >
            登入
          </button>

          {/* Hamburger — mobile only */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="flex md:hidden flex-col justify-center items-center w-9 h-9 gap-1.5"
            aria-label="選單"
          >
            <span
              className={`block h-0.5 w-6 transition-all duration-300 ${style.hamburgerColor} ${
                mobileOpen ? 'translate-y-2 rotate-45' : ''
              }`}
            />
            <span
              className={`block h-0.5 w-6 transition-all duration-300 ${style.hamburgerColor} ${
                mobileOpen ? 'opacity-0' : ''
              }`}
            />
            <span
              className={`block h-0.5 w-6 transition-all duration-300 ${style.hamburgerColor} ${
                mobileOpen ? '-translate-y-2 -rotate-45' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu drawer */}
      <div
        ref={menuRef}
        className={`md:hidden overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          mobileOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 pb-6 pt-2 space-y-1 bg-black/70 backdrop-blur-md">
          {NAV_ITEMS.map((item) => (
            <a
              key={item}
              href="#"
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-4 py-3 text-lg font-medium text-white/90 hover:bg-white/10 hover:text-white transition-colors"
            >
              {item}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
