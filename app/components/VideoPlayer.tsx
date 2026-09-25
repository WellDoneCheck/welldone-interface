'use client';

import { useRef, useState, useEffect, useCallback, type KeyboardEvent, type MouseEvent } from 'react';

interface VideoPlayerProps {
  src: string;
  className?: string;
}

const CONTROLS_HIDE_MS = 4000;
const SEEK_STEP_SECONDS = 5;

// 75 -> '1:15'; unknown length -> '--:--'
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '--:--';
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

function PlayIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

export default function VideoPlayer({ src, className = '' }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(NaN);
  const [showControls, setShowControls] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progress = Number.isFinite(duration) && duration > 0 ? (currentTime / duration) * 100 : 0;
  // Controls stay up while paused so the way to resume is always visible
  const controlsVisible = showControls || !playing;

  // Sync playing state with the video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncPlaying = () => setPlaying(!video.paused);
    video.addEventListener('play', syncPlaying);
    video.addEventListener('pause', syncPlaying);
    return () => {
      video.removeEventListener('play', syncPlaying);
      video.removeEventListener('pause', syncPlaying);
    };
  }, []);

  // Play only when the section approaches the viewport; pause when it leaves
  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play();
        } else {
          video.pause();
        }
      },
      { rootMargin: '150% 0px 150% 0px' },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Track time and length
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onMetadata = () => setDuration(video.duration);

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onMetadata);
    if (video.readyState >= 1) onMetadata();
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onMetadata);
    };
  }, []);

  // Auto-hide controls while playing
  const revealControls = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), CONTROLS_HIDE_MS);
  }, []);

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  }, []);

  const seekTo = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.min(Math.max(seconds, 0), video.duration);
  }, []);

  const onTrackClick = (event: MouseEvent<HTMLDivElement>) => {
    const { left, width } = event.currentTarget.getBoundingClientRect();
    seekTo(((event.clientX - left) / width) * duration);
  };

  const onTrackKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    seekTo(currentTime + (event.key === 'ArrowRight' ? SEEK_STEP_SECONDS : -SEEK_STEP_SECONDS));
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-[#2C322F] ${className}`}
      onMouseMove={revealControls}
      onMouseEnter={revealControls}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        className="h-full w-full object-cover"
        preload="metadata"
        loop
        muted
        playsInline
        onClick={togglePlay}
      />

      {/* soft ink tint while the controls are up */}
      <div
        className={`pointer-events-none absolute inset-0 bg-[#2C322F]/25 transition-opacity duration-500 ${
          controlsVisible ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* big play button while paused */}
      {!playing && (
        <button
          type="button"
          aria-label="播放影片"
          onClick={togglePlay}
          className="group absolute inset-0 z-10 flex cursor-pointer items-center justify-center outline-none"
        >
          <span className="flex h-[88px] w-[88px] items-center justify-center bg-[#62A4A7] text-white shadow-[var(--shadow-brand-glow)] transition-all duration-300 ease-[var(--ease-expo)] group-hover:scale-105 group-hover:bg-[#54999D] group-focus-visible:shadow-[var(--shadow-focus)]">
            <PlayIcon className="ml-1 h-9 w-9" />
          </span>
        </button>
      )}

      {/* control bar */}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 flex items-center gap-4 border-t border-white/10 bg-[#2C322F]/90 px-4 py-3 transition-all duration-500 ease-[var(--ease-expo)] ${
          controlsVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label={playing ? '暫停' : '播放'}
          onClick={togglePlay}
          className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#62A4A7] text-white transition-colors duration-200 hover:bg-[#54999D] focus-visible:shadow-[var(--shadow-focus)] focus-visible:outline-none"
        >
          {playing ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="ml-0.5 h-5 w-5" />}
        </button>

        <span className="w-[92px] shrink-0 text-sm tabular-nums text-[#F7F6F1]/80" style={{ fontFamily: 'var(--font-noto-serif-tc), serif' }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <div
          role="slider"
          tabIndex={0}
          aria-label="播放進度"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-valuetext={`${formatTime(currentTime)} / ${formatTime(duration)}`}
          onClick={onTrackClick}
          onKeyDown={onTrackKeyDown}
          className="group relative flex h-6 flex-1 cursor-pointer items-center outline-none"
        >
          <div className="relative h-[3px] w-full bg-white/25 transition-all duration-200 group-hover:h-[5px]">
            <div className="h-full bg-[#62A4A7]" style={{ width: `${progress}%` }} />
            <span
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 bg-[#D1E6E7] shadow-[0_0_0_3px_rgba(98,164,167,0.35)] transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:hover)]:opacity-0"
              style={{ left: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
