const SERIF = { fontFamily: 'var(--font-noto-serif-tc), serif' };

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#2C322F] px-8 py-10 text-[#F7F6F1] md:px-20" style={SERIF}>
      <div className="mx-auto flex max-w-[1120px] flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <span className="h-6 w-6 bg-[#62A4A7]" aria-hidden />
          <span className="text-2xl font-bold">
            <span className="text-[#62A4A7]">Sky</span>Well
          </span>
        </div>
        <p className="text-sm tracking-[0.2em] text-[#F7F6F1]/60">AI 水井辨識系統</p>
        <p className="text-xs text-[#F7F6F1]/40">© 2026 SkyWell</p>
      </div>
    </footer>
  );
}
