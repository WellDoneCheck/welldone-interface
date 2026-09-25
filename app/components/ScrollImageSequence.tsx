'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface ScrollImageSequenceProps {
  totalFrames: number;
  framePattern: string;
  // Scroll distance (vh) that plays the frames
  scrollHeight?: number;
  // Extra scroll distance (vh) after the last frame that shrinks the map into a centered frame
  shrinkHeight?: number;
  className?: string;
  onAnimatingChange?: (animating: boolean) => void;
}

// The map ends up at this fraction of the viewport, centered on a white background
const SHRINK_END_SCALE = 0.515;
// Wide aerial photo the last frame cross-fades into while shrinking (loaded near the end of the frames)
const SHRINK_IMAGE = '/aerial-bg.png';
const SHRINK_IMAGE_PRELOAD_PROGRESS = 0.8;
// Scrolling holds still this long once the map has finished shrinking (going down),
// then glides on into the photo wall by itself over SHRINK_EXIT_MS
const SHRINK_DWELL_MS = 1000;
const SHRINK_EXIT_MS = 1600;
const SCROLL_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ']);
// Navbar switches to dark text once the shrink passes this point
const NAV_LIGHT_THRESHOLD = 0.25;

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// Gentler than cubic (no steep middle): used for the scroll-driven shrink so it never feels rushed
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

