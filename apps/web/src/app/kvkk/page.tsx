import type { Metadata } from 'next';
import { PlaceholderPage } from '@/components/site/PlaceholderPage';

export const metadata: Metadata = { title: 'KVKK aydınlatma metni' };

/** Yasal metin hukuk incelemesinden geçmeden yayımlanmaz; uydurma sözleşme konmaz. */
export default function KvkkPage() {
  return (
    <PlaceholderPage eyebrow="Yasal" title="KVKK aydınlatma metni hazırlanıyor.">
      <p>Kişisel verilerin Türkiye’de barındırılır ve yurt dışındaki servislere aktarılmaz. Hangi verinin hangi amaçla işlendiği, saklama süreleri ve haklarını nasıl kullanacağın bu sayfada yayımlanacak.</p>
      <p>Yayımlandığında bu sayfada ve kayıt ekranında yer alacak.</p>
    </PlaceholderPage>
  );
}
