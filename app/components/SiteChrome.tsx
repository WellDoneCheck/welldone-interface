'use client';

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from './Navbar';
import LoginPanel from './LoginPanel';
import CopilotWidget from './CopilotWidget';
import { setVisitAccount } from '../utils/lastVisit';
import { clearSession, getServerSession, getSession, subscribeToSession, type Session } from '../utils/session';

interface SiteChromeContextValue {
  heroAnimating: boolean;
  setHeroAnimating: (animating: boolean) => void;
  // opens the login panel, e.g. from the 401 page
  openLogin: () => void;
  isLoggedIn: boolean;
  // who is logged in (null until they are, and while their default password still has to be changed)
  session: Session | null;
  // runs `then` now when logged in; otherwise opens the login panel with a notice and runs `then` once logged in
  requireLogin: (then: () => void) => void;
}

// Shown on the login panel when an action needs the user to log in first
const LOGIN_REQUIRED_NOTICE = '請先登入，登入後將直接前往影像匯入與紀錄';
// The login panel slides away this long; the pending action waits for it so a page transition starts on a clear page
const LOGIN_PANEL_CLOSE_MS = 500;

const SiteChromeContext = createContext<SiteChromeContextValue | null>(null);

export function useSiteChrome(): SiteChromeContextValue {
  const context = useContext(SiteChromeContext);
  if (!context) throw new Error('useSiteChrome must be used inside <SiteChrome>');
  return context;
}

// Navbar + login panel shared by every page. Who is logged in comes from the session (utils/session.ts), so it
// survives reloads and ends wherever a call finds the token expired. An account still on its default password is held
// on the change-password page until it is changed.
export default function SiteChrome({ children }: { children: ReactNode }) {
  const [loginOpen, setLoginOpen] = useState(false);
  const [heroAnimating, setHeroAnimating] = useState(false);
  const session = useSyncExternalStore(subscribeToSession, getSession, getServerSession);
  // what to do once the user has logged in (set by requireLogin); stored as a function, so wrapped in an object
  const [afterLogin, setAfterLogin] = useState<{ run: () => void } | null>(null);
  const isLoggedIn = session !== null && !session.isDefaultPassword;
  const mustChangePassword = session?.isDefaultPassword ?? false;

  // the navbar's way back to the last map record / well is kept per account
  const username = session?.username ?? null;
  useEffect(() => {
    setVisitAccount(username);
  }, [username]);

  // once logged in (with the password changed if it had to be), carry on with what needed the login
  const finishLogin = () => {
    if (!afterLogin) return;
    setLoginOpen(false);
    setAfterLogin(null);
    setTimeout(afterLogin.run, LOGIN_PANEL_CLOSE_MS);
  };

  const requireLogin = (then: () => void) => {
    if (isLoggedIn) {
      then();
      return;
    }
    setAfterLogin({ run: then });
    setLoginOpen(true);
  };

  const closeLogin = () => {
    setLoginOpen(false);
    setAfterLogin(null);
  };

  // logging out leaves the page it was on for the home page
  const router = useRouter();
  const logout = () => {
    clearSession();
    closeLogin();
    router.push('/');
  };

  return (
    <SiteChromeContext
      value={{ heroAnimating, setHeroAnimating, openLogin: () => setLoginOpen(true), isLoggedIn, session: isLoggedIn ? session : null, requireLogin }}
    >
      <Navbar
        onLoginOpen={() => setLoginOpen(true)}
        contentFaded={loginOpen}
        heroAnimating={heroAnimating}
        isLoggedIn={isLoggedIn}
        userInfo={isLoggedIn ? { name: session.username, role: session.role } : null}
      />
      <LoginPanel
        isOpen={loginOpen || mustChangePassword}
        onClose={closeLogin}
        notice={afterLogin ? LOGIN_REQUIRED_NOTICE : undefined}
        session={session}
        onLoggedIn={finishLogin}
        onLogout={logout}
      />
      {children}
      {isLoggedIn && <CopilotWidget />}
    </SiteChromeContext>
  );
}
