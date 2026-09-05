import type { Metadata } from 'next';
import { PlaceholderPage } from '@/components/site/PlaceholderPage';

export const metadata: Metadata = { title: 'Kullanıcı sözleşmesi' };

/** Yasal metin hukuk incelemesinden geçmeden yayımlanmaz; uydurma sözleşme konmaz. */
export default function KullaniciSozlesmesiPage() {
  return (
    <PlaceholderPage eyebrow="Yasal" title="Kullanıcı sözleşmesi hazırlanıyor.">
      <p>Yük veren ve araç sahibi için karşılıklı yükümlülükler, teklif ve iptal kuralları, teslimatta onay ve ödeme koşulları bu sayfada yayımlanacak.</p>
      <p>Yayımlandığında bu sayfada ve kayıt ekranında yer alacak.</p>
    </PlaceholderPage>
  );
}
