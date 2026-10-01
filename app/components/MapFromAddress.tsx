'use client';

import { useSearchParams } from 'next/navigation';
import MapPage from './MapPage';
import { resolveMapRoute } from '../utils/routeRecords';

// The map page for the map (and well) named in the address (read here in the browser, so the route itself stays static).
// Not keyed by well: selecting a pin rewrites the address, and a fresh page would reset the map's pan and zoom.
export default function MapFromAddress() {
  const searchParams = useSearchParams();
  const { record, wells, well, openCardOnArrival, cardOpenAtStart } = resolveMapRoute(
    searchParams.get('record'),
    searchParams.get('well'),
    searchParams.get('from'),
  );

  return (
    <MapPage
      mapFile={record}
      wells={wells}
      well={well}
      openCardOnArrival={openCardOnArrival}
      cardOpenAtStart={cardOpenAtStart}
    />
  );
}
