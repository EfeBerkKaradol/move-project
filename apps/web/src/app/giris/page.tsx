import type { Metadata } from 'next';
import { PlaceholderPage } from '@/components/site/PlaceholderPage';

export const metadata: Metadata = { title: 'Giriş yap' };

/** Telefon + OTP girişi (docs/06 §2, app/(app)/giris) kimlik modülüyle birlikte gelecek. */
export default function LoginPage() {
  return (
    <PlaceholderPage
      eyebrow="Hesap"
      title="Giriş yakında."
      cta={{ href: '/fiyat-hesapla', label: 'Kayıtsız fiyat al' }}
    >
      <p>
        Telefon numaran ve tek kullanımlık kodla giriş yapacaksın; şifre yok. Fiyat görmek
        için giriş gerekmiyor — hesap yalnızca ilan yayınlarken ve teklif verirken lazım.
      </p>
    </PlaceholderPage>
  );
}
