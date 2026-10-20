'use client';

import { usePageSearchParams } from './usePageSearchParams';
import ComparePage from './ComparePage';
import { findRecord } from '../data/mapRecords';

// The compare page for the map named in the address (read here in the browser, so the route itself stays static)
export default function CompareFromAddress() {
  return <ComparePage mapRecord={findRecord(usePageSearchParams('/compare').get('record') ?? undefined)} />;
}
