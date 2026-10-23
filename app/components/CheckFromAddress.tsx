'use client';

import { usePageSearchParams } from './usePageSearchParams';
import CheckPage from './CheckPage';
import LoadNotice from './LoadNotice';
import { useCheckView } from './useCheckView';

// The check page for the well named in the address (read here in the browser, so the route itself stays static).
// Keyed by well like the map page: another well is a fresh page, whose shared elements can take over from where they
// were (e.g. a well card in the export sheet that covered this page)
export default function CheckFromAddress() {
  const code = usePageSearchParams('/check').get('record');
  const loaded = useCheckView(code);
  if (loaded?.status !== 'ready') return <LoadNotice loaded={loaded} />;
  return <CheckPage key={loaded.value.well.id} view={loaded.value} />;
}
