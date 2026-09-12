import { getPublicStats } from '@/lib/api';

type Stat = { value: string; label: string; unknown: boolean };

const ETIKETLER = ['Açık yük ilanı', 'Doğrulanmış araç', 'Ort. ilk teklif'] as const;

function StatList({ items, busy = false }: { items: Stat[]; busy?: boolean }) {
  return (
    <dl
      aria-busy={busy || undefined}
      className="mt-16 flex flex-wrap gap-x-14 gap-y-6 border-t border-line pt-8"
    >
      {items.map((s) => (
        <div key={s.label}>
          <dd className={`stat text-[2rem] leading-none ${s.unknown ? 'text-muted' : 'text-ink'}`}>
            [{s.value}]
          </dd>
          <dt className="label-mono mt-2 text-muted">{s.label}</dt>
        </div>
      ))}
    </dl>
  );
}

/**
 * Sayaçlar gelene kadar duran iskelet.
 *
 * <p>Aynı `<dl>`, aynı yükseklik: bölüm sayılar akınca yerinden oynamıyor. Tire
 * zaten bileşenin "bilinmiyor" işareti ve yükleme anında bilinen bir şey yok —
 * ayrı bir gri kutu çizmek, olmayan bir durumu icat etmek olurdu.
 */
export function LiveStatsFallback() {
  return (
    <StatList
      busy
      items={ETIKETLER.map((label) => ({ value: '—', label, unknown: true }))}
    />
  );
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

  const items: Stat[] = [
    {
      value: stats ? String(stats.openListings) : '—',
      label: ETIKETLER[0],
      unknown: !stats,
    },
    {
      value: stats ? String(stats.verifiedCarriers) : '—',
      label: ETIKETLER[1],
      unknown: !stats,
    },
    {
      value: stats?.averageMinutesToFirstOffer ? `${stats.averageMinutesToFirstOffer} dk` : '—',
      label: ETIKETLER[2],
      unknown: !stats?.averageMinutesToFirstOffer,
    },
  ];

  return <StatList items={items} />;
}
