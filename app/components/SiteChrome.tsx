'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import Navbar from './Navbar';
import LoginPanel, { type UserInfo } from './LoginPanel';
import CopilotWidget from './CopilotWidget';
import { setVisitAccount } from '../utils/lastVisit';

interface SiteChromeContextValue {
  heroAnimating: boolean;
  setHeroAnimating: (animating: boolean) => void;
  // opens the login panel, e.g. from the 401 page
  openLogin: () => void;
  isLoggedIn: boolean;
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

// Navbar + login panel shared by every page; login state survives client-side navigation.
export default function SiteChrome({ children }: { children: ReactNode }) {
  const [loginOpen, setLoginOpen] = useState(false);
  const [heroAnimating, setHeroAnimating] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  // what to do once the user has logged in (set by requireLogin); stored as a function, so wrapped in an object
  const [afterLogin, setAfterLogin] = useState<{ run: () => void } | null>(null);

  // the navbar's way back to the last map record / well is kept per account
  useEffect(() => setVisitAccount(userInfo?.name ?? null), [userInfo]);

  const requireLogin = (then: () => void) => {
    if (userInfo) {
      then();
      return;
    }
    setAfterLogin({ run: then });
    setLoginOpen(true);
  };

  const logIn = (user: UserInfo) => {
    setUserInfo(user);
    if (!afterLogin) return;
    setLoginOpen(false);
    setAfterLogin(null);
    setTimeout(afterLogin.run, LOGIN_PANEL_CLOSE_MS);
  };

  const closeLogin = () => {
    setLoginOpen(false);
    setAfterLogin(null);
  };

  return (
    <SiteChromeContext
      value={{ heroAnimating, setHeroAnimating, openLogin: () => setLoginOpen(true), isLoggedIn: userInfo !== null, requireLogin }}
    >
      <Navbar
        onLoginOpen={() => setLoginOpen(true)}
        contentFaded={loginOpen}
        heroAnimating={heroAnimating}
        isLoggedIn={userInfo !== null}
        userInfo={userInfo}
      />
      <LoginPanel
        isOpen={loginOpen}
        onClose={closeLogin}
        notice={afterLogin ? LOGIN_REQUIRED_NOTICE : undefined}
        isLoggedIn={userInfo !== null}
        userInfo={userInfo}
        onLogin={logIn}
        onLogout={() => setUserInfo(null)}
      />
      {children}
      {userInfo && <CopilotWidget />}
    </SiteChromeContext>
  );
}
