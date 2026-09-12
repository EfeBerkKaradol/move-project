import type { PublicFleetCountView, PublicStatsView, VehicleType } from '@tasiyoruz/contracts';
import type { Metadata } from 'next';
import { Suspense } from 'react';
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

/**
 * Bir aracın kayıtlı taşıyıcı sayısı — kendi Suspense sınırında bekliyor.
 *
 * <p>Yedi kart da AYNI promise'i bekliyor: sayaçlar bir kez isteniyor, yedi kez
 * değil. Kartın geri kalanı (ad, kapasite, örnek yük) katalogdan geldiği için
 * sayaç gecikse bile kart okunur durumda.
 */
async function Sayac({ sayaclar, code }: { sayaclar: Promise<PublicFleetCountView[]>; code: string }) {
  const liste = await sayaclar;
  // Sayı gelmediyse rozet hiç çizilmiyor: uydurma bir rakam "doğrulanmış araç
  // sahibi" diyen bir ürünün ilk yalanı olurdu, tire ise ürünü bozuk gösteriyor
  if (liste.length === 0) return null;
  const adet = liste.find((c) => c.vehicleTypeCode === code)?.carrierCount ?? 0;
  return (
    <span className="text-right">
      <span className="stat block text-lg leading-none text-ink">{adet}</span>
      <span className="label-mono mt-1 block text-muted">kayıtlı</span>
    </span>
  );
}

/** Sıfır kayıtlı araç gizlenmiyor; tip katalogda açık ve onunla fiyat alınabiliyor. */
async function SifirNotu({ sayaclar, code }: { sayaclar: Promise<PublicFleetCountView[]>; code: string }) {
  const liste = await sayaclar;
  if (liste.length === 0) return null;
  const adet = liste.find((c) => c.vehicleTypeCode === code)?.carrierCount ?? 0;
  if (adet > 0) return null;
  return (
    <p className="mt-3 text-sm text-muted">
      Bu araçla henüz doğrulanmış taşıyıcı yok — ilan verebilirsin, başvurular
      onaylandıkça teklif gelir.
    </p>
  );
}

/** Üstteki üç sayaç; API'ye ulaşılamazsa tire gösteriyor. */
/**
 * Sayaçlar gelene kadar yalnızca KESİN bilinen sayı duruyor.
 *
 * <p>Araç tipi sayısı katalogdan geliyor, beklemesi gerekmiyor. Diğer ikisi için
 * tire çizmek yerine hiç satır açılmıyor: "[—] Doğrulanmış taşıyıcı" ziyaretçiye
 * ürünün bozuk olduğunu düşündürüyordu.
 */
function OzetIskelet({ aktifSayisi }: { aktifSayisi: number }) {
  return (
    <div>
      <dd className="stat text-[2rem] leading-none">[{aktifSayisi}]</dd>
      <dt className="label-mono mt-2 text-muted">Açık araç tipi</dt>
    </div>
  );
}

async function Ozet({ istatistik, aktifSayisi }: { istatistik: Promise<PublicStatsView | null>; aktifSayisi: number }) {
  const stats = await istatistik;
  // Gelmeyen sayı yazılmıyor; satır tamamen düşüyor
  const satirlar: [string, string | number][] = [
    ...(stats ? ([['Doğrulanmış taşıyıcı', stats.verifiedCarriers]] as [string, number][]) : []),
    ['Açık araç tipi', aktifSayisi],
    ...(stats ? ([['Açık yük ilanı', stats.openListings]] as [string, number][]) : []),
  ];
  return (
    <>
      {satirlar.map(([etiket, deger]) => (
        <div key={etiket}>
          <dd className="stat text-[2rem] leading-none">[{deger}]</dd>
          <dt className="label-mono mt-2 text-muted">{etiket}</dt>
        </div>
      ))}
    </>
  );
}

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
  /*
   * Sayaçlar ve istatistikler BEKLENMİYOR: promise burada başlıyor, aşağıdaki
   * Suspense sınırlarında bekleniyor. Beklendiğinde sayfanın tamamı — başlık,
   * araç kartları, çağrılar — filo sayacı gelene kadar HTML'e hiç yazılmıyordu
   * ve API uykudayken bu 6 saniye sürüyordu. Araç listesi katalogdan geliyor,
   * sayaçtan değil; kart sayısız da tam anlamlı.
   */
  const sayaclar = getFleetCounts();
  const istatistik = getPublicStats();
  const vehicles = await getVehicleTypes();

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
            <Suspense fallback={<OzetIskelet aktifSayisi={aktif.length} />}>
              <Ozet istatistik={istatistik} aktifSayisi={aktif.length} />
            </Suspense>
          </dl>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...aktif, ...yakinda].map((vehicle) => {
              const soon = !vehicle.active;
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
                        <Suspense fallback={null}>
                          <Sayac sayaclar={sayaclar} code={vehicle.code} />
                        </Suspense>
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
                    {!soon && (
                      <Suspense fallback={null}>
                        <SifirNotu sayaclar={sayaclar} code={vehicle.code} />
                      </Suspense>
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
