'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface ScrollImageSequenceProps {
  totalFrames: number;
  framePattern: string;
  scrollHeight?: number;
  className?: string;
  onAnimatingChange?: (animating: boolean) => void;
  loop?: boolean;
  text?: string | null;
  mask?: boolean;
}

export default function ScrollImageSequence({
  totalFrames,
  framePattern,
  scrollHeight = 400,
  className,
  onAnimatingChange,
  loop = false,
  text = 'AI水井辨識系統',
  mask = true,
}: ScrollImageSequenceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const maskImgRef = useRef<HTMLImageElement>(null);
  const animRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(-1);
  const frameCacheRef = useRef<Map<number, HTMLImageElement>>(new Map);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const gradientRef = useRef<HTMLDivElement>(null);
  const maskGradientRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [arrowVisible, setArrowVisible] = useState(true);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animatingRef = useRef(false);
  const scrollAnimRef = useRef<number>(0);

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
          const rawProgress = Math.max(0, scrolled / totalScroll);
          const loopCount = loop ? 3 : 1;
          const progress = loop
            ? (rawProgress * loopCount) % 1
            : Math.min(1, rawProgress);
          const frame = Math.min(totalFrames - 1, Math.floor(progress * totalFrames));

          showFrame(frame);

          // Fade out the first-frame gradient from frame 0 to frame 20
          const gradientOpacity = Math.max(0, 1 - progress / (20 / totalFrames));
          if (gradientRef.current) gradientRef.current.style.opacity = String(gradientOpacity);
          if (maskGradientRef.current) maskGradientRef.current.style.opacity = String(gradientOpacity);

          // Hide arrow during animation or when at last frame
          if (animatingRef.current || frame >= totalFrames - 1) {
            setArrowVisible(false);
          } else {
            setArrowVisible(true);
          }

          // Handle text animation
          const textEl = textRef.current;
          if (textEl) {
            const hideStart = 2 / totalFrames;
            const hideEnd = 20 / totalFrames;
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
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [totalFrames, showFrame]);


  // Cancel animation on user interaction (wheel / touch)
  useEffect(() => {
    const cancelAnim = () => {
      if (animatingRef.current) {
        animatingRef.current = false;
        cancelAnimationFrame(scrollAnimRef.current);
        setArrowVisible(true);
        onAnimatingChange?.(false);
      }
    };

    window.addEventListener('wheel', cancelAnim, { passive: true });
    window.addEventListener('touchstart', cancelAnim, { passive: true });

    return () => {
      window.removeEventListener('wheel', cancelAnim);
      window.removeEventListener('touchstart', cancelAnim);
    };
  }, []);



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

        {/* Layer 1.5: first-frame legibility gradient (fades out by frame 20) */}
        {!loading && (
          <div
            ref={gradientRef}
            className="absolute inset-0 z-[11] pointer-events-none"
            style={{ background: 'linear-gradient(90deg, rgba(3, 3, 3, 0.5) 0%, rgba(35, 35, 35, 0.35) 46.63%, rgba(255, 255, 255, 0) 100%)' }}
          />
        )}

        {/* Layer 2: Text */}
        {text && (
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
                color: '#D1E6E7',
                width: '95%',
                textAlign: 'center',
                textShadow: '0 2px 40px rgba(0,0,0,0.15)',
              }}
            >
              {text}
            </h1>
          </div>
        )}

        {/* Layer 3: masked video — reveals the text behind it */}
        {mask && (
        <div className="absolute inset-0 z-[12] overflow-hidden select-none pointer-events-none">
          <img
            ref={maskImgRef}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              maskImage: 'url(/landing_page/mask.png)',
              WebkitMaskImage: 'url(/landing_page/mask.png)',
              maskSize: 'cover',
              WebkitMaskSize: 'cover',
              maskPosition: 'center',
              WebkitMaskPosition: 'center',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
            }}
          />
          {!loading && (
            <div
              ref={maskGradientRef}
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, rgba(3, 3, 3, 0.5) 0%, rgba(35, 35, 35, 0.35) 46.63%, rgba(255, 255, 255, 0) 100%)',
                maskImage: 'url(/landing_page/mask.png)',
                WebkitMaskImage: 'url(/landing_page/mask.png)',
                maskSize: 'cover',
                WebkitMaskSize: 'cover',
                maskPosition: 'center',
                WebkitMaskPosition: 'center',
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
              }}
            />
          )}
        </div>
        )}

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

        {/* Floating scroll-down arrow — pop-in / pop-out animation */}
        <button
          type="button"
          onClick={() => {
            const container = containerRef.current;
            if (!container) return;
            const vh = window.innerHeight;
            const containerTop = container.offsetTop;
            const rect = container.getBoundingClientRect();
            const totalScroll = rect.height - vh;
            const scrollBottom = containerTop + totalScroll;
            const startY = window.scrollY;
            const totalDistance = scrollBottom - containerTop;

            // Already at bottom → scroll to next section
            if (startY >= scrollBottom - 10) {
              const nextSection = container.nextElementSibling as HTMLElement;
              if (nextSection) {
                window.scrollTo({ top: nextSection.offsetTop, behavior: 'smooth' });
              }
              return;
            }

            // Time-based auto-scroll proportional to scroll height
            // Speed: ~3s per 400vh of scroll distance
            const totalDuration = Math.max(2000, (totalDistance / vh) * 3000);
            const phase1Duration = totalDuration * 0.4;
            const phase2Duration = totalDuration * 0.6;

            const easeInOutCubic = (t: number) =>
              t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

            let startTime: number | null = null;
            let phase: 1 | 2 = 1;

            const step = (timestamp: number) => {
              if (!startTime) startTime = timestamp;
              const elapsed = timestamp - startTime;

              let from: number;
              let to: number;
              let progress: number;

              if (phase === 1) {
                from = startY;
                to = startY + totalDistance * 0.3;
                progress = Math.min(elapsed / phase1Duration, 1);
              } else {
                from = startY + totalDistance * 0.3;
                to = scrollBottom;
                progress = Math.min(elapsed / phase2Duration, 1);
              }

              const easedProgress = easeInOutCubic(progress);
              window.scrollTo(0, from + (to - from) * easedProgress);

              if (progress < 1) {
                scrollAnimRef.current = requestAnimationFrame(step);
              } else if (phase === 1) {
                phase = 2;
                startTime = timestamp;
                scrollAnimRef.current = requestAnimationFrame(step);
              } else {
                animatingRef.current = false;
                setArrowVisible(true);
                onAnimatingChange?.(false);
              }
            };

            animatingRef.current = true;
            setArrowVisible(false);
            onAnimatingChange?.(true);
            scrollAnimRef.current = requestAnimationFrame(step);
          }}
          className={`absolute bottom-10 left-1/2 z-20 -translate-x-1/2 cursor-pointer bg-transparent border-0 p-0 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] animate-bounce ${
            arrowVisible && !loading
              ? 'opacity-100 scale-100 pointer-events-auto'
              : 'opacity-0 scale-50 pointer-events-none'
          }`}
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
      </div>
    </div>
  );
}