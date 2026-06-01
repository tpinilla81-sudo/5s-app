import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Disable ISR cache — always serve fresh pages
  // This prevents the "stale HTML with old JS chunks" problem
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate, proxy-revalidate' },
        { key: 'Pragma', value: 'no-cache' },
        { key: 'Expires', value: '0' },
        { key: 'Surrogate-Control', value: 'no-store' },
      ],
    },
    {
      // Static assets WITH content hashes CAN be cached (they change name when content changes)
      source: '/_next/static/(.*)',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
      },
    ],
  },
};

export default nextConfig;
