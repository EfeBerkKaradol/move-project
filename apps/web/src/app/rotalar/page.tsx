import type { Metadata } from 'next';
import { PlaceholderPage } from '@/components/site/PlaceholderPage';

export const metadata: Metadata = { title: 'Rotalar' };

/** Şehirlerarası koridorlar — boş dönüş eşleştirme (docs/11 §5 #6) ile birlikte gelecek. */
export default function RoutesPage() {
  return (
    <PlaceholderPage
      eyebrow="81 il"
      title="Koridorlar yakında."
      cta={{ href: '/#bos-donus', label: 'Boş dönüş eşleştirmeyi gör' }}
    >
      <p>
        Hangi koridorda ne kadar yük ve araç olduğunu, ortalama ilk teklif süresini ve boş
        dönüş oranını burada göreceksin. Veri, ilanlar birikmeye başlayınca dolacak.
      </p>
    </PlaceholderPage>
  );
}
