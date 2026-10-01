'use client';

import { useEffect, useState, useRef, useCallback, useSyncExternalStore } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { UserInfo } from './LoginPanel';
import { lastVisitHref, subscribeToVisits, type VisitedPage } from '../utils/lastVisit';
import { logoBackdropIsLight, subscribeToLogoBackdrop } from '../utils/logoBackdrop';

interface NavbarProps {
  onLoginOpen: () => void;
  contentFaded: boolean;
  heroAnimating?: boolean;
  isLoggedIn?: boolean;
  userInfo?: UserInfo | null;
}

interface NavLink {
  label: string;
  href: string;
  // shown only once the page has been visited, so it animates in when it turns up (see nav-item-in in globals.css)
  remembered: boolean;
}

const REMEMBERED_ITEM_ENTER = 'overflow-hidden animate-[nav-item-in_700ms_var(--ease-expo)_backwards] motion-reduce:animate-none';

// Each item is named after the page it opens (the account lives in the login panel, the upload records on 影像匯入與紀錄).
// 地圖檢視 and 水井檢查 go back to the map record / the well opened last, and are left out until there is one.
const NAV_ITEMS: { label: string; href?: string; lastVisit?: VisitedPage }[] = [
  { label: '首頁', href: '/' },
  { label: '地圖檢視', lastVisit: 'map' },
  { label: '水井檢查', lastVisit: 'check' },
  { label: '影像匯入與紀錄', href: '/upload' },
  { label: '監控總覽', href: '/monitor' },
];

// Where the user last was on that page, or null (also on the server and during hydration)
function useLastVisitHref(page: VisitedPage): string | null {
  return useSyncExternalStore(subscribeToVisits, () => lastVisitHref(page), () => null);
}

export default function Navbar({
  onLoginOpen,
  contentFaded,
  heroAnimating = false,
  isLoggedIn = false,
  userInfo = null,
}: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [inKove, setInKove] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const lastVisits: Record<VisitedPage, string | null> = { map: useLastVisitHref('map'), check: useLastVisitHref('check') };
  // a map behind the logo says whether it is light there (TileMap); otherwise the word follows the rest of the navbar
  const logoOnLight = useSyncExternalStore(subscribeToLogoBackdrop, logoBackdropIsLight, () => null) ?? inKove;
  const navLinks: NavLink[] = NAV_ITEMS.flatMap(({ label, href, lastVisit }) => {
    const target = lastVisit ? lastVisits[lastVisit] : href;
    return target ? [{ label, href: target, remembered: lastVisit !== undefined }] : [];
  });

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
      // The hero stage turns white once the map has shrunk
      const heroIsLight = document.querySelector('[data-nav-light="true"]') !== null;
      if (section) {
        const rect = section.getBoundingClientRect();
        // Turn black when the Kove section top reaches the middle of the viewport
        setInKove(heroIsLight || rect.top < window.innerHeight * 0.5);
      } else {
        setInKove(heroIsLight);
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
        navBg: '',
        textColor: 'text-black',
        linkColor: 'text-black/80 hover:text-black',
        hamburgerColor: 'bg-black',
        pyClass: 'py-3 md:py-4',
      }
    : {
        // navBg: scrolled ? 'bg-black/60 backdrop-blur-md shadow-lg' : 'bg-transparent',
        navBg: scrolled ? '' : 'bg-transparent',
        textColor: 'text-white',
        linkColor: 'text-white/90 hover:text-white',
        hamburgerColor: 'bg-white',
        pyClass: scrolled ? 'py-3 md:py-4' : 'py-6 md:py-8',
      };

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 [view-transition-name:site-navbar] px-8 md:px-20 transition-all duration-500 ${style.navBg} ${
        heroAnimating ? 'opacity-0 -translate-y-full pointer-events-none' : 'opacity-100 translate-y-0'
      }`}
    >
      <div className={`flex items-center justify-between px-6 transition-all duration-300 md:px-8 ${style.pyClass}`}>
        {/* Logo */}
        <button type="button" onClick={handleLogoClick} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-0 p-0">
          <div className="h-8 w-8 rounded-md bg-[#62A4A7]" />
          <span
            className={`text-4xl font-bold tracking-wide transition-colors duration-500 ${style.textColor}`}
            style={{ fontFamily: 'var(--font-noto-serif-tc), serif' }}
          >
            <span className="text-[#62A4A7]">Sky</span>
            <span data-nav-logo-word className={`transition-colors duration-500 ${logoOnLight ? 'text-gray-900' : 'text-white'}`}>
              Well
            </span>
          </span>
        </button>

        {/* Desktop nav links — only when logged in; the gap is a variable so an item turning up can grow its gap in with it */}
        {isLoggedIn && (
          <div className="hidden lg:flex items-center gap-[var(--nav-gap)] [--nav-gap:1rem] xl:[--nav-gap:3rem]">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  router.push(link.href);
                }}
                className={`whitespace-nowrap text-base font-semibold transition-all duration-500 xl:text-2xl ${style.linkColor} ${
                  contentFaded ? 'opacity-0 translate-y-[-8px]' : 'opacity-100 translate-y-0'
                } ${link.remembered ? REMEMBERED_ITEM_ENTER : ''}`}
              >
                {link.label}
              </a>
            ))}
          </div>
        )}

        {/* Right side: login/user + hamburger */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={onLoginOpen}
            className={`bg-[#68B9A5] px-12 py-3 text-2xl font-bold text-white shadow-md transition-all duration-500 hover:bg-[#5aa897] hover:shadow-lg ${
              contentFaded ? 'opacity-0 translate-y-[-8px]' : 'opacity-100 translate-y-0'
            }`}
          >
            {isLoggedIn ? (
              <span className="text-xl font-bold text-white">
                {userInfo?.name ?? 'User'}
              </span>
            ) : (
              <span className="text-2xl font-bold text-white">
                登入
              </span>
            )}
          </button>

              {/* 
              <span className="flex h-8 w-8 items-center justify-center bg-white/20">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span> */}

          {/* Hamburger — mobile only */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="flex lg:hidden flex-col justify-center items-center w-9 h-9 gap-1.5"
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
        className={`lg:hidden overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          mobileOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 pb-6 pt-2 space-y-1 bg-black/70 backdrop-blur-md">
          {isLoggedIn && navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => {
                e.preventDefault();
                setMobileOpen(false);
                router.push(link.href);
              }}
              className="block rounded-lg px-4 py-3 text-lg font-medium text-white/90 hover:bg-white/10 hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
