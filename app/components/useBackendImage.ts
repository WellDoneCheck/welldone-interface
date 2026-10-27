'use client';

import { useEffect, useState } from 'react';
import { fetchFile } from '../utils/api';

// A backend image (e.g. a well's photo) as an address an <img> can show, read with the token's header; null while it
// is read, and when there is none (404) or it could not be read. The address is let go once path changes or the page
// leaves it.
export function useBackendImage(path: string): string | null {
  const [image, setImage] = useState<{ path: string; url: string } | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    let url: string | null = null;
    fetchFile(path, abort.signal).then(
      (blob) => {
        url = URL.createObjectURL(blob);
        setImage({ path, url });
      },
      () => undefined,
    );
    return () => {
      abort.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [path]);

  return image?.path === path ? image.url : null;
}
