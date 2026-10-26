import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  ViewTransition,
  type CSSProperties,
  type ReactNode,
  type ViewTransitionProps,
} from 'react';

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
  // the home page's big recognition accuracy flies into the monitor page's accuracy card
  recognitionAccuracy: 'recognition-accuracy',
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
// From a well card on the export page to the check page: its photo, id, coordinates and time fly to their places there
// (the export-card class, animations in globals.css); pass FROM_EXPORT_SHARE as `share` on both ends of each pair
export const FROM_EXPORT = ['from-export'];
export const FROM_EXPORT_SHARE = { 'from-export': 'export-card', 'export-sheet': 'none', default: 'auto' } as const;
// Home page's "start" button into the upload page: only this way does the button grow into the upload panel;
// going back home the panel just fades out with the page
export const TO_UPLOAD = ['to-upload'];
export const ONLY_TO_UPLOAD = { 'to-upload': 'auto', default: 'none' } as const;
// A map record on the upload page opening the map page: its row grows into the map, and the map page's link back
// shrinks the map into that row again. The row and the map share a name per record, paired only these two ways
// (the upload-record class in globals.css); pass UPLOAD_RECORD_SHARE as `share` on both ends.
export const OPEN_MAP = ['open-map'];
export const BACK_TO_UPLOAD = ['back-to-upload'];
export const UPLOAD_RECORD_SHARE = { 'open-map': 'upload-record', 'back-to-upload': 'upload-record', default: 'none' } as const;
export function uploadRecordName(recordId: string): string {
  return `upload-record-${recordId}`;
}
// Set by the map page's link back just before it goes, read by the upload page as it arrives: its record list then
// fades in where it is instead of sliding in, so the rows around the one the map shrinks into are already in place
let backToUpload = false;
export function markBackToUpload(): void {
  backToUpload = true;
}
export function isBackToUpload(): boolean {
  return backToUpload;
}
export function clearBackToUpload(): void {
  backToUpload = false;
}
// Set by an upload record's link into the map page just before it goes, read by the map page as it arrives: its map
// then starts once the row has grown into it, so the work of starting it stays out of the transition's frames
let openingMap = false;
export function markOpeningMap(): void {
  openingMap = true;
}
export function isOpeningMap(): boolean {
  return openingMap;
}
export function clearOpeningMap(): void {
  openingMap = false;
}
// Home page's photo wall into the monitor page: its recognition accuracy flies into the accuracy card, fading like a
// well card from the export page (the export-card class in globals.css); other ways to the monitor page leave it be
export const TO_MONITOR = ['to-monitor'];
export const ONLY_TO_MONITOR = { 'to-monitor': 'export-card', default: 'none' } as const;
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

// The export page: recedes while a well card flies from it to the check page (export-page-out in globals.css); no
// transition of its own otherwise, so opening and closing the sheet still start none. (As a sheet it is not removed but
// hidden when the page changes, so this never runs there: the sheet recedes by the name on its own layer instead.)
export function ExportPageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="none" update="none" exit={{ 'from-export': 'export-page-out', default: 'none' }}>
      {children}
    </ViewTransition>
  );
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

/* ─── The export sheet covering a page ─────────────────────────── */

// The export sheet opens over the page it was opened from. While it is open, that page's shared elements drop their names,
// so a well card in the sheet can take them and move its photo and id to the check page (a name may be on screen only
// once). Elements inside the sheet, and those of the page that replaces the covered one, keep theirs.
// In development React may still report the names as duplicates the first time: it keeps a name registered until the
// component is removed, even once the name is dropped. Nothing is duplicated on screen, and production has no such check.
let openSheet: number | null = null;
let sheetCount = 0;
const sheetListeners = new Set<() => void>();

function subscribeToSheet(listener: () => void): () => void {
  sheetListeners.add(listener);
  return () => sheetListeners.delete(listener);
}

const InSheetContext = createContext(false);

// Wraps the export sheet's content: marks the page under it as covered for as long as the sheet is mounted
export function SheetCover({ children }: { children: ReactNode }) {
  useEffect(() => {
    openSheet = ++sheetCount;
    sheetListeners.forEach((listener) => listener());
    return () => {
      openSheet = null;
      sheetListeners.forEach((listener) => listener());
    };
  }, []);
  return <InSheetContext value>{children}</InSheetContext>;
}

// True for an element of the page under the open sheet: it was on screen before the sheet opened and is not in the sheet
function useCoveredBySheet(): boolean {
  const inSheet = useContext(InSheetContext);
  const sheet = useSyncExternalStore(subscribeToSheet, () => openSheet, () => null);
  const [sheetAtMount] = useState(() => openSheet);
  return sheet !== null && !inSheet && sheetAtMount !== sheet;
}

interface SharedTransitionProps {
  name: string;
  enabled?: boolean;
  // when the pair moves between the pages, by transition type (moves every time by default)
  share?: ViewTransitionProps['share'];
  children: ReactNode;
}

export default function SharedTransition({ name, enabled = true, share, children }: SharedTransitionProps) {
  const covered = useCoveredBySheet();
  if (!enabled) return children;
  // covered by the export sheet: still a ViewTransition (so the page under the sheet does not remount and lose its
  // state), but without a name of its own and sitting transitions out
  return (
    <ViewTransition name={covered ? undefined : name} default={covered ? 'none' : NONE_FOR_SHEET} share={covered ? 'none' : share}>
      {children}
    </ViewTransition>
  );
}
