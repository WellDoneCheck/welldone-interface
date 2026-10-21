'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import BottomSheet from './BottomSheet';
import ExportPage from './ExportPage';
import { SheetCover } from './SharedTransition';

// The export page opened from another page: pulled up from the bottom over that page, which stays in view behind it,
// and back to that page once it has been pulled down again
export default function ExportSheet() {
  const router = useRouter();

  return (
    // one layer on page changes: recedes when a well card flies from it to the check page (globals.css)
    <BottomSheet label="資料匯出" layerName="export-sheet" onClosed={() => router.back()}>
      <SheetCover>
        {/* it reads its map from the address, which a static page only knows in the browser */}
        <Suspense>
          <ExportPage inSheet />
        </Suspense>
      </SheetCover>
    </BottomSheet>
  );
}
