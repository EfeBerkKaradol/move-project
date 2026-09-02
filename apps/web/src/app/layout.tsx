import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="tr">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
