'use client';

import { useSearchParams } from 'next/navigation';
import MapPage from './MapPage';
import { MAP_RECORDS } from '../data/mapRecords';
import { resolveMapRoute } from '../utils/routeRecords';

// The map page for the well named in the address (read here in the browser, so the route itself stays static)
export default function MapFromAddress() {
  const searchParams = useSearchParams();
  const { record, openCardOnArrival, cardOpenAtStart } = resolveMapRoute(searchParams.get('record'), searchParams.get('from'));

  return (
    <MapPage
      key={record.id}
      records={MAP_RECORDS}
      record={record}
      openCardOnArrival={openCardOnArrival}
      cardOpenAtStart={cardOpenAtStart}
    />
  );
}
