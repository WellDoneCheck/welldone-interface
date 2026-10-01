import { useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// The address's search params for the page at `path`, while it is the page at the address. While a sheet from another
// route covers it (the export sheet: the address is then /export, with none of this page's params), the ones it had,
// so the page behind the sheet keeps showing the map or well it showed instead of falling back to its default.
export function usePageSearchParams(path: string): URLSearchParams {
  const pathname = usePathname();
  const current = useSearchParams();
  const [kept, setKept] = useState(() => new URLSearchParams(current.toString()));
  const own = pathname === path;
  if (own && current.toString() !== kept.toString()) setKept(new URLSearchParams(current.toString()));
  return own ? new URLSearchParams(current.toString()) : kept;
}
