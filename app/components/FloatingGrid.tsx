'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import SharedTransition, { ONLY_TO_MONITOR, SHARED, TO_MONITOR } from './SharedTransition';
import { useMonitorStats } from './useMonitorStats';
import { WELL_TOTALS } from '../data/monitor';
import { accuracyText, monitorFigures } from '../utils/monitorStats';

export default function FloatingGrid() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  // the backend's figures once logged in (read once: paused), the simulated ones until then
  const stats = monitorFigures(useMonitorStats(true), WELL_TOTALS);

  const scrollData = useRef({
    current: 0,
    target: 0,
    ease: 0.08,
  });

  // The columns ease after the scroll position: a frame loop that runs while they are still catching up, started again by
  // scrolling (and resizing), not one left running on every frame of the page
  useEffect(() => {
    let requestID: number | null = null;

    const update = () => {
      requestID = null;
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();

      if (rect.top <= 0) {
        scrollData.current.target = -rect.top;
      } else {
        scrollData.current.target = 0;
      }

      // Lerp, until it is within a tenth of a pixel of the target
      const gap = scrollData.current.target - scrollData.current.current;
      scrollData.current.current = Math.abs(gap) < 0.1 ? scrollData.current.target : scrollData.current.current + gap * scrollData.current.ease;

      const delta = scrollData.current.current;

      if (leftColRef.current) {
        leftColRef.current.style.transform = `translate3d(0, -${delta * 0.5}px, 0)`;
      }
      if (rightColRef.current) {
        rightColRef.current.style.transform = `translate3d(0, -${delta * 0.8}px, 0)`;
      }

      if (delta !== scrollData.current.target) requestID = requestAnimationFrame(update);
    };

    const wake = () => {
      if (requestID === null) requestID = requestAnimationFrame(update);
    };

    wake();
    window.addEventListener('scroll', wake, { passive: true });
    window.addEventListener('resize', wake);
    return () => {
      if (requestID !== null) cancelAnimationFrame(requestID);
      window.removeEventListener('scroll', wake);
      window.removeEventListener('resize', wake);
    };
  }, []);

  const IMAGES = [
    { src: '/landing_page/grid/01.webp', ratio: 'aspect-[3/4]' },
    { src: '/landing_page/grid/02.webp', ratio: 'aspect-square' },
    { src: '/landing_page/grid/03.webp', ratio: 'aspect-[4/5]' },
    { src: '/landing_page/grid/04.webp', ratio: 'aspect-[3/4]' },
    { src: '/landing_page/grid/05.webp', ratio: 'aspect-square' },
    { src: '/landing_page/grid/06.webp', ratio: 'aspect-[2/3]' },
  ];

  return (
    <section 
      ref={sectionRef} 
      className="relative w-full h-[250vh] bg-[#F7F6F1] text-black"
      data-section="kove"
      style={{ zIndex: 5 }}
    >
      <div className="sticky top-0 h-screen w-full flex overflow-hidden">
        
        <div className="w-1/2 h-full flex flex-col justify-center px-12 md:px-24 bg-[#F7F6F1]">
          {/* the recognition accuracy, from the same figures as the monitor page */}
          <div style={{ fontFamily: 'var(--font-noto-serif-tc), serif' }}>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#3F7A7E]">AI Well Detection</p>
            <h2 className="mt-4 text-[10vw] font-black leading-[0.85] tracking-tight text-[#2C322F]">
              {/* flies into the monitor page's accuracy card; hugging the figure so it lands at its size there */}
              <SharedTransition name={SHARED.recognitionAccuracy} share={ONLY_TO_MONITOR}>
                <span className="inline-block">
                  {accuracyText(stats.accuracy)}
                  {stats.accuracy !== null && <span className="text-[0.42em] text-[#62A4A7]">%</span>}
                </span>
              </SharedTransition>
            </h2>
            <p className="mt-4 text-[clamp(18px,1.7vw,30px)] font-bold text-[#2C322F]">水井辨識準確率</p>
            <div className="mt-8 max-w-sm border-l-2 border-[#62A4A7]/50 pl-6">
              <p className="text-[10px] uppercase tracking-[0.3em] leading-relaxed text-[#2C322F]/50">Aerial Imagery / Deep Learning</p>
              <p className="mt-3 text-sm leading-relaxed text-[#6F7468]">
                從空拍影像自動找出水井，已驗證 {stats.wells.verified.toLocaleString()} 口、待驗證 {stats.wells.pending.toLocaleString()} 口，加速合法水井的登記與清查。
              </p>
            </div>
            <Link
              href="/monitor"
              transitionTypes={TO_MONITOR}
              className="group mt-10 inline-flex items-center gap-4 bg-[#62A4A7] px-8 py-4 text-[clamp(18px,1.4vw,24px)] font-bold tracking-[0.04em] text-white shadow-[8px_8px_40px_rgba(0,0,0,0.18)] outline-none transition-[translate,filter] duration-500 ease-[var(--ease-expo)] hover:-translate-y-1.5 hover:brightness-110 motion-reduce:transition-none focus-visible:shadow-[0_0_0_4px_#D1E6E7]"
            >
              監控總覽
              <span aria-hidden className="transition-transform duration-500 ease-[var(--ease-expo)] group-hover:translate-x-1 motion-reduce:transition-none">
                →
              </span>
            </Link>
          </div>
        </div>

        <div className="w-1/2 h-full relative px-6 bg-black overflow-hidden">
          <div className="flex gap-8">
            
            {/* left column */}
            <div ref={leftColRef} className="flex w-1/2 flex-col gap-16 will-change-transform pt-12">
              {[IMAGES[0], IMAGES[2], IMAGES[4]].map((img, i) => (
                <div key={i} className={`relative ${img.ratio} overflow-hidden bg-zinc-900 shadow-2xl`}>
                  <img src={img.src} alt="" className="h-full w-full object-cover grayscale transition-all duration-700 hover:grayscale-0" />
                </div>
              ))}
            </div>

            {/* right column */}
            <div ref={rightColRef} className="mt-80 flex w-1/2 flex-col gap-16 will-change-transform">
              {[IMAGES[1], IMAGES[3], IMAGES[5]].map((img, i) => (
                <div key={i} className={`relative ${img.ratio} overflow-hidden bg-zinc-900 shadow-2xl`}>
                  <img src={img.src} alt="" className="h-full w-full object-cover grayscale transition-all duration-700 hover:grayscale-0" />
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* vertical divider */}
        <div className="absolute left-1/2 top-0 h-full w-[1px] bg-black/10 z-10" />
      </div>
    </section>
  );
}