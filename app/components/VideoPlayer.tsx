'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

interface VideoPlayerProps {
  src: string;
  className?: string;
}

export default function VideoPlayer({ src, className = '' }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Track progress
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    return () => video.removeEventListener('timeupdate', onTimeUpdate);
  }, []);

  // Auto-hide controls after 4s
  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 4000);
  }, []);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    scheduleHide();
  }, [scheduleHide]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    setShowControls(true);
    scheduleHide();
  }, [scheduleHide]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setShowControls(false);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }, []);

  const handleVideoClick = useCallback(() => {
    togglePlay();
  }, [togglePlay]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={src}
        className="h-full w-full object-cover"
        preload="none"
        loop
        muted
        playsInline
        onClick={handleVideoClick}
      />

      {/* Subtle dark overlay on hover */}
      <div
        className={`absolute inset-0 bg-black/20 transition-opacity duration-500 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleVideoClick}
      />

      {/* Big play/pause icon when paused - centered */}
      {!playing && (
        <div
          className="absolute inset-0 flex items-center justify-center z-10"
          onClick={handleVideoClick}
        >
          <div className="w-20 h-20 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center transition-all duration-300 hover:scale-110 hover:bg-black/50 shadow-2xl">
            <svg
              className="w-8 h-8 text-white ml-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* Bottom controls bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 transition-all duration-500 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        
        <div className="relative px-6 pb-5 pt-12">
          {/* Progress bar */}
          <div 
            className="w-full h-1 bg-white/20 rounded-full overflow-hidden mb-3 cursor-pointer group"
            onClick={(e) => {
              const video = videoRef.current;
              if (!video) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              video.currentTime = pct * video.duration;
            }}
          >
            <div
              className="h-full bg-gradient-to-r from-white/80 to-white rounded-full transition-all duration-100 group-hover:h-1.5"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Play/Pause button */}
              <button
                onClick={togglePlay}
                className="text-white/90 hover:text-white transition-all duration-200 hover:scale-110"
              >
                {playing ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Status text */}
              <span className="text-white/50 text-sm font-medium">
                {playing ? '播放中' : '已暫停'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
