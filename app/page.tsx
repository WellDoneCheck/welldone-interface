import ScrollImageSequence from './components/ScrollImageSequence';

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* ===== Image-sequence scroll hero ===== */}
      <ScrollImageSequence
        totalFrames={229}
        framePattern="/frames/frame_{index}.jpg"
        scrollHeight={400}
        className="h-[400vh]"
      />

      {/* ===== Content sections after the scroll ===== */}
      <section className="relative z-10 bg-black">
        <div className="pointer-events-none absolute inset-x-0 -top-32 h-32 bg-gradient-to-b from-transparent to-black" />

        <div className="mx-auto max-w-6xl px-6 py-32">
          <h2 className="mb-6 text-5xl font-bold tracking-tight">
            Crafted with precision.
          </h2>
          <p className="max-w-2xl text-lg leading-relaxed text-zinc-400">
            Every detail has been considered. From the first frame to the
            last, experience a story told through motion and design.
          </p>
        </div>

        <div className="mx-auto max-w-6xl px-6 pb-32">
          <div className="grid gap-12 md:grid-cols-3">
            {[
              {
                title: 'Seamless',
                desc: 'Scroll-driven transitions that feel natural and fluid.',
              },
              {
                title: 'Immersive',
                desc: 'Full-viewport images that draw you into the experience.',
              },
              {
                title: 'Performant',
                desc: 'Lazy-loaded frames with smart caching for zero jank.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-zinc-800 p-8">

                <p className="text-zinc-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <footer className="border-t border-zinc-900 py-12 text-center text-sm text-zinc-600">
          Freebuff Desktop &mdash; Scroll Demo
        </footer>
      </section>
    </div>
  );
}
