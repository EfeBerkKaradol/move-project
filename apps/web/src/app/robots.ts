import type { MetadataRoute } from 'next';

/**
 * Arama motoru kuralları.
 *
 * <p>Şu an tüm site dizine kapalı: marka adı ve alan adı kesinleşmedi (ANAHTARLAR #5),
 * geçici adresin indekslenmesi sonradan temizlenmesi zor bir iz bırakır. Alan adı
 * netleşince burası açılacak; panel ve API yolları her hâlükârda kapalı kalır.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000';
  const indexable = process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true';

  return {
    rules: indexable
      ? { userAgent: '*', allow: '/', disallow: ['/api/', '/panel/', '/nakliyeci/', '/yonetim/', '/hesap'] }
      : { userAgent: '*', disallow: '/' },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
