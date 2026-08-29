'use client';

import { useEffect } from 'react';

export default function ScrollToTop() {
  useEffect(() => {
    // Force scroll to top on page load/reload to prevent browser scroll restoration
    window.scrollTo(0, 0);
  }, []);

  return null;
}
