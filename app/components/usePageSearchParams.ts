import { createContext, useContext, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// The search of a page loaded under a sheet (the export address reloaded: the page's own are in the sheet's, see
// utils/exportCover), for it to start with in place of the address's
export const CoveredPageSearch = createContext<string | null>(null);

// The address's search params for the page at `path`, while it is the page at the address. While a sheet from another
// route covers it (the export sheet: the address is then /export, with none of this page's params), the ones it had,
// so the page behind the sheet keeps showing the map or well it showed instead of falling back to its default.
export function usePageSearchParams(path: string): URLSearchParams {
  const pathname = usePathname();
  const current = useSearchParams();
  const covered = useContext(CoveredPageSearch);
  const [kept, setKept] = useState(() => new URLSearchParams(covered ?? current.toString()));
  const own = pathname === path;
  if (own && current.toString() !== kept.toString()) setKept(new URLSearchParams(current.toString()));
  return own ? new URLSearchParams(current.toString()) : kept;
}
