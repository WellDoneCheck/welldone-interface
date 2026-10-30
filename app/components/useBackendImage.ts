'use client';

import { useEffect, useState } from 'react';
import { holdFile } from '../utils/sharedFile';

// A backend image (e.g. a well's photo) as an address an <img> can show, read with the token's header; null while it
// is read, and when there is none (404) or it could not be read. Read once for every part of the page showing it
// (holdFile), and let go once path changes or the page leaves it.
export function useBackendImage(path: string): string | null {
  const [image, setImage] = useState<{ path: string; url: string } | null>(null);

  useEffect(() => {
    const file = holdFile(path);
    let held = true;
    file.url.then(
      (url) => held && setImage({ path, url }),
      () => undefined,
    );
    return () => {
      held = false;
      file.release();
    };
  }, [path]);

  return image?.path === path ? image.url : null;
}
