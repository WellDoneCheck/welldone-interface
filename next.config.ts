import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // enables unauthorized() / forbidden() and the app/unauthorized.tsx (401) and app/forbidden.tsx (403) pages
    authInterrupts: true,
    // runs page navigations as view transitions, so elements shared by two pages (see SharedTransition) move across
    viewTransition: true,
  },
  // the site's own path to the backend (BACKEND_PROXY_PATH in app/utils/tileServer.ts), for the imagery's tiles
  async rewrites() {
    return [{ source: '/backend/:path*', destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/:path*` }];
  },
};

export default nextConfig;
