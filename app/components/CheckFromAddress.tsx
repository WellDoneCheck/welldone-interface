'use client';

import { useSearchParams } from 'next/navigation';
import CheckPage from './CheckPage';
import { resolveCheckRoute } from '../utils/routeRecords';

// The check page for the well named in the address (read here in the browser, so the route itself stays static).
// Keyed by well like the map page: another well is a fresh page, whose shared elements can take over from where they
// were (e.g. a well card in the export sheet that covered this page)
export default function CheckFromAddress() {
  const { record, backHref } = resolveCheckRoute(useSearchParams().get('record'));
  return <CheckPage key={record.id} record={record} backHref={backHref} />;
}
