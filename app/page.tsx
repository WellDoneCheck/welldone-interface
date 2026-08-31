'use client';

import { useState } from 'react';
import ScrollImageSequence from './components/ScrollImageSequence';
import FloatingGrid from './components/FloatingGrid';
import Navbar from './components/Navbar';
import LoginPanel, { type UserInfo } from './components/LoginPanel';
import VideoPlayer from './components/VideoPlayer';

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

      </section>

      {/* ===== Video section (below Kove) ===== */}
      <section className="relative z-10 bg-[#0a0e1a] min-h-[100vh] flex items-center justify-center py-20 px-8 snap-start">
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-cyan-500/20 rounded-2xl blur-xl" />
          <VideoPlayer
            src="/second_fin.mp4"
            className="relative w-[80vw] max-w-[1000px] aspect-video rounded-xl border border-cyan-500/30 shadow-[0_0_60px_rgba(34,211,238,0.15)]"
          />
        </div>
        <p className="absolute bottom-10 left-1/2 -translate-x-1/2 text-cyan-400/60 text-sm">Setup by SkyWell</p>
      </section>

      <section className="relative z-10 bg-black">
        <footer className="border-t border-zinc-900 py-12 text-center text-sm text-zinc-600">
          Freebuff Desktop &mdash; Scroll Demo
        </footer>
      </section>
    </div>
  );
}
