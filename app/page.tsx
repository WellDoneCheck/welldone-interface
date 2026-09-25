'use client';

import { useRef, useEffect } from 'react';
import ScrollImageSequence from './components/ScrollImageSequence';
import FloatingGrid from './components/FloatingGrid';
import { useSiteChrome } from './components/SiteChrome';
import VideoShowcase from './components/VideoShowcase';
import SiteFooter from './components/SiteFooter';

export default function Home() {
  const { heroAnimating, setHeroAnimating } = useSiteChrome();
  const videoSectionRef = useRef<HTMLElement>(null);

  // Auto-align the video section to the viewport top when scrolling stops near it
  // Skip during hero animation to prevent fighting with auto-scroll
  useEffect(() => {
    const onScrollEnd = () => {
      if (heroAnimating) return;
      const section = videoSectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const topInView = rect.top >= 0 && rect.top <= vh * 0.4;
      const bottomInView = rect.top < 0 && rect.bottom >= vh * 0.6;
      if (Math.abs(rect.top) > 2 && (topInView || bottomInView)) {
        window.scrollTo({ top: window.scrollY + rect.top, behavior: 'smooth' });
      }
    };
    window.addEventListener('scrollend', onScrollEnd);
    return () => window.removeEventListener('scrollend', onScrollEnd);
  }, [heroAnimating]);

  // Don't leave the shared navbar hidden if we navigate away mid-animation
  useEffect(() => () => setHeroAnimating(false), [setHeroAnimating]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ===== Image-sequence scroll hero ===== */}
      <ScrollImageSequence
        totalFrames={229}
        framePattern="/landing_page/map_frames/frame_{index}.jpg"
        scrollHeight={400}
        shrinkHeight={350}
        onAnimatingChange={setHeroAnimating}
      />

      {/* ===== Content sections after the scroll ===== */}
      <section className="relative z-10 bg-black">
        <FloatingGrid />

      </section>

      {/* ===== Video section (below Kove) ===== */}
      <section ref={videoSectionRef} className="relative z-10 flex min-h-[100vh] items-center justify-center bg-[#F7F6F1] px-8 pb-10 pt-28 md:px-20">
        <VideoShowcase />
      </section>

      <SiteFooter />
    </div>
  );
}
