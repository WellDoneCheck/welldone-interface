import Image from 'next/image';
import type { ReactNode } from 'react';

// The aerial photo (1958×1102) shared by the map and compare pages, so both show the same map at the same spot.
// Static stand-in for the map: the titiler tile layer will replace the image.
export const MAP_IMAGE = { width: 1958, height: 1102 };

// Covers the window from its top-left corner (keep --map-image-width in globals.css in step); children are laid out
// over the photo, e.g. pins positioned in % of it
export default function MapPhoto({ children }: { children?: ReactNode }) {
  return (
    <div className="absolute left-0 top-0 aspect-[1958/1102] w-[max(100vw,calc(100dvh*1958/1102))]">
      <Image src="/aerial-bg.png" alt="" fill priority sizes="100vw" className="object-cover" />
      {children}
    </div>
  );
}

// Darkens the photo towards the right edge
export function MapShade() {
  return (
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_left,rgba(3,3,3,0.4)_11.058%,rgba(35,35,35,0.28)_30.288%,rgba(255,255,255,0)_100%)]" />
  );
}
