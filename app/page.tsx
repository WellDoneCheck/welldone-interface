import ScrollImageSequence from './components/ScrollImageSequence';
import FloatingGrid from './components/FloatingGrid';

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* ===== Image-sequence scroll hero ===== */}
      <ScrollImageSequence
        totalFrames={229}
        framePattern="/landing_page/map_frames/frame_{index}.jpg"
        scrollHeight={400}
        className="h-[400vh]"
      />

      {/* ===== Content sections after the scroll ===== */}
      <section className="relative z-10 bg-black">
        <div className="pointer-events-none absolute inset-x-0 -top-32 h-32 bg-gradient-to-b from-transparent to-black" />

        <FloatingGrid />

        <footer className="border-t border-zinc-900 py-12 text-center text-sm text-zinc-600">
          Freebuff Desktop &mdash; Scroll Demo
        </footer>
      </section>
    </div>
  );
}
