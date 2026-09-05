import type { Metadata } from 'next';
import { PlaceholderPage } from '@/components/site/PlaceholderPage';

export const metadata: Metadata = {
  title: 'Şoför olarak katıl',
  description: 'Belgelerini bir kez yükle, rotanı gir, koridoruna düşen yükler sana gelsin.',
};

/** Taşıyıcı kaydı — docs/11 §5 #7 (belge yükleme) tamamlanınca gerçek akış gelecek. */
export default function DriverSignupPage() {
  return (
    <PlaceholderPage
      eyebrow="Araç sahibi için"
      title="Şoför kaydı yakında açılıyor."
      cta={{ href: '/belgeler', label: 'Gerekli belgeleri gör' }}
    >
      <p>
        Kayıt açıldığında belgelerini kamerayla tek seferde yükleyecek, rotanı girecek ve
        koridoruna düşen yükleri göreceksin. Pazarlık yok — tek turlu teklif verirsin, yük
        sahibi seçer.
      </p>
      <p>
        Boş dönüşünü kaydettiğinde dönüş yoluna uyan ilanlar sana düşer; hem sen boş yol
        yakmazsın, hem yük sahibi daha uygun fiyat görür.
      </p>
    </PlaceholderPage>
  );
}
