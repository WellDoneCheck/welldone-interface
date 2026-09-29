import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export type StatusKind = 'not-found' | 'unauthorized' | 'forbidden' | 'error';

// Per status: the code shown, its accent colour and the symbol at the centre of the radar
const STATUS_STYLES: Record<StatusKind, { accent: string; soft: string; symbol: ReactNode }> = {
  'not-found': {
    accent: '#62A4A7',
    soft: 'rgba(98,164,167,0.18)',
    // map pin drawn dashed, with a question mark: the well that is not there
    symbol: (
      <>
        <path d="M60 22c-14 0-25 11-25 25 0 19 25 45 25 45s25-26 25-45c0-14-11-25-25-25Z" strokeDasharray="6 5" />
        <path d="M53 42a7 7 0 1 1 10 6c-2 1-3 3-3 5v2" />
        <circle cx="60" cy="63" r="1.6" fill="currentColor" />
      </>
    ),
  },
  unauthorized: {
    accent: '#D9A441',
    soft: 'rgba(217,164,65,0.18)',
    symbol: (
      <>
        <rect x="40" y="52" width="40" height="32" />
        <path d="M47 52V42a13 13 0 0 1 26 0v10" />
        <path d="M60 64v8" />
      </>
    ),
  },
  forbidden: {
    accent: '#BC5646',
    soft: 'rgba(188,86,70,0.2)',
    symbol: (
      <>
        <circle cx="60" cy="60" r="24" />
        <path d="M43 77 77 43" />
      </>
    ),
  },
  error: {
    accent: '#BC5646',
    soft: 'rgba(188,86,70,0.2)',
    symbol: (
      <>
        <path d="M60 34 86 82H34Z" />
        <path d="M60 52v14" />
        <circle cx="60" cy="74" r="1.6" fill="currentColor" />
      </>
    ),
  },
};

// Radar over the aerial photo searching for a well, with the status symbol at its centre
function Radar({ kind }: { kind: StatusKind }) {
  const { accent, soft, symbol } = STATUS_STYLES[kind];
  return (
    <div aria-hidden className="pointer-events-none absolute right-[8vw] top-1/2 hidden aspect-square w-[min(38vw,560px)] -translate-y-1/2 lg:block">
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full" fill="none">
        <circle cx="200" cy="200" r="196" stroke="white" strokeOpacity="0.14" />
        <circle cx="200" cy="200" r="140" stroke="white" strokeOpacity="0.2" strokeDasharray="4 8" />
        <circle cx="200" cy="200" r="84" fill={soft} stroke={accent} strokeOpacity="0.8" />
        <path d="M200 0v140M200 260v140M0 200h140M260 200h140" stroke="white" strokeOpacity="0.22" />
      </svg>
      {/* sweep turning around the centre */}
      <div
        className="absolute inset-0 animate-[spin_7s_linear_infinite] rounded-full motion-reduce:animate-none"
        style={{ background: `conic-gradient(from 0deg, ${accent}55 0deg, transparent 70deg, transparent 360deg)` }}
      />
      <svg viewBox="0 0 120 120" className="absolute left-1/2 top-1/2 h-[26%] w-[26%] -translate-x-1/2 -translate-y-1/2" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ color: accent }}>
        {symbol}
      </svg>
    </div>
  );
}

interface StatusPageProps {
  kind: StatusKind;
  code: string;
  title: string;
  description: ReactNode;
  // buttons and links under the description
  actions: ReactNode;
  // small print under the actions, e.g. an error reference
  footnote?: ReactNode;
}

// Full-screen status page (404, 401, 403, errors): the aerial photo dimmed from the left, the message lined up with
// the navbar's left edge, and a radar on the right
export default function StatusPage({ kind, code, title, description, actions, footnote }: StatusPageProps) {
  const { accent } = STATUS_STYLES[kind];
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#2C322F] text-[#F7F6F1]" style={{ fontFamily: 'var(--font-noto-serif-tc), serif' }}>
      <Image src="/aerial-bg.png" alt="" fill priority sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(24,28,26,0.92)_0%,rgba(24,28,26,0.72)_45%,rgba(24,28,26,0.35)_100%)]" />

      <Radar kind={kind} />

      <div className="relative flex min-h-screen flex-col justify-center px-6 pb-16 pt-[144px] md:px-[112px]">
        <p className="flex items-center gap-4 text-sm font-bold tracking-[0.35em]" style={{ color: accent }}>
          <span className="h-px w-10" style={{ background: accent }} />
          ERROR {code}
        </p>
        <p className="mt-2 text-[clamp(112px,15vw,220px)] font-black leading-[0.9] tracking-tight">{code}</p>
        <h1 className="mt-6 text-[clamp(30px,3.2vw,48px)] font-black leading-tight">{title}</h1>
        <div className="mt-4 max-w-[560px] text-[clamp(16px,1.25vw,20px)] leading-[1.8] text-[#F7F6F1]/75">{description}</div>
        <div className="mt-10 flex flex-wrap items-center gap-4">{actions}</div>
        {footnote && <div className="mt-8 text-sm text-[#F7F6F1]/45">{footnote}</div>}
      </div>
    </main>
  );
}

const BUTTON = 'inline-flex h-[56px] items-center gap-3 px-7 text-lg font-bold transition-all duration-300 ease-[var(--ease-expo)]';
export const PRIMARY_BUTTON = `${BUTTON} bg-[#62A4A7] text-white hover:bg-[#54999D] hover:shadow-[var(--shadow-brand-glow)]`;
export const SECONDARY_BUTTON = `${BUTTON} border-2 border-[#F7F6F1]/60 text-[#F7F6F1] hover:border-[#F7F6F1] hover:bg-[#F7F6F1]/10`;

export function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={PRIMARY_BUTTON}>
      {children}
    </Link>
  );
}

export function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={SECONDARY_BUTTON}>
      {children}
    </Link>
  );
}
