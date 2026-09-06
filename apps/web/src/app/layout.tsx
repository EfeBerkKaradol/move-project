import type { Metadata } from 'next';
import { Archivo, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

/**
 * Archivo: sıkı harf aralıklı, kalın kesilebilen grotesk — tasarımın başlık dili.
 * IBM Plex Mono: köşeli parantezli sayılar ve harf aralıklı küçük etiketler için.
 *
 * next/font ile self-host ediliyor: Google'a istek gitmiyor (KVKK ve performans),
 * font dosyaları kendi alan adımızdan servis ediliyor, yükleme sırasında düzen
 * kayması olmuyor.
 */
const archivo = Archivo({
  subsets: ['latin-ext'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-archivo',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin-ext'],
  weight: ['400', '500', '600', '700'],
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

const description =
  'Rotanızı girin, doğrulanmış araç sahiplerinden teklif alın. Aracı siz seçin, ' +
  'ödemeyi teslimatta onaylayın. 81 il, motordan kamyona.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Taşıyoruz — Yükünüz için doğru aracı dakikalar içinde bulun',
    template: '%s · Taşıyoruz',
  },
  description,
  applicationName: 'Taşıyoruz',
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    siteName: 'Taşıyoruz',
    title: 'Taşıyoruz — Yükünüz için doğru aracı dakikalar içinde bulun',
    description,
    url: '/',
  },
  twitter: { card: 'summary_large_image', title: 'Taşıyoruz', description },
  // Marka ve alan adı kesinleşmeden dizine girmesin (ANAHTARLAR #5)
  robots: { index: false, follow: false },
};

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
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
