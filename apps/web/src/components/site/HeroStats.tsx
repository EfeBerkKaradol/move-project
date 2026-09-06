import { getPublicStats } from '@/lib/api';

/**
 * Tasarımın imzası: köşeli parantez içinde monospace sayılar.
 *
 * <p>Sayılar canlı sistemden geliyor. Veri yoksa ya da API'ye ulaşılamıyorsa tire
 * gösteriliyor — uydurma bir rakamı gerçekmiş gibi göstermek, "doğrulanmış araç
 * sahibi" diyen bir ürünün ilk yalanı olurdu.
 *
 * <p>Sıfır da gerçek bir cevaptır ve gösteriliyor: "0 açık ilan" dürüst, "—" ise
 * bilinmiyor demek. İkisini karıştırmamak için ayrı tutuluyor.
 */
export async function HeroStats() {
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
    <dl className="mt-9 flex flex-wrap gap-x-10 gap-y-5 border-t border-line pt-7">
      {items.map((s) => (
        <div key={s.label}>
          <dd className={`stat text-3xl ${s.unknown ? 'text-muted' : 'text-ink'}`}>
            [{s.value}]
          </dd>
          <dt className="label-mono mt-1 text-muted">{s.label}</dt>
        </div>
      ))}
    </dl>
  );
}
