import type { District, VehicleType } from '@tasiyoruz/contracts';
import { formatPrice } from '@tasiyoruz/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth, isDriver } from '@/auth';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { Icon } from '@/components/ui/Icon';
import { getDistricts, getPublicListing, getVehicleTypes } from '@/lib/api';
import { RouteMiniMap } from './RouteMiniMap';

type Params = Promise<{ id: string }>;

/**
 * İlanın kendi sayfası.
 *
 * <p>Pano kartları eskiden doğrudan teklif akışına gidiyordu: araç sahibi olmayan
 * ziyaretçi "araç sahibi ol" sayfasına düşüyor, ilanı hiç göremiyordu. Oysa
 * kaydolup olmayacağına karar vermek için önce işi görmesi gerekiyor.
 *
 * <p><strong>Ne gösteriliyor:</strong> rota, araç, mesafe, büyüklük, tarife
 * tahmini ve yayın penceresi — yani listedeki kartın taşıdığı her şey, okunur
 * bir düzende ve paylaşılabilir bir adreste. <strong>Ne gösterilmiyor:</strong>
 * adres, fotoğraf, kalem listesi, kat/asansör ve yük verenin kimliği. Sunucu
 * bunları herkese açık uçta hiç göndermiyor; gizleme burada değil uçta yapılıyor
 * (bkz. PublicListingView).
 */
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
  if (saat < 24) return `${saat} saat geçerli`;
  return `${Math.round(saat / 24)} gün geçerli`;
}

export default async function PublicListingPage({ params }: { params: Params }) {
  const { id } = await params;
  const [ilan, vehicles, districts, session] = await Promise.all([
    getPublicListing(id),
    getVehicleTypes(),
    getDistricts(),
    auth(),
  ]);

  // Kapanmış, süresi dolmuş ya da hiç var olmamış ilan aynı cevabı alıyor:
  // "bu ilan var ama sana kapalı" demek, olmayan bir ilanı da ele verirdi
  if (!ilan) notFound();

  const driver = !!session && session.error !== 'RefreshFailed' && isDriver(session.roles ?? []);
  const nokta = (dId: string) => (districts ?? []).find((d: District) => d.id === dId) ?? null;
  const a = nokta(ilan.fromDistrictId);
  const b = nokta(ilan.toDistrictId);
  const ilIci = !!a && !!b && a.cityCode === b.cityCode;

  const satirlar: { etiket: string; deger: string }[] = [
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
    {
      etiket: 'Model',
      deger: ilan.serviceModel === 'SCHEDULED' ? 'Planlı taşıma' : 'Anlık taşıma',
    },
    { etiket: 'Teklif', deger: `${ilan.offerCount} teklif verildi` },
    { etiket: 'Yayın', deger: `${gecenSure(ilan.publishedAt)} · ${kalanSure(ilan.expiresAt)}` },
  ];

  return (
    <>
      <Header />
      <main className="theme-cream min-h-screen bg-bg text-ink">
        <div className="mx-auto max-w-[52rem] px-6 py-10 md:py-14">
          {/* Panoya dönüş: ilanın ili süzülü kalsın, kullanıcı baktığı yere dönsün */}
          <Link
            href={a ? `/ilanlar?il=${a.cityCode}` : '/ilanlar'}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-ink"
          >
            <span aria-hidden>←</span>
            Açık ilanlar
          </Link>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <h1 className="text-[clamp(1.6rem,4vw,2.4rem)] leading-[1.1]">
              {ilan.fromDistrict}, {ilan.fromCity}
              <span className="text-muted"> → </span>
              {ilan.toDistrict}, {ilan.toCity}
            </h1>
            <p className="text-right">
              <span className="stat text-[1.75rem] leading-none">
                {formatPrice(String(ilan.estimatedAmount))}
              </span>
              <span className="label-mono mt-1 block text-muted">tarife tahmini</span>
            </p>
          </div>

          <RouteMiniMap from={a} to={b} />

          <dl className="mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {satirlar.map((s) => (
              <div key={s.etiket} className="border-t border-line pt-3">
                <dt className="label-mono text-muted">{s.etiket}</dt>
                <dd className="mt-1 font-semibold">{s.deger}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-10 rounded-card border border-line bg-surface p-6 md:p-8">
            <h2 className="text-lg font-bold">
              {driver ? 'Bu yükü taşıyabilirsin' : 'Teklif vermek için araç sahibi olmalısın'}
            </h2>
            <p className="mt-2 text-sm text-muted">
              Adres, fotoğraf, kalem listesi ve kat/asansör bilgisi burada yayınlanmıyor.
              Onaylı araç sahibi teklif ekranında hepsini görüyor; yük verenin kişi bilgisi
              ise ancak taşıma anlaşılınca açılıyor.
            </p>
            <Link
              href={driver ? `/nakliyeci/ilan/${ilan.id}` : '/sofor-ol'}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-field bg-route px-5 text-sm font-bold text-[var(--route-ink)] transition hover:bg-[var(--route-hover)] active:translate-y-px"
            >
              {driver ? 'Yükü gör ve teklif ver' : 'Araç sahibi ol'}
              <Icon name="arrowRight" size={16} />
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
