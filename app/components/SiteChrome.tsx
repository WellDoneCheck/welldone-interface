'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import Navbar from './Navbar';
import LoginPanel, { type UserInfo } from './LoginPanel';
import CopilotWidget from './CopilotWidget';

interface SiteChromeContextValue {
  heroAnimating: boolean;
  setHeroAnimating: (animating: boolean) => void;
}

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

  return (
    <SiteChromeContext value={{ heroAnimating, setHeroAnimating }}>
      <Navbar
        onLoginOpen={() => setLoginOpen(true)}
        contentFaded={loginOpen}
        heroAnimating={heroAnimating}
        isLoggedIn={userInfo !== null}
        userInfo={userInfo}
      />
      <LoginPanel
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        isLoggedIn={userInfo !== null}
        userInfo={userInfo}
        onLogin={setUserInfo}
        onLogout={() => setUserInfo(null)}
      />
      {children}
      {userInfo && <CopilotWidget hidden={heroAnimating} />}
    </SiteChromeContext>
  );
}
