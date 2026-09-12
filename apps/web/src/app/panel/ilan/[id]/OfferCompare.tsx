'use client';

import { useState } from 'react';
import { formatPrice } from '@tasiyoruz/shared';

/**
 * Karşılaştırmaya giren teklifin düz hâli.
 *
 * <p>Sunucu bileşeni yalnızca bunu yolluyor: taşıyıcının kimliği, telefonu ya da
 * belgeleri buraya hiç inmiyor. Kabul eylemi sunucuda bağlanıp geçiriliyor,
 * yani istemci hangi ilana hangi teklifin kabul edildiğini kurgulayamıyor.
 */
export type CompareOffer = {
  id: string;
  carrier: string;
  amount: string;
  verified: boolean;
  vehicle: string | null;
  /** Ortalama puan ve oy sayısı; hiç puanı yoksa null. */
  rating: { score: number; count: number } | null;
  completedJobs: number | null;
  note: string | null;
  accept: (() => void) | null;
};

const EN_FAZLA = 3;

/**
 * Teklif karşılaştırma.
 *
 * <p>Liste fiyata göre sıralı ama karar yalnızca fiyat değil: doğrulanmış bir
 * taşıyıcının iki yüz lira pahalı teklifi, puanı olmayan birinin ucuzundan
 * genellikle daha iyi. Kartlar alt alta olduğu için kullanıcı bunu ancak
 * kaydırarak ve akılda tutarak yapabiliyordu.
 *
 * <p>Üç teklif sınırı bilinçli: dört sütun telefonda okunmuyor ve karşılaştırma
 * zaten iki üç aday arasında yapılıyor.
 */
export function OfferCompare({ offers }: { offers: CompareOffer[] }) {
  const [secili, setSecili] = useState<string[]>([]);

  // Tek teklif varken karşılaştırmanın anlamı yok
  if (offers.length < 2) return null;

  const sec = (id: string) =>
    setSecili((o) =>
      o.includes(id) ? o.filter((x) => x !== id) : o.length >= EN_FAZLA ? o : [...o, id],
    );

  const secilenler = offers.filter((o) => secili.includes(o.id));
  const enUcuz = Math.min(...secilenler.map((o) => Number(o.amount)));

  const satirlar: { etiket: string; deger: (o: CompareOffer) => React.ReactNode }[] = [
    {
      etiket: 'Fiyat',
      deger: (o) => (
        <span className={Number(o.amount) === enUcuz ? 'font-bold text-[var(--route-deep)]' : ''}>
          {formatPrice(o.amount)}
          {Number(o.amount) === enUcuz && secilenler.length > 1 && (
            <span className="label-mono mt-1 block text-[var(--route-deep)]">en düşük</span>
          )}
        </span>
      ),
    },
    { etiket: 'Doğrulama', deger: (o) => (o.verified ? 'Doğrulanmış taşıyıcı' : 'Doğrulanmamış') },
    { etiket: 'Araç', deger: (o) => o.vehicle ?? 'belirtilmemiş' },
    {
      etiket: 'Puan',
      deger: (o) => (o.rating ? `★ ${o.rating.score.toFixed(1)} (${o.rating.count})` : 'puan yok'),
    },
    {
      etiket: 'Tamamlanan iş',
      deger: (o) => (o.completedJobs == null ? 'bilinmiyor' : `${o.completedJobs} taşıma`),
    },
    { etiket: 'Not', deger: (o) => o.note ?? '—' },
  ];

  return (
    <section className="mt-8 rounded-card border border-line bg-surface p-5">
      <h3 className="text-base font-bold">Teklifleri karşılaştır</h3>
      <p className="mt-1 text-sm text-muted">
        En fazla {EN_FAZLA} teklif seç; yan yana göster.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {offers.map((o) => {
          const isaretli = secili.includes(o.id);
          const dolu = !isaretli && secili.length >= EN_FAZLA;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => sec(o.id)}
              aria-pressed={isaretli}
              disabled={dolu}
              className={[
                'inline-flex min-h-11 items-center gap-2 rounded-field border px-3.5 text-sm transition',
                isaretli
                  ? 'border-[var(--route-deep)] bg-[var(--route-soft)] font-semibold'
                  : 'border-line hover:border-muted',
                dolu ? 'opacity-40' : '',
              ].join(' ')}
            >
              {o.carrier}
              <span className="label-mono text-muted">{formatPrice(o.amount)}</span>
            </button>
          );
        })}
      </div>

      {secilenler.length < 2 ? (
        <p className="mt-4 text-sm text-muted">Karşılaştırmak için en az iki teklif seç.</p>
      ) : (
        // Dar ekranda tablo yatay kayıyor; sayfa gövdesi kaymıyor
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            <caption className="sr-only">Seçilen tekliflerin karşılaştırması</caption>
            <thead>
              <tr>
                <th scope="col" className="label-mono w-28 border-b border-line pb-2 text-left text-muted">
                  Ölçüt
                </th>
                {secilenler.map((o) => (
                  <th key={o.id} scope="col" className="border-b border-line pb-2 text-left font-bold">
                    {o.carrier}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {satirlar.map((s) => (
                <tr key={s.etiket}>
                  <th scope="row" className="label-mono border-b border-line py-3 pr-4 text-left align-top text-muted">
                    {s.etiket}
                  </th>
                  {secilenler.map((o) => (
                    <td key={o.id} className="border-b border-line py-3 pr-4 align-top">
                      {s.deger(o)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td />
                {secilenler.map((o) => (
                  <td key={o.id} className="pt-4 pr-4 align-top">
                    {o.accept && (
                      <form action={o.accept}>
                        <button
                          type="submit"
                          className="min-h-11 w-full rounded-field bg-route px-4 text-sm font-bold text-[var(--route-ink)] transition hover:bg-[var(--route-hover)] active:translate-y-px"
                        >
                          Kabul et
                        </button>
                      </form>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
