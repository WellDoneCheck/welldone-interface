'use client';

import { usePageSearchParams } from './usePageSearchParams';
import MapPage from './MapPage';
import LoadNotice from './LoadNotice';
import { useMapView } from './useMapView';
import { resolveMapWell } from '../utils/routeRecords';

// The map page for the map (and well) named in the address (read here in the browser, so the route itself stays static).
// Not keyed by well: selecting a pin rewrites the address, and a fresh page would reset the map's pan and zoom.
export default function MapFromAddress() {
  const searchParams = usePageSearchParams('/map');
  const loaded = useMapView(searchParams.get('record'));
  if (loaded?.status !== 'ready') return <LoadNotice loaded={loaded} />;

  const { task, wells, imagery } = loaded.value;
  const { well, openCardOnArrival, cardOpenAtStart } = resolveMapWell(wells, searchParams.get('well'), searchParams.get('from'));
  return (
    <MapPage
      mapFile={task}
      wells={wells}
      imagery={imagery}
      well={well}
      openCardOnArrival={openCardOnArrival}
      cardOpenAtStart={cardOpenAtStart}
    />
  );
}
