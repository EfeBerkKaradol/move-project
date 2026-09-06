import type { MetadataRoute } from 'next';

/**
 * Herkese açık sayfalar. Oturum arkasındaki paneller burada yok: dizine girmemeleri
 * gerekiyor ve zaten yönlendirme ile giriş ekranına düşerler.
 */
const PUBLIC_PATHS = [
  '/',
  '/fiyat-hesapla',
  '/rotalar',
  '/sofor-ol',
  '/belgeler',
  '/kurumsal',
  '/giris',
  '/kvkk',
  '/gizlilik-politikasi',
  '/kullanici-sozlesmesi',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000';
  const now = new Date();

  return PUBLIC_PATHS.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: path === '/' ? 'daily' : 'monthly',
    priority: path === '/' ? 1 : 0.6,
  }));
}
