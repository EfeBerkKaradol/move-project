import type { Metadata } from 'next';
import { PlaceholderPage } from '@/components/site/PlaceholderPage';

export const metadata: Metadata = { title: 'Kurumsal' };

/** İşletmeler için çözümler (docs/06 §2 /kurumsal) — kurumsal hesap Faz 6 ile gelecek. */
export default function CorporatePage() {
  return (
    <PlaceholderPage
      eyebrow="İşletmeler için"
      title="Düzenli sevkiyat, tek hesap."
      cta={{ href: '/fiyat-hesapla', label: 'Tek seferlik fiyat al' }}
    >
      <p>
        Ekip hesabı, cari çalışma ve toplu gönderi kurumsal hesapla birlikte açılacak.
        Şimdilik tek seferlik taşımalar için fiyat alabilir, ilan yayınlayabilirsin.
      </p>
    </PlaceholderPage>
  );
}
