import type { VehicleType } from '@tasiyoruz/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { VehicleGlyph } from '@/components/site/VehicleGlyph';
import { Icon } from '@/components/ui/Icon';
import { getFleetCounts, getPublicStats, getVehicleTypes } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Araçlar',
  description:
    'Motordan TIR’a yedi araç tipi, her biri için kayıtlı ve belgeleri doğrulanmış taşıyıcı sayısı.',
};

/**
 * Aracın tipik kullanıldığı mesafe. Katalogda böyle bir alan yok; bu editoryal
 * bir açıklama, veri değil. Bilinmeyen bir kod gelirse satır boş bırakılır —
 * uydurma bir rota yazmaktansa hiç yazmamak doğru.
 */
const IDEAL_ROUTE: Record<string, string> = {
  MOTOR: 'Şehir içi · aynı saat',
  OTOMOBIL: 'Şehir içi · aynı gün',
  MINI_PANELVAN: 'Şehir içi ve komşu il',
  PANELVAN: 'Şehirlerarası · tek adres',
  KAMYONET: 'Şehirlerarası · ev ve ofis',
  KAMYON: 'Uzun yol · paletli sevkiyat',
  TIR: 'Uzun yol · komple yük',
};

function capacity(v: VehicleType) {
  const weight =
    v.payloadKg >= 1000
      ? `${(v.payloadKg / 1000).toLocaleString('tr-TR')} ton`
      : `${v.payloadKg} kg'a kadar`;
  return v.volumeM3 >= 1 ? `${weight} · ${v.volumeM3.toLocaleString('tr-TR')} m³` : weight;
}

/**
 * Araçlar sayfası.
 *
 * <p>Ana sayfadaki bölüm "hangi araçlar var" sorusunu cevaplıyordu ama "kaç tane
 * var" sorusunu cevaplamıyordu. İkinci soru ikna edici olanı: yük veren, teklif
 * bekleyeceği havuzun gerçekten dolu olduğunu görmek istiyor.
 *
 * <p>Sayılar <strong>doğrulanmış</strong> taşıyıcıyı sayıyor — başvurusu duran,
 * belgesi süresi dolmuş ya da askıya alınmış taşıyıcı buraya girmiyor. "Kayıtlı"
 * derken kastedilen şey iş alabilir olmak; aksi hâlde sayı ürünün kapasitesini
 * olduğundan büyük gösterirdi.
 *
 * <p>Sayı API'den gelmiyorsa (servis kapalı) rakam yerine tire çıkıyor. Uydurma
 * bir sayı, "doğrulanmış araç sahibi" diyen bir ürünün ilk yalanı olurdu.
 */
