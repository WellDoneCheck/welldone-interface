import { ViewTransition, type CSSProperties, type ReactNode, type ViewTransitionProps } from 'react';

// Elements shown on both the map card and the check page. Wrapped in a view transition with the same name on
// both pages, they move and resize from one page's place to the other's when navigating, instead of cutting.
// A name may only be on screen once, so a second copy of an element (e.g. the card's back face) passes enabled={false}.
// While moving they are drawn above everything but the navbar: globals.css lists these names, keep it in step.
export const SHARED = {
  wellPhoto: 'well-photo',
  wellId: 'well-id',
  wellCoordinates: 'well-coordinates',
  wellTime: 'well-time',
  exportEntry: 'export-entry',
  // the map's comparison shortcut grows into the compare page's panel (and shrinks back into it)
  compareArea: 'compare-area',
  // the home page's start button grows into the upload page's upload panel
  startUpload: 'start-upload',
  pageBackground: 'page-background',
} as const;

// Page parts with no counterpart on the other page (card, shortcuts, buttons, film strip…) get a fixed transition name
// of their own, so each is its own layer above the background (instead of inside the page snapshot, hidden under the
// background's zoom until it ends) and fades out, then in (animations for the page-part class in globals.css).
// A React <ViewTransition> would not do here: its enter/exit only fire when it sits outside the page's DOM.
// (an inline style: Tailwind cannot see class names built at runtime)
export function pagePart(name: string): CSSProperties {
  return { viewTransitionName: name, viewTransitionClass: 'page-part' } as CSSProperties;
}

// Navigation directions between the map and the check page, passed as a Link's transitionTypes
export const TO_CHECK = ['to-check'];
export const TO_MAP = ['to-map'];
// Home page's "start" button into the upload page: only this way does the button grow into the upload panel;
// going back home the panel just fades out with the page
export const TO_UPLOAD = ['to-upload'];
export const ONLY_TO_UPLOAD = { 'to-upload': 'auto', default: 'none' } as const;
// Opening the export sheet: no page transition at all, so the sheet slides up over the page as it is. Every
// <ViewTransition> here resolves to 'none' for this type, so React does not start a view transition.
// (A CSS :active-view-transition-type() rule would be simpler, but Next's CSS compiler rejects that selector.)
export const OPEN_SHEET = ['export-sheet'];
const NONE_FOR_SHEET = { 'export-sheet': 'none', default: 'auto' } as const;

// Wraps a page with nothing of its own to animate (the home page), so leaving it or coming back to it still starts a view
// transition that cross-fades the pages. Without it, going from the home page to one whose parts only appear (map, check)
// started no transition at all. (Not around every page: the export sheet would then cross-fade the page under it.)
export function PageTransition({ children }: { children: ReactNode }) {
  return <ViewTransition default={NONE_FOR_SHEET}>{children}</ViewTransition>;
}

// The map and check page backgrounds: going to the check page the map zooms in on the well's pin while the close-up
// takes over, and coming back the map zooms out from the pin (animations in globals.css); otherwise they cross-fade
export function PageBackgroundTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      name={SHARED.pageBackground}
      default={NONE_FOR_SHEET}
      share={{ 'to-check': 'zoom-to-well', 'to-map': 'zoom-from-well', 'export-sheet': 'none', default: 'auto' }}
    >
      {children}
    </ViewTransition>
  );
}

interface SharedTransitionProps {
  name: string;
  enabled?: boolean;
  // when the pair moves between the pages, by transition type (moves every time by default)
  share?: ViewTransitionProps['share'];
  children: ReactNode;
}

export default function SharedTransition({ name, enabled = true, share, children }: SharedTransitionProps) {
  return enabled ? (
    <ViewTransition name={name} default={NONE_FOR_SHEET} share={share}>
      {children}
    </ViewTransition>
  ) : (
    children
  );
}
