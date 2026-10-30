'use client';

import { Suspense, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BottomSheet from './BottomSheet';
import ExportPage from './ExportPage';
import MapFromAddress from './MapFromAddress';
import CheckFromAddress from './CheckFromAddress';
import CompareFromAddress from './CompareFromAddress';
import SurveyMap from './SurveyMap';
import { SheetCover, UnderSheet } from './SharedTransition';
import { CoveredPageSearch } from './usePageSearchParams';
import { coveredPage } from '../utils/exportCover';

// The export page, pulled up from the bottom over another page, which stays in view behind it. Once pulled down again:
// back to the page it was opened from, or (closeTo: loaded with the page behind it, nothing to go back to in the site)
// on to that page.
function Sheet({ closeTo }: { closeTo?: string }) {
  const router = useRouter();
  const close = () => (closeTo ? router.replace(closeTo) : router.back());

  return (
    // one layer on page changes: recedes when a well card flies from it to the check page (globals.css)
    <BottomSheet label="資料匯出" layerName="export-sheet" onClosed={close}>
      <SheetCover>
        {/* it reads its map from the address, which a static page only knows in the browser */}
        <Suspense>
          <ExportPage />
        </Suspense>
      </SheetCover>
    </BottomSheet>
  );
}

// Opened from another page (app/@modal intercepts /export)
export default function ExportSheet() {
  return <Sheet />;
}

// The pages the sheet can be loaded over (utils/exportCover), the map and compare pages on the survey map their route
// group shares
const COVERED_PAGES: Record<string, () => ReactNode> = {
  '/map': () => (
    <SurveyMap>
      <MapFromAddress />
    </SurveyMap>
  ),
  '/check': () => <CheckFromAddress />,
  '/compare': () => (
    <SurveyMap>
      <CompareFromAddress />
    </SurveyMap>
  ),
};

// The export address loaded directly (or reloaded): the sheet over the page it was opened from, as it was
export function ExportOverPage() {
  const { path, search } = coveredPage(useSearchParams());
  return (
    <>
      <CoveredPageSearch value={search}>
        <UnderSheet>{COVERED_PAGES[path]()}</UnderSheet>
      </CoveredPageSearch>
      <Sheet closeTo={search ? `${path}?${search}` : path} />
    </>
  );
}
