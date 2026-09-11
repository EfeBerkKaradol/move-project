import type { Metadata } from 'next';
import { Archivo, IBM_Plex_Mono } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import { NavigationProgress } from '@/components/app/NavigationProgress';
import { WarmUp } from '@/components/app/WarmUp';
import { API_URL } from '@/lib/api';
import { BRAND } from '@/lib/brand';

/**
 * Archivo: sıkı harf aralıklı, kalın kesilebilen grotesk — tasarımın başlık dili.
 * IBM Plex Mono: köşeli parantezli sayılar ve harf aralıklı küçük etiketler için.
 *
 * next/font ile self-host ediliyor: Google'a istek gitmiyor (KVKK ve performans),
 * font dosyaları kendi alan adımızdan servis ediliyor, yükleme sırasında düzen
 * kayması olmuyor.
 */
/**
 * Ağırlık listesi verilmiyor: Archivo'nun değişken sürümü indiriliyor. Beş ayrı
 * statik kesit yerine alt küme başına tek dosya geliyor ve aradaki her ağırlık
 * (400–800) kullanılabilir oluyor.
 */
const archivo = Archivo({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-archivo',
  display: 'swap',
});

/**
 * Mono yalnızca iki yerde kullanılıyor: `.label-mono` (400) ve `.stat` (700).
 * 500 ve 600 hiçbir yerde render edilmiyordu ama indiriliyordu — mobilde iki
 * gereksiz istek ve ~20 KB.
 */
const plexMono = IBM_Plex_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '700'],
  variable: '--font-plex-mono',
  display: 'swap',
});

/**
 * Paylaşım ve arama sonuçları için mutlak adres.
 *
 * <p>Bu olmadan Next açılış görselini ve kanonik adresi göreli üretiyor; WhatsApp ve
 * arama motorları göreli adresi çözemediği için önizleme boş çıkıyor. Ortamdan geliyor:
 * sabit yazılsaydı önizleme her dağıtımda localhost'u gösterirdi.
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000';

const description = BRAND.description;
const title = `${BRAND.name} — ${BRAND.slogan}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: title, template: `%s · ${BRAND.name}` },
  description,
  applicationName: BRAND.name,
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    siteName: BRAND.name,
    title,
    description,
    url: '/',
  },
  twitter: { card: 'summary_large_image', title, description },
  // Marka ve alan adı kesinleşmeden dizine girmesin (ANAHTARLAR #5)
  robots: { index: false, follow: false },
};

/**
 * Ziyaretçi sayfayı okurken uyandırılacak servisler. Kimlik servisi adresi
 * gizli değil (tarayıcı zaten oraya yönlendiriliyor); yalnızca bağlı ortamlarda.
 */
const warmTargets = [
  `${API_URL}/actuator/health`,
  ...(process.env.AUTH_KEYCLOAK_ISSUER ? [process.env.AUTH_KEYCLOAK_ISSUER] : []),
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${archivo.variable} ${plexMono.variable}`}>
      <head>
        {/*
          Açılış animasyonlarının başlangıç durumu (opacity: 0) script çalışmadığında
          içeriği kalıcı olarak gizlerdi. <noscript> bunu geri alıyor.
        */}
        <noscript>
          <style>{`[data-reveal]{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
      </head>
      <body className="font-sans antialiased">
        {/* useSearchParams statik sayfalarda Suspense sınırı istiyor; çubuk
            ilk boyamada zaten görünmez, sınırın maliyeti yok. */}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <WarmUp targets={warmTargets} />
        {children}
      </body>
    </html>
  );
}
