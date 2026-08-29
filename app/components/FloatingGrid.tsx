'use client';

import { useRef, useEffect } from 'react';

export default function FloatingGrid() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);

  const scrollData = useRef({
    current: 0,
    target: 0,
    ease: 0.08,
  });

  useEffect(() => {
    let requestID: number;

    const update = () => {
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();

      if (rect.top <= 0) {
        scrollData.current.target = -rect.top;
      } else {
        scrollData.current.target = 0;
      }

      // Lerp
      scrollData.current.current += 
        (scrollData.current.target - scrollData.current.current) * scrollData.current.ease;

      const delta = scrollData.current.current;

      if (leftColRef.current) {
        leftColRef.current.style.transform = `translate3d(0, -${delta * 0.5}px, 0)`;
      }
      if (rightColRef.current) {
        rightColRef.current.style.transform = `translate3d(0, -${delta * 0.8}px, 0)`;
      }

      requestID = requestAnimationFrame(update);
    };

    requestID = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestID);
  }, []);

  const IMAGES = [
    { src: '/landing_page/grid/01.png', ratio: 'aspect-[3/4]' },
    { src: '/landing_page/grid/02.png', ratio: 'aspect-square' },
    { src: '/landing_page/grid/03.png', ratio: 'aspect-[4/5]' },
    { src: '/landing_page/grid/04.png', ratio: 'aspect-[3/4]' },
    { src: '/landing_page/grid/05.png', ratio: 'aspect-square' },
    { src: '/landing_page/grid/06.png', ratio: 'aspect-[2/3]' },
  ];

  return (
    <section 
      ref={sectionRef} 
      className="relative w-full h-[250vh] bg-white text-black"
      data-section="kove"
      style={{ zIndex: 5 }}
    >
      <div className="sticky top-0 h-screen w-full flex overflow-hidden">
        
        <div className="w-1/2 h-full flex flex-col justify-center px-12 md:px-24 bg-white">
          <h2 className="font-serif text-[12vw] italic leading-[0.8] tracking-tighter">
            Kove
          </h2>
          <div className="mt-8 max-w-xs border-l-2 border-black/10 pl-6">
            <p className="text-[10px] uppercase tracking-[0.3em] leading-relaxed opacity-50">
              Independent Scroll / Layered Motion
            </p>
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