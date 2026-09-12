import type { District, VehicleType } from '@tasiyoruz/contracts';
import { formatPrice } from '@tasiyoruz/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth, isDriver } from '@/auth';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { Icon, type IconName } from '@/components/ui/Icon';
import { getDistricts, getPublicListing, getPublicListings, getVehicleTypes } from '@/lib/api';
import { ListingRows } from '../ListingRows';
import { RouteMiniMap } from './RouteMiniMap';

type Params = Promise<{ id: string }>;

/** Aynı ilden kaç ilan gösterilsin — sayfayı doldursun ama listeye dönüşmesin. */
const BENZER_SAYISI = 5;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const ilan = await getPublicListing(id);
  if (!ilan) return { title: 'İlan bulunamadı' };
  // Aynı il içindeki taşımada "İstanbul → İstanbul" hiçbir şey söylemiyor
  const baslik =
    ilan.fromCity === ilan.toCity
      ? `${ilan.fromDistrict} → ${ilan.toDistrict}, ${ilan.fromCity}`
      : `${ilan.fromCity} → ${ilan.toCity}`;
  return {
    title: baslik,
    description:
      `${ilan.fromCity}, ${ilan.fromDistrict} çıkışlı ${ilan.toCity}, ${ilan.toDistrict} varışlı ` +
      `${ilan.distanceKm} km'lik yük ilanı. Adres ve kişi bilgisi yayınlanmıyor.`,
  };
}

function vehicleName(vehicles: VehicleType[], code: string): string {
  return vehicles.find((v) => v.code === code)?.displayName ?? code;
}

/** "3 saat önce" — mutlak damga, yayının tazeliğini tek bakışta söylemiyor. */
function gecenSure(iso: string): string {
  const dakika = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (dakika < 1) return 'az önce';
  if (dakika < 60) return `${dakika} dakika önce`;
  const saat = Math.round(dakika / 60);
  if (saat < 24) return `${saat} saat önce`;
  return `${Math.round(saat / 24)} gün önce`;
}

/** "2 gün geçerli" — kalan süre, bitiş damgasından daha kullanışlı. */
function kalanSure(iso: string): string {
  const saat = Math.round((new Date(iso).getTime() - Date.now()) / 3600000);
  if (saat <= 0) return 'süresi doldu';
  if (saat < 24) return `${saat} saat`;
  return `${Math.round(saat / 24)} gün`;
}

/**
 * İlanın kendi sayfası.
 *
 * <p>Pano kartları eskiden doğrudan teklif akışına gidiyordu: araç sahibi olmayan
 * ziyaretçi "araç sahibi ol" sayfasına düşüyor, ilanı hiç göremiyordu. Oysa
 * kaydolup olmayacağına karar vermek için önce işi görmesi gerekiyor.
 *
 * <p><strong>Düzen iki sütun.</strong> İlk sürüm tek sütundu: dev bir harita,
 * altında altı satır künye ve bolca boşluk — sayfa uzundu ama boştu. Şimdi
 * tarafta kalıcı bir fiyat/eylem kartı var (kaydırırken ekranda kalıyor) ve
 * altta aynı ilden çıkan diğer işler duruyor: ziyaretçi tek ilana bakıp
 * çıkmıyor, panoda gezmeye devam ediyor.
 *
 * <p><strong>Ne gösterilmiyor:</strong> adres, fotoğraf, kalem listesi,
 * kat/asansör ve yük verenin kimliği. Sunucu bunları herkese açık uçta hiç
 * göndermiyor; gizleme burada değil uçta yapılıyor (bkz. PublicListingView).
 */
