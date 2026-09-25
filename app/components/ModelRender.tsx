'use client';

import type { KeyboardEvent } from 'react';
import Image from 'next/image';
import { useFakeRender, type RenderStatus } from './useFakeRender';

const RENDER_DURATION_MS = 3000;

// Placeholder result until the real 3D model is generated
const FAKE_RESULT = { faces: '128,406', vertices: '64,231', seconds: (RENDER_DURATION_MS / 1000).toFixed(1) };

const CUBE_OUTLINE = 'M320 130 L424 190 L424 310 L320 370 L216 310 L216 190 Z';
const CUBE_EDGES = ['M216 190 L320 250', 'M424 190 L320 250', 'M320 250 L320 370'];
const TOP_FACE = 'M320 130 L424 190 L320 250 L216 190 Z';
const LEFT_FACE = 'M216 190 L320 250 L320 370 L216 310 Z';
const RIGHT_FACE = 'M320 250 L424 190 L424 310 L320 370 Z';

const COPY: Record<RenderStatus, { title: string; hint: string }> = {
  idle: { title: '點擊生成立體模型', hint: '依空拍影像重建・約需 3 秒' },
  rendering: { title: '生成中', hint: '正在重建網格與貼圖…' },
  done: { title: '', hint: '' },
};

/* ─── Wireframe cube (the "render shape") ───────────────────────── */

function CubeShape({ status, progress }: { status: RenderStatus; progress: number }) {
  const rendering = status === 'rendering';
  const stroke = 'stroke-[#62A4A7]';
  const lineClass = rendering
    ? `${stroke} animate-[drawStroke_1.4s_ease-in-out_infinite] motion-reduce:animate-none`
    : stroke;

  return (
    <svg viewBox="0 0 640 500" className="h-full w-full" fill="none" aria-hidden>
      <g className={rendering ? '' : 'animate-[floatY_3.2s_ease-in-out_infinite] motion-reduce:animate-none'}>
        {/* faces fill in as the render progresses */}
        <path d={TOP_FACE} fill="#62A4A7" fillOpacity={rendering ? progress * 0.25 : 0.06} />
        <path d={LEFT_FACE} fill="#62A4A7" fillOpacity={rendering ? progress * 0.45 : 0.1} />
        <path d={RIGHT_FACE} fill="#3F7A7E" fillOpacity={rendering ? progress * 0.55 : 0.14} />
        {[CUBE_OUTLINE, ...CUBE_EDGES].map((d) => (
          <path
            key={d}
            d={d}
            pathLength={1}
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={rendering ? 1 : '0.035 0.03'}
            className={lineClass}
          />
        ))}
      </g>
    </svg>
  );
}

/* ─── Result (fake data) ────────────────────────────────────────── */

function RenderResult({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden={!visible}
      className={`absolute inset-0 transition-[clip-path] duration-[900ms] ease-[var(--ease-expo)] motion-reduce:transition-none ${
        visible ? '[clip-path:inset(0_0_0_0)]' : '[clip-path:inset(0_0_100%_0)]'
      }`}
    >
      <div className="absolute inset-0 overflow-hidden">
        <Image src="/map/ground-photo.png" alt="立體模型（示意）" width={1137} height={640} className="h-full w-[177.68%] max-w-none" />
      </div>
      {/* mesh overlay: reads as a textured 3D model */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-25 mix-blend-overlay" aria-hidden>
        <defs>
          <pattern id="mesh" width="48" height="27.7" patternUnits="userSpaceOnUse">
            <path d="M0 27.7 L24 13.85 L48 27.7 M24 13.85 L24 0 M0 0 L24 13.85 L48 0" stroke="white" strokeWidth="1" fill="none" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#mesh)" />
      </svg>
      <span className="absolute left-4 top-4 bg-[#2C322F]/80 px-3 py-1 text-[16px] font-bold tracking-widest text-[#F7F6F1]">
        3D・示意渲染
      </span>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-5 pb-4 pt-10 text-[16px] font-normal text-white/90">
        <span>
          面數 {FAKE_RESULT.faces}　頂點 {FAKE_RESULT.vertices}　耗時 {FAKE_RESULT.seconds}s
        </span>
        <span className="text-white/60">點擊重新生成</span>
      </div>
    </div>
  );
}

/* ─── Panel ─────────────────────────────────────────────────────── */

// The whole area is the trigger — a render placeholder, not a button.
// Click to generate; fake data for now.
export default function ModelRender() {
  const { status, progress, start } = useFakeRender(RENDER_DURATION_MS);
  const percent = Math.round(progress * 100);
  const copy = COPY[status];

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      start();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-busy={status === 'rendering'}
      aria-label={status === 'rendering' ? `立體模型生成中 ${percent}%` : status === 'done' ? '重新生成立體模型' : '生成立體模型'}
      onClick={start}
      onKeyDown={onKeyDown}
      className="group relative left-1 top-1.5 h-[640px] w-[640px] cursor-pointer select-none overflow-hidden bg-[#EFEDE6] outline-none focus-visible:shadow-[inset_0_0_0_3px_#62A4A7]"
    >
      {/* faint floor grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(98,164,167,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(98,164,167,0.12)_1px,transparent_1px)] bg-[size:40px_40px]" />

      {/* corner brackets, like the upload drop zone */}
      {['left-4 top-4 border-l-2 border-t-2', 'right-4 top-4 border-r-2 border-t-2', 'bottom-4 left-4 border-b-2 border-l-2', 'bottom-4 right-4 border-b-2 border-r-2'].map((position) => (
        <span
          key={position}
          className={`absolute h-8 w-8 border-[#3F7A7E] transition-transform duration-300 ease-[var(--ease-expo)] group-hover:scale-125 ${position}`}
        />
      ))}

      <div className="absolute inset-x-0 top-12 h-[420px] transition-transform duration-500 ease-[var(--ease-expo)] group-hover:scale-105">
        <CubeShape status={status} progress={progress} />
      </div>

      {status === 'rendering' && (
        <span className="pointer-events-none absolute inset-x-0 h-0.5 animate-[scanDown_1.6s_linear_infinite] bg-[#62A4A7] shadow-[0_0_16px_4px_rgba(98,164,167,0.6)] motion-reduce:hidden" />
      )}

      <div className="absolute inset-x-0 bottom-16 flex flex-col items-center gap-2 text-center">
        <p className="text-[32px] font-black leading-none text-[#2C322F]">
          {copy.title}
          {status === 'rendering' && <span className="ml-3 text-[#3F7A7E]">{percent}%</span>}
        </p>
        <p className="text-[18px] font-normal text-[#6F7468]">{copy.hint}</p>
        {status === 'rendering' && (
          <div className="mt-2 h-1 w-64 bg-[#D1E6E7]">
            <div className="h-full bg-[#62A4A7]" style={{ width: `${percent}%` }} />
          </div>
        )}
      </div>

      <RenderResult visible={status === 'done'} />
    </div>
  );
}
