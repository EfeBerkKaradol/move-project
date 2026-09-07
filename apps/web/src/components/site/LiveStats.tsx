import { getPublicStats } from '@/lib/api';

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
 */
export async function LiveStats() {
  const stats = await getPublicStats();

  const items: { value: string; label: string; unknown: boolean }[] = [
    {
      value: stats ? String(stats.openListings) : '—',
      label: 'Açık yük ilanı',
      unknown: !stats,
    },
    {
      value: stats ? String(stats.verifiedCarriers) : '—',
      label: 'Doğrulanmış araç',
      unknown: !stats,
    },
    {
      value: stats?.averageMinutesToFirstOffer ? `${stats.averageMinutesToFirstOffer} dk` : '—',
      label: 'Ort. ilk teklif',
      unknown: !stats?.averageMinutesToFirstOffer,
    },
  ];

  return (
    <dl className="mt-16 flex flex-wrap gap-x-14 gap-y-6 border-t border-line pt-8">
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
