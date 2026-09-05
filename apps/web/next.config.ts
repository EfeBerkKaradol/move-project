import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Barındırma Türkiye'de, k8s'te self-host ediliyor (ADR-0005) — Vercel yok
  output: 'standalone',
  transpilePackages: ['@tasiyoruz/shared', '@tasiyoruz/contracts'],
  // Not: experimental.typedRoutes Turbopack ile çalışmıyor (Next 15.1).
  // Geliştirme hızı için Turbopack tercih edildi; Turbopack desteklediğinde geri eklenecek.
};

export default nextConfig;