export default function ScrollImageSequence({
  totalFrames,
  framePattern,
  scrollHeight = 400,
  shrinkHeight = 100,
  className,
  onAnimatingChange,
}: ScrollImageSequenceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const maskImgRef = useRef<HTMLImageElement>(null);
  const maskLayerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(-1);
  const pendingFrameRef = useRef<number>(-1);
  const frameCacheRef = useRef<Map<number, HTMLImageElement>>(new Map);
  const decodedFramesRef = useRef<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const gradientRef = useRef<HTMLDivElement>(null);
  const maskGradientRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const scalerRef = useRef<HTMLDivElement>(null);
  const shrinkImgRef = useRef<HTMLImageElement>(null);
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

  const applySrc = useCallback((index: number, img: HTMLImageElement) => {
    if (imgRef.current && imgRef.current.src !== img.src) {
      imgRef.current.src = img.src;
      if (maskImgRef.current) maskImgRef.current.src = img.src;
    }
    if (lastFrameRef.current === index) decodedFramesRef.current.add(index);
  }, []);

  // Async off-main-thread decode; the DOM img picks the frame up from the
  // shared decode cache, so a frame swap never blocks the main thread.
  const decodeFrame = useCallback(
    (frameIndex: number) => {
      if (decodedFramesRef.current.has(frameIndex)) return;
      const cached = frameCacheRef.current.get(frameIndex);
      if (!cached || !cached.complete || cached.naturalWidth === 0) return;
      cached
        .decode()
        .then(() => {
          decodedFramesRef.current.add(frameIndex);
          if (pendingFrameRef.current === frameIndex) applySrc(frameIndex, cached);
        })
        .catch(() => {});
    },
    [applySrc],
  );

  const showFrame = useCallback(
    (frameIndex: number) => {
      if (frameIndex === lastFrameRef.current) return;
      lastFrameRef.current = frameIndex;
      pendingFrameRef.current = frameIndex;

        const cached = frameCacheRef.current.get(frameIndex);
        if (cached && cached.complete && cached.naturalWidth > 0) {
        if (decodedFramesRef.current.has(frameIndex)) {
          applySrc(frameIndex, cached);
        } else {
          decodeFrame(frameIndex);
        }
      } else if (cached) {
        const onLoad = () => {
          cached.removeEventListener('load', onLoad);
          if (lastFrameRef.current === frameIndex) {
            applySrc(frameIndex, cached);
            decodeFrame(frameIndex);
          }
        };
        if (cached.complete) onLoad();
        else cached.addEventListener('load', onLoad);
        } else {
          const newImg = cacheImage(frameCacheRef.current, framePattern, frameIndex);
          if (newImg) {
            const onLoad = () => {
              newImg.removeEventListener('load', onLoad);
            if (lastFrameRef.current === frameIndex) {
              applySrc(frameIndex, newImg);
              decodeFrame(frameIndex);
              }
            };
            if (newImg.complete) onLoad();
            else newImg.addEventListener('load', onLoad);
        }
      }

      for (let i = 1; i <= 8; i++) cacheImage(frameCacheRef.current, framePattern, frameIndex + i);
      for (let i = 1; i <= 2; i++) cacheImage(frameCacheRef.current, framePattern, frameIndex - i);
      for (let i = 0; i <= 4; i++) decodeFrame(frameIndex + i);
    },
    [cacheImage, decodeFrame, applySrc, framePattern],
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
          const shrinkPx = (shrinkHeight / 100) * vh;
          const totalScroll = rect.height - vh - shrinkPx;
          const scrolled = -rect.top;
          const progress = Math.max(0, Math.min(1, scrolled / totalScroll));

          // After the last frame: shrink the map into a centered frame
          const shrinkProgress = shrinkPx > 0 ? Math.max(0, Math.min(1, (scrolled - totalScroll) / shrinkPx)) : 0;
          const scale = 1 - (1 - SHRINK_END_SCALE) * easeInOutSine(shrinkProgress);
          if (scalerRef.current) scalerRef.current.style.transform = `scale(${scale})`;

          // Cross-fade the last frame into the wide aerial photo while shrinking
          const shrinkImg = shrinkImgRef.current;
          if (shrinkImg) {
            if (progress > SHRINK_IMAGE_PRELOAD_PROGRESS && !shrinkImg.getAttribute('src')) shrinkImg.src = SHRINK_IMAGE;
            const fade = Math.max(0, Math.min(1, (shrinkProgress - 0.1) / 0.7));
            shrinkImg.style.opacity = String(easeInOutSine(fade));
          }

          // Let the navbar know the stage is light (white) so it can use dark text
          const stage = stageRef.current;
          const navLight = String(shrinkProgress > NAV_LIGHT_THRESHOLD);
          if (stage && stage.dataset.navLight !== navLight) {
            stage.dataset.navLight = navLight;
            window.dispatchEvent(new Event('scroll'));
          }
          const frame = Math.min(totalFrames - 1, Math.floor(progress * totalFrames));

          showFrame(frame);

          // Fade out the first-frame gradient from frame 0 to frame 20
          const gradientOpacity = Math.max(0, 1 - progress / (20 / totalFrames));
          if (gradientRef.current) gradientRef.current.style.opacity = String(gradientOpacity);
          if (maskGradientRef.current) maskGradientRef.current.style.opacity = String(gradientOpacity);

          // Hide arrow during the auto-play and once the frames are done: from there scrolling flows
          // through the shrink straight into the photo wall
          setArrowVisible(!animatingRef.current && frame < totalFrames - 1);

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
  }, [totalFrames, showFrame, shrinkHeight]);


  // Dwell: once the shrink is complete (scrolling down), scrolling is held for SHRINK_DWELL_MS,
  // then the page glides down into the photo wall unless the user takes over
  useEffect(() => {
    let lockedUntil = 0;
    let lockY = 0;
    let dwelled = false;
    let lastY = window.scrollY;
    let dwellTimer: ReturnType<typeof setTimeout> | undefined;
    let glideFrame = 0;

    const isLocked = () => performance.now() < lockedUntil;

    const glideIntoNextSection = () => {
      const next = containerRef.current?.nextElementSibling as HTMLElement | null;
      if (!next || window.scrollY !== lockY) return;
      const from = window.scrollY;
      const to = next.offsetTop;
      const startedAt = performance.now();
      const step = (now: number) => {
        const progress = Math.min((now - startedAt) / SHRINK_EXIT_MS, 1);
        window.scrollTo(0, from + (to - from) * easeInOutSine(progress));
        if (progress < 1) glideFrame = requestAnimationFrame(step);
      };
      glideFrame = requestAnimationFrame(step);
    };

    // The user scrolling takes over from the automatic glide
    const takeOver = () => {
      if (!isLocked()) cancelAnimationFrame(glideFrame);
    };

    const onScroll = () => {
      const container = containerRef.current;
      if (!container || shrinkHeight <= 0) return;
      const y = window.scrollY;

      if (isLocked()) {
        if (y !== lockY) window.scrollTo(0, lockY);
        return;
      }

      const shrinkPx = (shrinkHeight / 100) * window.innerHeight;
      const shrinkEnd = container.offsetTop + container.offsetHeight - window.innerHeight;
      if (y < shrinkEnd - shrinkPx * 0.05) dwelled = false; // scrolled back up: hold again next time
      const arrivedGoingDown = y > lastY && y >= shrinkEnd;
      lastY = y;

      if (!dwelled && arrivedGoingDown) {
        dwelled = true;
        lockY = shrinkEnd;
        lockedUntil = performance.now() + SHRINK_DWELL_MS;
        window.scrollTo(0, lockY);
        lastY = lockY;
        dwellTimer = setTimeout(glideIntoNextSection, SHRINK_DWELL_MS);
      }
    };

    const block = (event: Event) => {
      if (isLocked()) event.preventDefault();
      else takeOver();
    };
    const blockKeys = (event: KeyboardEvent) => {
      if (!SCROLL_KEYS.has(event.key)) return;
      if (isLocked()) event.preventDefault();
      else takeOver();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', block, { passive: false });
    window.addEventListener('touchstart', takeOver, { passive: true });
    window.addEventListener('touchmove', block, { passive: false });
    window.addEventListener('keydown', blockKeys);
    return () => {
      clearTimeout(dwellTimer);
      cancelAnimationFrame(glideFrame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', block);
      window.removeEventListener('touchstart', takeOver);
      window.removeEventListener('touchmove', block);
      window.removeEventListener('keydown', blockKeys);
    };
  }, [shrinkHeight]);

  // Cancel animation on user interaction (wheel / touch)
  useEffect(() => {
    const cancelAnim = () => {
      cancelAnimationFrame(scrollAnimRef.current);
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
    <div
      ref={containerRef}
      className={`relative ${className ?? ''}`}
      style={{ height: `${scrollHeight + shrinkHeight}vh` }}
    >
      <div ref={stageRef} data-nav-light="false" className="sticky top-0 h-screen w-full overflow-hidden bg-white">
        {/* Everything below except the loader and arrow shrinks together */}
        <div ref={scalerRef} className="absolute inset-0 will-change-transform">
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
            AI水井辨識系統
          </h1>
        </div>

        {/* Layer 3: masked video — reveals the text behind it */}
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


        {/* Layer 4: wide aerial photo, fades in while the map shrinks */}
        <img
          ref={shrinkImgRef}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 z-[13] h-full w-full select-none object-cover opacity-0"
        />
        </div>

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

        {/* Floating scroll-down arrow — hidden when at last frame */}
        {arrowVisible && !loading && (
          <button
            type="button"
            onClick={() => {
              const container = containerRef.current;
              if (!container) return;
              const vh = window.innerHeight;
              const containerTop = container.offsetTop;
              const rect = container.getBoundingClientRect();
              const shrinkPx = (shrinkHeight / 100) * vh;
              const totalScroll = rect.height - vh - shrinkPx;
              const scrollBottom = containerTop + totalScroll;
              const startY = window.scrollY;

              const splitRatio = 125 / totalFrames;
              const totalDistance = scrollBottom - containerTop;
              const currentFrame = totalDistance > 0
                ? Math.floor(((startY - containerTop) / totalDistance) * totalFrames)
                : 0;

              // If already at/near bottom, scroll to next section
              if (currentFrame >= totalFrames - 1 || startY >= scrollBottom - 10) {
                const nextSection = container.nextElementSibling as HTMLElement;
                if (nextSection) {
                  window.scrollTo({ top: nextSection.offsetTop, behavior: 'smooth' });
                }
                return;
              }

              const skipPhase1 = currentFrame >= 125;
              const splitScroll = skipPhase1 ? scrollBottom : containerTop + totalDistance * splitRatio;
              const totalDuration = skipPhase1 ? 3000 : 5000;

              let startTime: number | null = null;
              let phase: 1 | 2 = 1;

              const step = (timestamp: number) => {
                if (!startTime) startTime = timestamp;
                const elapsed = timestamp - startTime;

                let from: number;
                let to: number;
                let progress: number;

                if (skipPhase1) {
                  from = startY;
                  to = scrollBottom;
                  progress = Math.min(elapsed / totalDuration, 1);
                } else {
                  if (phase === 1) {
                    from = startY;
                    to = splitScroll;
                    progress = Math.min(elapsed / 3000, 1);
                  } else {
                    from = splitScroll;
                    to = scrollBottom;
                    progress = Math.min(elapsed / 2000, 1);
                  }
                }

                const easedProgress = easeInOutCubic(progress);
                window.scrollTo(0, from + (to - from) * easedProgress);

                if (progress < 1) {
                  scrollAnimRef.current = requestAnimationFrame(step);
                } else if (!skipPhase1 && phase === 1) {
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