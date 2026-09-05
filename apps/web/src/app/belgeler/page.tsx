import type { Metadata } from 'next';
import { PlaceholderPage } from '@/components/site/PlaceholderPage';

export const metadata: Metadata = {
  title: 'Gerekli belgeler',
  description: 'Taşıyoruz’da araç sahibi olmak için hangi belgeler isteniyor.',
};

const DOCUMENTS: [string, string][] = [
  ['Araç ruhsatı', 'Aracın kime kayıtlı olduğu ve azami yüklü ağırlığı buradan doğrulanır.'],
  ['Sürücü belgesi', 'Kullanılacak araç sınıfına uygun ehliyet.'],
  ['SRC belgesi', 'Ticari yük taşıyan sürücüler için mesleki yeterlilik belgesi.'],
  ['K yetki belgesi', 'Ticari yük taşımacılığı için Ulaştırma Bakanlığı yetki belgesi.'],
];

export default function DocumentsPage() {
  return (
    <PlaceholderPage
      eyebrow="Araç sahibi için"
      title="Dört belge, bir kez."
      cta={{ href: '/sofor-ol', label: 'Şoför olarak katıl' }}
    >
      <p>
        Belgeler kayıt sırasında kamerayla yüklenir ve doğrulandıktan sonra bir daha
        istenmez. Hangi belgenin hangi araç tipi için zorunlu olduğu kayıt açılınca burada
        netleşecek.
      </p>
      <ul className="space-y-3 pt-2">
        {DOCUMENTS.map(([name, why]) => (
          <li key={name} className="rounded-field border border-line bg-surface p-4">
            <span className="block text-sm font-bold text-ink">{name}</span>
            <span className="mt-0.5 block text-sm">{why}</span>
          </li>
        ))}
      </ul>
    </PlaceholderPage>
  );
}