export default async function VehiclesPage() {
  const [vehicles, counts, stats] = await Promise.all([
    getVehicleTypes(),
    getFleetCounts(),
    getPublicStats(),
  ]);

  // Katalog ile sayaçlar kod üzerinden birleşiyor; uç yalnızca sayı taşıyor
  const sayac = new Map(counts.map((c) => [c.vehicleTypeCode, c.carrierCount]));
  const sayimVar = counts.length > 0;
  const aktif = vehicles.filter((v) => v.active);
  const yakinda = vehicles.filter((v) => !v.active);

  return (
    <>
      <Header />
      <main className="theme-cream min-h-screen bg-bg text-ink">
        <div className="mx-auto max-w-[76rem] px-6 py-10 md:py-16">
          <p className="label-mono text-[var(--route-deep)]">Araç yelpazesi</p>
          <h1 className="mt-3 text-[clamp(1.9rem,4.5vw,2.9rem)] leading-[1.06]">
            Zarftan komple yüke.
          </h1>
          <p className="mt-4 max-w-xl text-muted">
            Kapasiteyi tonaj yerine gerçek örneklerle gösteriyoruz — çünkü kimse yükünün
            kaç m³ olduğunu bilmiyor. Her aracın yanındaki sayı, o araçla iş alabilecek
            belgeleri doğrulanmış taşıyıcıyı gösteriyor.
          </p>

          <dl className="mt-8 flex flex-wrap gap-x-12 gap-y-5 border-y border-line py-6">
            <div>
              <dd className="stat text-[2rem] leading-none">
                [{stats ? stats.verifiedCarriers : '—'}]
              </dd>
              <dt className="label-mono mt-2 text-muted">Doğrulanmış taşıyıcı</dt>
            </div>
            <div>
              <dd className="stat text-[2rem] leading-none">[{aktif.length}]</dd>
              <dt className="label-mono mt-2 text-muted">Açık araç tipi</dt>
            </div>
            <div>
              <dd className="stat text-[2rem] leading-none">
                [{stats ? stats.openListings : '—'}]
              </dd>
              <dt className="label-mono mt-2 text-muted">Açık yük ilanı</dt>
            </div>
          </dl>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...aktif, ...yakinda].map((vehicle) => {
              const soon = !vehicle.active;
              const adet = sayac.get(vehicle.code) ?? 0;
              return (
                <li key={vehicle.code}>
                  <article
                    className={[
                      'flex h-full flex-col rounded-card p-5',
                      soon
                        ? 'border border-dashed border-line text-muted'
                        : 'border border-line bg-surface',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <VehicleGlyph code={vehicle.code} className="size-6" />
                      {soon ? (
                        <span className="label-mono rounded bg-surface-2 px-2 py-1 text-muted">
                          Yakında
                        </span>
                      ) : (
                        <span className="text-right">
                          <span className="stat block text-lg leading-none text-ink">
                            {sayimVar ? adet : '—'}
                          </span>
                          <span className="label-mono mt-1 block text-muted">kayıtlı</span>
                        </span>
                      )}
                    </div>

                    <h2 className="mt-3 text-base font-bold text-ink">{vehicle.displayName}</h2>
                    <p className="mt-1 text-sm text-muted">
                      {soon ? 'Hizmete yakında açılıyor.' : vehicle.exampleLoads}
                    </p>

                    {!soon && (
                      <p className="label-mono mt-4 text-muted">
                        {capacity(vehicle)}
                        {IDEAL_ROUTE[vehicle.code] && (
                          <span className="mt-1 block normal-case tracking-normal opacity-80">
                            {IDEAL_ROUTE[vehicle.code]}
                          </span>
                        )}
                      </p>
                    )}

                    {/*
                      Sıfır kayıtlı araç gizlenmiyor: tip katalogda açık ve
                      kullanıcı onunla fiyat alabiliyor. Gizlemek, teklif
                      gelmeyince nedenini anlaşılmaz yapardı.
                    */}
                    {!soon && sayimVar && adet === 0 && (
                      <p className="mt-3 text-sm text-muted">
                        Bu araçla henüz doğrulanmış taşıyıcı yok — ilan verebilirsin,
                        başvurular onaylandıkça teklif gelir.
                      </p>
                    )}

                    {!soon && (
                      <Link
                        href={`/ilanlar?arac=${vehicle.code}`}
                        className="mt-auto inline-flex min-h-11 items-center gap-1.5 pt-4 text-sm font-semibold transition hover:text-[var(--route-deep)]"
                      >
                        Bu araçla açık ilanlar
                        <Icon name="arrowRight" size={16} />
                      </Link>
                    )}
                  </article>
                </li>
              );
            })}
          </ul>

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            <div className="rounded-card border border-line bg-surface p-6">
              <h2 className="text-lg font-bold">Aracın mı var?</h2>
              <p className="mt-2 text-sm text-muted">
                Belgelerini yükle, onaylanınca bu sayıya sen de eklen ve rotana düşen
                yüklere teklif ver.
              </p>
              <Link
                href="/sofor-ol"
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-field bg-route px-5 text-sm font-bold text-[var(--route-ink)] transition hover:bg-[var(--route-hover)] active:translate-y-px"
              >
                Araç sahibi ol
                <Icon name="arrowRight" size={16} />
              </Link>
            </div>
            <div className="rounded-card border border-line bg-surface p-6">
              <h2 className="text-lg font-bold">Yükün mü var?</h2>
              <p className="mt-2 text-sm text-muted">
                Hangi aracın gerektiğini bilmiyorsan sorun değil — yükünü tarif et,
                sistem aracı öneriyor.
              </p>
              <Link
                href="/fiyat-hesapla"
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-field border border-line px-5 text-sm font-bold transition hover:border-route hover:bg-surface-2"
              >
                Fiyat hesapla
                <Icon name="arrowRight" size={16} />
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
