'use client';

import { usePageSearchParams } from './usePageSearchParams';
import ComparePage from './ComparePage';
import LoadNotice from './LoadNotice';
import { useMapView } from './useMapView';

// The compare page for the map named in the address (read here in the browser, so the route itself stays static)
export default function CompareFromAddress() {
  const loaded = useMapView(usePageSearchParams('/compare').get('record'));
  if (loaded?.status !== 'ready') return <LoadNotice loaded={loaded} />;
  return <ComparePage mapRecord={loaded.value.task} wells={loaded.value.wells} imagery={loaded.value.imagery} />;
}
