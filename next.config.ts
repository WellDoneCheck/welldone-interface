import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // enables unauthorized() / forbidden() and the app/unauthorized.tsx (401) and app/forbidden.tsx (403) pages
    authInterrupts: true,
    // runs page navigations as view transitions, so elements shared by two pages (see SharedTransition) move across
    viewTransition: true,
  },
};

export default nextConfig;
