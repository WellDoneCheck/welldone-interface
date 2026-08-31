'use client';

import { useState } from 'react';
import ScrollImageSequence from './components/ScrollImageSequence';
import FloatingGrid from './components/FloatingGrid';
import Navbar from './components/Navbar';
import LoginPanel, { type UserInfo } from './components/LoginPanel';

export default function Home() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [heroAnimating, setHeroAnimating] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  const handleLogin = (user: UserInfo) => {
    setUserInfo(user);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setUserInfo(null);
    setIsLoggedIn(false);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navbar */}
      <Navbar
        onLoginOpen={() => setLoginOpen(true)}
        contentFaded={loginOpen}
        heroAnimating={heroAnimating}
        isLoggedIn={isLoggedIn}
        userInfo={userInfo}
      />

      {/* Login slide-in panel */}
      <LoginPanel
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        isLoggedIn={isLoggedIn}
        userInfo={userInfo}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {/* ===== Image-sequence scroll hero ===== */}
      <ScrollImageSequence
        totalFrames={229}
        framePattern="/landing_page/map_frames/frame_{index}.jpg"
        scrollHeight={400}
        className="h-[400vh]"
        onAnimatingChange={setHeroAnimating}
      />

      {/* ===== Content sections after the scroll ===== */}
      <section className="relative z-10 bg-black">
        <div className="pointer-events-none absolute inset-x-0 -top-32 h-32 bg-gradient-to-b from-transparent to-black" />

        <FloatingGrid />

        <footer className="border-t border-zinc-900 py-12 text-center text-sm text-zinc-600">
          Freebuff Desktop &mdash; Scroll Demo
        </footer>
      </section>
    </div>
  );
}
