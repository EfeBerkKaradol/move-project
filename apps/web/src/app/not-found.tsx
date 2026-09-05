import { PlaceholderPage } from '@/components/site/PlaceholderPage';

export default function NotFound() {
  return (
    <PlaceholderPage eyebrow="404" title="Bu sayfa yok." cta={{ href: '/', label: 'Ana sayfaya dön' }}>
      <p>Adres yanlış olabilir ya da sayfa henüz yapılmamış olabilir.</p>
    </PlaceholderPage>
  );
}
