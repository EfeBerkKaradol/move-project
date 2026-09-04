import type { Metadata } from 'next';
import { Archivo, IBM_Plex_Sans } from 'next/font/google';
import './globals.css';

/**
 * Fontlar next/font ile self-host ediliyor: Google'a istek gitmiyor (KVKK ve
 * performans), font dosyaları kendi alan adımızdan servis ediliyor ve
 * yükleme sırasında düzen kayması olmuyor.
 */
const archivo = Archivo({
  subsets: ['latin-ext'],
  weight: ['600', '700', '800'],
  variable: '--font-archivo',
  display: 'swap',
});

const plex = IBM_Plex_Sans({
  subsets: ['latin-ext'],
  weight: ['400', '500', '600'],
  variable: '--font-plex',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'TurMove — Ne taşıyacağını söyle, aracı biz bulalım',
    template: '%s · TurMove',
  },
  description:
    'Yük taşıma ve teslimat platformu. Sipariş öncesi net fiyat, canlı araç takibi, ' +
    'nakliyeciyle pazarlık. İstanbul, Ankara ve Hatay.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${archivo.variable} ${plex.variable}`}>
      <head>
        {/*
          Açılış animasyonlarının başlangıç durumu (opacity: 0) script çalışmadığında
          içeriği kalıcı olarak gizlerdi. <noscript> bunu geri alıyor — <html> class'ını
          bir script'le değiştirmeye göre avantajı, React'in hydration'ıyla çakışmaması.
        */}
        <noscript>
          <style>{`[data-reveal]{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
