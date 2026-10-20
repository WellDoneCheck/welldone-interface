import VideoPlayer from './VideoPlayer';

const SERIF = { fontFamily: 'var(--font-noto-serif-tc), serif' };

// Teal corner brackets around the frame, like the upload drop zone
const CORNERS = [
  '-left-3 -top-3 border-l-2 border-t-2',
  '-right-3 -top-3 border-r-2 border-t-2',
  '-bottom-3 -left-3 border-b-2 border-l-2',
  '-bottom-3 -right-3 border-b-2 border-r-2',
];

// Editorial video page: a small kicker over a large framed player with its caption on the print's lower edge
export default function VideoShowcase() {
  // Width follows the viewport height so everything fits one screen: 16:9 video plus ~240px of chrome
  // (navbar clearance, kicker, frame padding and caption, bottom padding)
  return (
    <div className="mx-auto w-full max-w-[clamp(720px,calc((100vh-240px)*16/9+24px),1760px)]" style={SERIF}>
      <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-[#3F7A7E]">Video · 影像導覽</p>

      <figure className="relative border border-[#E5E2D9] bg-white p-3 shadow-[var(--shadow-card)]">
        <VideoPlayer src="/second_fin.mp4" className="aspect-video w-full" />
        <figcaption className="flex items-center gap-4 px-1 pb-1 pt-3 text-sm">
          <span className="font-bold tracking-wide text-[#2C322F]">Setup by SkyWell</span>
          <span className="h-px flex-1 bg-[#E5E2D9]" />
        </figcaption>
        {CORNERS.map((position) => (
          <span key={position} className={`pointer-events-none absolute h-8 w-8 border-[#3F7A7E] ${position}`} />
        ))}
      </figure>
    </div>
  );
}
