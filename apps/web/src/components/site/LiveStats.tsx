import { getPublicStats } from '@/lib/api';

type Stat = { value: string; label: string };

function StatList({ items }: { items: Stat[] }) {
  return (
    <dl className="mt-16 flex flex-wrap gap-x-14 gap-y-6 border-t border-line pt-8">
      {items.map((s) => (
        <div key={s.label}>
          <dd className="stat text-[2rem] leading-none text-ink">[{s.value}]</dd>
          <dt className="label-mono mt-2 text-muted">{s.label}</dt>
        </div>
      ))}
    </dl>
  );
}

/**
 * Sayaçlar gelene kadar HİÇBİR ŞEY gösterilmiyor.
 *
 * <p>Önce tire ("[—] Açık yük ilanı") çiziliyordu. Amaç dürüstlüktü ama sonuç
 * öyle okunmuyordu: ziyaretçi köşeli parantez içinde tire görünce ürünün bozuk
 * olduğunu düşünüyor. Bilinmeyen bir sayıyı göstermemek, bilinmediğini
 * göstermekten daha dürüst bir arayüz üretiyor.
 */
export function LiveStatsFallback() {
  return null;
}

/**
 * Canlı sayaçlar: köşeli parantez içinde monospace sayılar.
 *
 * <p>Güven bölümünün altında duruyor — "doğrulanmış araç" iddiasının hemen yanında
 * kaç tane olduğunu göstermek, iddiayı denetlenebilir kılıyor.
 *
 * <p>Sayılar canlı sistemden geliyor. Veri yoksa ya da API'ye ulaşılamıyorsa tire
 * gösteriliyor — uydurma bir rakamı gerçekmiş gibi göstermek, "doğrulanmış araç
 * sahibi" diyen bir ürünün ilk yalanı olurdu.
 *
 * <p>Sıfır da gerçek bir cevaptır ve gösteriliyor: "0 açık ilan" dürüst, "—" ise
 * bilinmiyor demek. İkisini karıştırmamak için ayrı tutuluyor.
 *
 * <p><strong>Suspense sınırının içinde çağrılmalı</strong> (bkz. TrustSection):
 * sarmalanmadığında bu tek istek, güven bölümünü barındıran sayfanın tamamını —
 * başlıktaki düğmeler dahil — API cevap verene kadar HTML'siz bırakıyor.
 */
export async function LiveStats() {
  const stats = await getPublicStats();
  // Servis cevap vermediyse bölüm hiç çizilmiyor: tire dizisi ürünü bozuk
  // gösteriyordu ve zaten hiçbir soruya cevap vermiyordu
  if (!stats) return null;

  const items: Stat[] = [
    { value: String(stats.openListings), label: 'Açık yük ilanı' },
    { value: String(stats.verifiedCarriers), label: 'Doğrulanmış araç' },
    // Henüz ölçülemeyen sayaç yazılmıyor; "—" yazmak yerine satır düşüyor
    ...(stats.averageMinutesToFirstOffer
      ? [{ value: `${stats.averageMinutesToFirstOffer} dk`, label: 'Ort. ilk teklif' }]
      : []),
  ];

  // Tek bir sayı bile gelmediyse çizgi ve boşluk bırakmanın anlamı yok
  if (items.length === 0) return null;
  return <StatList items={items} />;
}
