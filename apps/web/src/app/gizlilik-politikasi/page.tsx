import type { Metadata } from 'next';
import { PlaceholderPage } from '@/components/site/PlaceholderPage';

export const metadata: Metadata = { title: 'Gizlilik politikası' };

/** Yasal metin hukuk incelemesinden geçmeden yayımlanmaz; uydurma sözleşme konmaz. */
export default function GizlilikPolitikasiPage() {
  return (
    <PlaceholderPage eyebrow="Yasal" title="Gizlilik politikası hazırlanıyor.">
      <p>Konum verisi yalnızca aktif bir taşıma sırasında ve yük sahibinin görebileceği şekilde işlenir. Herkese açık hiçbir ekranda ham konum veya kişi bilgisi gösterilmez.</p>
      <p>Yayımlandığında bu sayfada ve kayıt ekranında yer alacak.</p>
    </PlaceholderPage>
  );
}