export default async function PublicListingPage({ params }: { params: Params }) {
  const { id } = await params;
  const [ilan, vehicles, districts, session, hepsi] = await Promise.all([
    getPublicListing(id),
    getVehicleTypes(),
    getDistricts(),
    auth(),
    getPublicListings(),
  ]);

  // Kapanmış, süresi dolmuş ya da hiç var olmamış ilan aynı cevabı alıyor:
  // "bu ilan var ama sana kapalı" demek, olmayan bir ilanı da ele verirdi
  if (!ilan) notFound();

  const driver = !!session && session.error !== 'RefreshFailed' && isDriver(session.roles ?? []);
  const nokta = (dId: string) => (districts ?? []).find((d: District) => d.id === dId) ?? null;
  const a = nokta(ilan.fromDistrictId);
  const b = nokta(ilan.toDistrictId);
  const ilIci = !!a && !!b && a.cityCode === b.cityCode;

  const benzer = (hepsi ?? [])
    .filter((l) => l.id !== ilan.id && l.fromCity === ilan.fromCity)
    .slice(0, BENZER_SAYISI);

  const kunye: { etiket: string; deger: string }[] = [
    {
      etiket: 'Yük',
      deger: [
        `${ilan.pieceCount} parça`,
        ilan.volumeM3 > 0 ? `${ilan.volumeM3.toLocaleString('tr-TR')} m³` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    },
    { etiket: 'Araç', deger: vehicleName(vehicles, ilan.vehicleTypeCode) },
    { etiket: 'Mesafe', deger: `${ilan.distanceKm} km${ilIci ? ' · il içi' : ''}` },
    { etiket: 'Model', deger: ilan.serviceModel === 'SCHEDULED' ? 'Planlı taşıma' : 'Anlık taşıma' },
    { etiket: 'Yayın', deger: gecenSure(ilan.publishedAt) },
    { etiket: 'Kalan süre', deger: kalanSure(ilan.expiresAt) },
  ];

  const guvenceler: { icon: IconName; baslik: string; metin: string }[] = [
    {
      icon: 'shield',
      baslik: 'Doğrulanmış araç sahibi',
      metin: 'Teklif verenler belge onayından geçiyor; ehliyet, ruhsat ve sigorta kontrol ediliyor.',
    },
    {
      icon: 'route',
      baslik: 'Tarife tabanlı tahmin',
      metin: 'Yandaki rakam yayınlanmış tarifeden hesaplanıyor. Kesin fiyatı araç sahipleri teklifle veriyor.',
    },
    {
      icon: 'pin',
      baslik: 'Adres teklifle açılıyor',
      metin: 'Burada ilçe düzeyi var. Tam adres ve kişi bilgisi yalnızca taşımayı üstlenen araç sahibine gidiyor.',
    },
  ];

  return (
    <>
      <Header />
      <main className="theme-cream min-h-screen bg-bg text-ink">
        <div className="mx-auto max-w-[76rem] px-6 py-8 md:py-12">
          {/* Panoya dönüş: ilanın ili süzülü kalsın, kullanıcı baktığı yere dönsün */}
          <Link
            href={a ? `/ilanlar?il=${a.cityCode}` : '/ilanlar'}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-ink"
          >
            <span aria-hidden>←</span>
            Açık ilanlar
          </Link>

          <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
            {/* ── Sol: işin kendisi ─────────────────────────────────────── */}
            <div>
              <p className="label-mono text-[var(--route-deep)]">
                {ilIci ? 'Şehir içi' : 'Şehirlerarası'} · {vehicleName(vehicles, ilan.vehicleTypeCode)}
              </p>
              <h1 className="mt-2 text-[clamp(1.5rem,3.4vw,2.2rem)] leading-[1.12]">
                {ilan.fromDistrict}, {ilan.fromCity}
                <span className="text-muted"> → </span>
                {ilan.toDistrict}, {ilan.toCity}
              </h1>

              <RouteMiniMap from={a} to={b} />

              <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                {kunye.map((s) => (
                  <div key={s.etiket} className="border-t border-line pt-3">
                    <dt className="label-mono text-muted">{s.etiket}</dt>
                    <dd className="mt-1 font-semibold">{s.deger}</dd>
                  </div>
                ))}
              </dl>

              <ul className="mt-8 grid gap-3 sm:grid-cols-3">
                {guvenceler.map((g) => (
                  <li key={g.baslik} className="rounded-card border border-line bg-surface p-4">
                    <span aria-hidden className="text-[var(--route-deep)]">
                      <Icon name={g.icon} size={20} />
                    </span>
                    <p className="mt-2 text-sm font-bold">{g.baslik}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{g.metin}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Sağ: fiyat ve eylem, kaydırırken ekranda kalıyor ──────── */}
            <aside className="lg:sticky lg:top-24">
              <div className="rounded-card border border-line bg-surface p-6">
                <p className="label-mono text-muted">Tarife tahmini</p>
                <p className="stat mt-1 text-[2rem] leading-none">
                  {formatPrice(String(ilan.estimatedAmount))}
                </p>
                <p className="mt-3 text-sm text-muted">
                  {ilan.offerCount > 0
                    ? `${ilan.offerCount} araç sahibi teklif verdi.`
                    : 'Henüz teklif yok — ilk teklif seninki olabilir.'}
                </p>

                <Link
                  href={driver ? `/nakliyeci/ilan/${ilan.id}` : '/sofor-ol'}
                  className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-field bg-route px-5 text-sm font-bold text-[var(--route-ink)] transition hover:bg-[var(--route-hover)] active:translate-y-px"
                >
                  {driver ? 'Yükü gör ve teklif ver' : 'Teklif vermek için araç sahibi ol'}
                  <Icon name="arrowRight" size={16} />
                </Link>

                {!driver && (
                  <p className="mt-3 text-xs leading-relaxed text-muted">
                    Başvuru ücretsiz. Belgelerin onaylanınca bu yükün fotoğrafını, kalem
                    listesini ve kat bilgisini görüp teklif verebilirsin.
                  </p>
                )}

                <p className="label-mono mt-5 border-t border-line pt-4 text-muted">
                  İlan {kalanSure(ilan.expiresAt)} daha açık
                </p>
              </div>

              {/* Yük veren tarafı da bir çıkış kapısı: ziyaretçilerin bir kısmı
                  taşıyıcı değil, taşıtacak yükü olan kişi */}
              <div className="mt-3 rounded-card border border-dashed border-line p-5">
                <p className="text-sm font-bold">Senin de yükün mü var?</p>
                <p className="mt-1 text-sm text-muted">
                  Rotanı gir, tahmini fiyatı gör. Üyelik yalnızca ilanı yayınlarken gerekiyor.
                </p>
                <Link
                  href="/fiyat-hesapla"
                  className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold underline underline-offset-4 transition hover:text-[var(--route-deep)]"
                >
                  Fiyat hesapla
                  <Icon name="arrowRight" size={16} />
                </Link>
              </div>
            </aside>
          </div>

          {benzer.length > 0 && (
            <section className="mt-12">
              <h2 className="text-lg font-bold">{ilan.fromCity} çıkışlı diğer yükler</h2>
              <ListingRows listings={benzer} vehicles={vehicles} />
              <Link
                href={a ? `/ilanlar?il=${a.cityCode}` : '/ilanlar'}
                className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold underline underline-offset-4 transition hover:text-[var(--route-deep)]"
              >
                {ilan.fromCity} çıkışlı ilanların tamamı
                <Icon name="arrowRight" size={16} />
              </Link>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
