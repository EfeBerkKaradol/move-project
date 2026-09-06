import type { Metadata } from 'next';
import { PlaceholderPage } from '@/components/site/PlaceholderPage';

export const metadata: Metadata = {
  title: 'Rotalar',
  description: 'Şehirlerarası koridorlar ve boş dönüş eşleştirme nasıl çalışıyor.',
};

/**
 * Koridor istatistikleri sayfası.
 *
 * <p>Eşleştirme çalışıyor (docs/11 §5 #6); burada gösterilecek olan koridor bazlı
 * yoğunluk ve ortalama teklif süresi. Uydurma rakam konmuyor: ilan hacmi birikmeden
 * yayınlanan bir "İstanbul-Ankara: 42 yük" tablosu ürünün en temel iddiasını çürütür.
 */
export default function RoutesPage() {
  return (
    <PlaceholderPage
      eyebrow="81 il"
      title="Koridor istatistikleri hazırlanıyor."
      cta={{ href: '/nakliyeci/koridor', label: 'Dönüş rotanı kaydet' }}
    >
      <p>
        Boş dönüş eşleştirme çalışıyor: araç sahibi dönüş rotasını kaydediyor, o rotaya
        düşen ilanlar rotayı kaç kilometre uzattığıyla birlikte ona getiriliyor.
      </p>
      <p>
        Bu sayfada koridor bazlı yoğunluğu, ortalama ilk teklif süresini ve boş dönüş
        oranını göreceksin. Sayılar gerçek ilan hacmi birikince açılacak — o zamana kadar
        tahmini rakam yayınlamıyoruz.
      </p>
    </PlaceholderPage>
  );
}
