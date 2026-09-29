// Loading animation: ripples spreading from the well (the logo's teal square) over a faint crosshair, the SkyWell
// wordmark and a label with bouncing dots; with a progress value, a thin bar and percentage too.
// Keyframes (well-ripple, well-core, well-dot) are in globals.css.

const RIPPLES = [0, 0.8, 1.6];
const DOTS = [0, 0.18, 0.36];

export default function WellLoader({ label = '載入中', progress }: { label?: string; progress?: number }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center" style={{ fontFamily: 'var(--font-noto-serif-tc), serif' }}>
      <div className="relative h-[200px] w-[200px]" aria-hidden>
        <span className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <span className="absolute inset-y-0 left-1/2 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent" />
        {RIPPLES.map((delay) => (
          <span
            key={delay}
            className="absolute inset-0 rounded-full border-2 border-[#62A4A7] opacity-0 animate-[well-ripple_2.4s_cubic-bezier(0.22,1,0.36,1)_infinite] motion-reduce:scale-50 motion-reduce:animate-none motion-reduce:opacity-60"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
        <span className="absolute left-1/2 top-1/2 h-[28px] w-[28px] -translate-x-1/2 -translate-y-1/2 rounded-[6px] bg-[#62A4A7] shadow-[0_0_28px_rgba(98,164,167,0.65)] animate-[well-core_2.4s_ease-in-out_infinite] motion-reduce:animate-none" />
      </div>

      <p className="mt-4 text-3xl font-bold tracking-wide text-white">
        <span className="text-[#62A4A7]">Sky</span>Well
      </p>
      <p className="mt-2 flex items-baseline gap-[3px] text-base font-bold tracking-[0.3em] text-white/60">
        {label}
        {DOTS.map((delay) => (
          <span key={delay} className="inline-block animate-[well-dot_1.2s_ease-in-out_infinite] motion-reduce:animate-none" style={{ animationDelay: `${delay}s` }}>
            .
          </span>
        ))}
      </p>

      {progress !== undefined && (
        <div className="mt-5 flex flex-col items-center gap-2">
          <div className="h-[3px] w-64 overflow-hidden bg-white/15">
            <div className="h-full bg-[#62A4A7] transition-[width] duration-300 ease-out" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs font-bold tabular-nums tracking-widest text-white/45">{Math.round(progress)}%</span>
        </div>
      )}
    </div>
  );
}
