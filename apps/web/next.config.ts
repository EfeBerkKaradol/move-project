import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Barındırma Türkiye'de, k8s'te self-host ediliyor (ADR-0005) — Vercel yok
  output: 'standalone',
  transpilePackages: ['@turmove/shared', '@turmove/contracts'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
