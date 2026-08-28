'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface ScrollImageSequenceProps {
  totalFrames: number;
  framePattern: string;
  scrollHeight?: number;
  className?: string;
}

export default function ScrollImageSequence({
  totalFrames,
  framePattern,
  scrollHeight = 400,
  className,
}: ScrollImageSequenceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const maskImgRef = useRef<HTMLImageElement>(null);
  const animRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(-1);
  const frameCacheRef = useRef<Map<number, HTMLImageElement>>(new Map);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const textRef = useRef<HTMLDivElement>(null);
  const [arrowVisible, setArrowVisible] = useState(true);

  const getUrl = useCallback(
    (pattern: string, index: number) => {
      const padded = String(index + 1).padStart(4, '0');
      return pattern.replace('{index}', padded);
    },
    [],
  );

  const cacheImage = useCallback(
    (cache: Map<number, HTMLImageElement>, pattern: string, index: number): HTMLImageElement | null => {
      if (index < 0 || index >= totalFrames) return null;
      if (cache.has(index)) return cache.get(index)!;
      const img = new Image();
      img.src = getUrl(pattern, index);
      img.loading = 'eager';
      cache.set(index, img);
      return img;
    },
    [getUrl, totalFrames],
  );

  const showFrame = useCallback(
    (frameIndex: number) => {
      if (frameIndex === lastFrameRef.current) return;
      lastFrameRef.current = frameIndex;

      const img = imgRef.current;
      if (img) {
        const cached = frameCacheRef.current.get(frameIndex);
        if (cached && cached.complete && cached.naturalWidth > 0) {
          img.src = cached.src;
          if (maskImgRef.current) maskImgRef.current.src = cached.src;
        } else {
          const newImg = cacheImage(frameCacheRef.current, framePattern, frameIndex);
          if (newImg) {
            const onLoad = () => {
              newImg.removeEventListener('load', onLoad);
              if (lastFrameRef.current === frameIndex && imgRef.current) {
                imgRef.current.src = newImg.src;
                if (maskImgRef.current) maskImgRef.current.src = newImg.src;
              }
            };
            if (newImg.complete) onLoad();
            else newImg.addEventListener('load', onLoad);
          }
        }
      }

      for (let i = 1; i <= 8; i++) cacheImage(frameCacheRef.current, framePattern, frameIndex + i);
      for (let i = 1; i <= 2; i++) cacheImage(frameCacheRef.current, framePattern, frameIndex - i);
    },
    [cacheImage, framePattern],
  );

  // Scroll handler
  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        animRef.current = requestAnimationFrame(() => {
          const container = containerRef.current;
          if (!container) { ticking = false; return; }

          const rect = container.getBoundingClientRect();
          const vh = window.innerHeight;
          const totalScroll = rect.height - vh;
          const scrolled = -rect.top;
          const progress = Math.max(0, Math.min(1, scrolled / totalScroll));
          const frame = Math.min(totalFrames - 1, Math.floor(progress * totalFrames));

          showFrame(frame);

          // Hide arrow when reaching the 3rd-to-last frame
          if (frame >= totalFrames - 3) {
            setArrowVisible(false);
          }

          // Handle text animation
          const textEl = textRef.current;
          if (textEl) {
            const hideStart = 2 / totalFrames; // show text
            const hideEnd = 10 / totalFrames; // hide text
            let ty = 0;
            let opacity = 1;
            if (progress > hideStart) {
              const t = Math.min(1, (progress - hideStart) / (hideEnd - hideStart));
              ty = -t * 100;
              opacity = 1 - t;
            }
            textEl.style.transform = `translateY(${ty}vh)`;
            textEl.style.opacity = String(opacity);
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [totalFrames, showFrame]);



  // Preload first 20 frames
  useEffect(() => {
    let loaded = 0;
    const preloadCount = Math.min(20, totalFrames);

    for (let i = 0; i < preloadCount; i++) {
      const frameImg = cacheImage(frameCacheRef.current, framePattern, i);
      if (!frameImg) continue;

      const check = () => {
        loaded++;
        setLoadProgress(Math.round((loaded / preloadCount) * 100));
        if (loaded >= preloadCount) {
          setLoading(false);
          showFrame(0);
        }
      };

      if (frameImg.complete) check();
      else {
        frameImg.onload = check;
        frameImg.onerror = check;
      }
    }

    const fallback = setTimeout(() => {
      setLoading(false);
      showFrame(0);
    }, 3000);

    return () => clearTimeout(fallback);
  }, [totalFrames, cacheImage, framePattern, showFrame]);

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-black">
        {/* Layer 1: Video frames */}
        <img
          ref={imgRef}
          alt=""
          draggable={false}
          className="absolute inset-0 z-10 h-full w-full select-none"
          style={{ objectFit: 'cover' }}
        />

        {/* Layer 2: Text */}
        <div
          ref={textRef}
          className="absolute inset-0 z-[12] flex items-start justify-center pointer-events-none will-change-transform"
          style={{ paddingTop: '18vh' }}
        >
          <h1
            className="text-center font-black"
            style={{
              fontFamily: 'var(--font-noto-serif-tc), serif',
              fontSize: 'clamp(60px, 12.3vw, 330px)',
              lineHeight: '1.17',
              color: '#68B9A5',
              width: '95%',
              textAlign: 'center',
              textShadow: '0 2px 40px rgba(0,0,0,0.15)',
            }}
          >
            AI水井辨識系統
          </h1>
        </div>

        {/* Layer 3: frame + CSS mask */}
        <img
          ref={maskImgRef}
          alt=""
          draggable={false}
          className="absolute inset-0 z-[15] h-full w-full select-none pointer-events-none"
          style={{
            objectFit: 'cover',
            maskImage: 'url(/mask.png)',
            WebkitMaskImage: 'url(/mask.png)',
            maskSize: '89.97%',
            WebkitMaskSize: '89%',
            maskPosition: 'center 38%',
            WebkitMaskPosition: 'center 38%',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
          }}
        />

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black text-white">
            <div className="mb-4 h-1 w-48 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-white transition-all duration-300"
                style={{ width: `${loadProgress}%` }}
              />
            </div>
            <span className="text-sm text-zinc-400">
              {loadProgress > 0 ? `Loading… ${loadProgress}%` : 'Preparing frames…'}
            </span>
          </div>
        )}

        {/* Floating scroll-down arrow */}
        {arrowVisible && !loading && (
          <button
            type="button"
            onClick={() => {
              const container = containerRef.current;
              if (!container) return;
              const rect = container.getBoundingClientRect();
              const totalScroll = rect.height - window.innerHeight;
              const scrollBottom = -rect.top + totalScroll;
              const startY = window.scrollY;

              // Phase 1: current → frame 125/229, Phase 2: frame 125 → end
              const splitRatio = 125 / totalFrames;
              const splitScroll = startY + (scrollBottom - startY) * splitRatio;
              const phase1Duration = 3000; // first half
              const phase2Duration = 3000; // second half

              const easeInOutCubic = (t: number) =>
                t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

              let startTime: number | null = null;
              let phase: 1 | 2 = 1;

              const step = (timestamp: number) => {
                if (!startTime) startTime = timestamp;
                const elapsed = timestamp - startTime;
                const duration = phase === 1 ? phase1Duration : phase2Duration;
                const from = phase === 1 ? startY : splitScroll;
                const to = phase === 1 ? splitScroll : scrollBottom;
                const progress = Math.min(elapsed / duration, 1);
                const easedProgress = easeInOutCubic(progress);

                window.scrollTo(0, from + (to - from) * easedProgress);

                if (progress < 1) {
                  requestAnimationFrame(step);
                } else if (phase === 1) {
                  // Transition to phase 2
                  phase = 2;
                  startTime = timestamp;
                  requestAnimationFrame(step);
                }
              };

              requestAnimationFrame(step);
            }}
            className="absolute bottom-10 left-1/2 z-20 -translate-x-1/2 animate-bounce cursor-pointer bg-transparent border-0 p-0"
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-lg opacity-80"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}