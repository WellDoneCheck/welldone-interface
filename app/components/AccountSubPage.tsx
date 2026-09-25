import type { ReactNode } from 'react';

interface AccountSubPageProps {
  title: string;
  description: string;
  // Content width in Figma px; kept at Figma's proportion of the panel
  width: number;
  // Shown at the right end of the title row
  action?: ReactNode;
  children: ReactNode;
}

export const SERIF_FONT = { fontFamily: 'var(--font-noto-serif-tc), serif' };

export default function AccountSubPage({ title, description, width, action, children }: AccountSubPageProps) {
  return (
    <div
      className="flex w-full flex-col font-black"
      style={{ ...SERIF_FONT, maxWidth: `calc(${width}px * var(--col))` }}
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="fs-50 leading-[55px] text-black">{title}</h2>
          <p className="mt-[23px] fs-20 leading-[23px] text-black/50">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
