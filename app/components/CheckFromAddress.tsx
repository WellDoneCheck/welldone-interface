'use client';

import { usePageSearchParams } from './usePageSearchParams';
import CheckPage from './CheckPage';
import LoadNotice from './LoadNotice';
import { useSiteChrome } from './SiteChrome';
import { useBackend } from './useBackend';
import { loadCheckView } from '../utils/routeRecords';

// The check page for the well named in the address (read here in the browser, so the route itself stays static).
// Keyed by well like the map page: another well is a fresh page, whose shared elements can take over from where they
// were (e.g. a well card in the export sheet that covered this page)
export default function CheckFromAddress() {
  const code = usePageSearchParams('/check').get('record');
  const { session } = useSiteChrome();
  const loaded = useBackend(session ? `check:${session.userId}:${code ?? ''}` : null, () => loadCheckView(code));
  if (!session || loaded.status !== 'ready') return <LoadNotice loaded={session ? loaded : null} />;
  return <CheckPage key={loaded.value.well.id} view={loaded.value} />;
}
