'use client';

import { useSearchParams } from 'next/navigation';
import CheckPage from './CheckPage';
import { resolveCheckRoute } from '../utils/routeRecords';

// The check page for the well named in the address (read here in the browser, so the route itself stays static)
export default function CheckFromAddress() {
  const { record, backHref } = resolveCheckRoute(useSearchParams().get('record'));
  return <CheckPage record={record} backHref={backHref} />;
}
