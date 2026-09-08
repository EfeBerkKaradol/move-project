import type { District, VehicleType } from '@tasiyoruz/contracts';
import { formatPrice } from '@tasiyoruz/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { auth, isDriver } from '@/auth';
import { ListingsMap, type MapListing } from '@/components/app/ListingsMap';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { Icon } from '@/components/ui/Icon';
import { getDistricts, getPublicListings, getVehicleTypes } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Açık ilanlar',
  description: 'Şu an teklif bekleyen yükler: nereden nereye, hangi araç, ne kadar büyük.',
};

type Params = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

/**
 * Açık ilanlar panosu — giriş gerektirmiyor.
 *
 * <p>Koridor sayaçları "bu hatta iş var" diyordu ama araç sahibi adayına işin neye
 * benzediğini göstermiyordu; kaydolmadan önce ürünün boş olmadığını görmek istiyor.
 * Bu sayfa ilanları tek tek gösteriyor.
 *
 * <p><strong>Sınır:</strong> rota (ilçe düzeyinde), araç, büyüklük ve tarife tahmini
 * var. Fotoğraf, yük açıklaması, kalem dökümü, kat/asansör ve yük verenin kimliği
 * yok — onlar teklif için gereken ayrıntılar ve onaylı araç sahibine açılıyor.
 * Sunucu da bunları hiç göndermiyor, gizleme burada değil uçta yapılıyor.
 */
export default async function PublicListingsPage({ searchParams }: { searchParams: Params }) {
  const [session, p, vehicles, districts] = await Promise.all([
    auth(), searchParams, getVehicleTypes(), getDistricts(),
  ]);
  const vehicleFilter = first(p.arac);
  // Ana sayfadaki koridor kartı buraya il koduyla geliyor; ziyaretçi kendi hattını
  // aramak zorunda kalmasın
  const cityFilter = first(p.il);
  const listings = await getPublicListings({
    vehicleType: vehicleFilter || undefined,
    city: cityFilter || undefined,
  });
  const cityName = cityFilter
    ? (districts ?? []).find((d: District) => d.cityCode === cityFilter)?.cityName ?? null
    : null;

  const signedInDriver = !!session && isDriver(session.roles ?? []);
  // Araç sahibi olmayan ziyaretçi teklif veremiyor; onu yükü göremeyeceği bir
  // giriş ekranına değil, ne yapması gerektiğini anlatan sayfaya gönderiyoruz.
  const detailHref = (id: string) => (signedInDriver ? `/nakliyeci/ilan/${id}` : '/sofor-ol');

  const byId = new Map((districts ?? []).map((d: District) => [d.id, d]));
  const mapListings: MapListing[] = (listings ?? []).flatMap((l) => {
    const from = byId.get(l.fromDistrictId);
    const to = byId.get(l.toDistrictId);
    if (!from || !to) return [];
    return [{
      id: l.id, listingNumber: '', vehicleTypeCode: l.vehicleTypeCode,
      fromLabel: `${l.fromCity}, ${l.fromDistrict}`, toLabel: `${l.toCity}, ${l.toDistrict}`,
      from: { lat: from.lat, lng: from.lng }, to: { lat: to.lat, lng: to.lng }, km: l.distanceKm,
    }];
  });

  const active = (vehicles ?? []).filter((v: VehicleType) => v.active);

  return (
    <>
      <Header />
      <main className="theme-cream min-h-screen bg-bg text-ink">
        <div className="mx-auto max-w-[76rem] px-6 py-12 md:py-16">
          <p className="label-mono text-[var(--route-deep)]">Şu an yolda</p>
          <h1 className="mt-3 text-[clamp(1.9rem,4.5vw,2.9rem)] leading-[1.06]">
            Teklif bekleyen yükler.
          </h1>
          <p className="mt-4 max-w-xl text-muted">
            Adres, fotoğraf ve kişi bilgisi burada yok — onları teklif veren onaylı araç
            sahibi görüyor. Burada gördüğün, işin nereden nereye gittiği ve ne kadar büyük
            olduğu.
          </p>

          {cityName && (
            <p className="mt-6 flex flex-wrap items-center gap-3">
              <span className="inline-flex min-h-11 items-center rounded-field border border-[var(--route-deep)] bg-[var(--route-soft)] px-4 text-sm font-bold">
                {cityName} çıkışlı
              </span>
              <Link href={vehicleFilter ? `/ilanlar?arac=${vehicleFilter}` : '/ilanlar'}
                className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 transition hover:text-[var(--route-deep)]">
                Süzgeci kaldır
              </Link>
            </p>
          )}

          {active.length > 0 && (
            <nav aria-label="Araç tipine göre süz" className="mt-8 flex flex-wrap gap-2">
              <FilterChip href={withCity('/ilanlar', cityFilter)} label="Tümü" selected={!vehicleFilter} />
              {active.map((v: VehicleType) => (
                <FilterChip
                  key={v.code}
                  href={withCity(`/ilanlar?arac=${v.code}`, cityFilter)}
                  label={v.displayName}
                  selected={vehicleFilter === v.code}
                />
              ))}
            </nav>
          )}

          {!listings || listings.length === 0 ? (
            <div className="mt-10 rounded-card border border-dashed border-line p-8 text-center">
              <p className="font-semibold">
                {vehicleFilter || cityName ? 'Bu süzgeçle açık ilan yok.' : 'Şu an açık ilan yok.'}
              </p>
              <p className="mt-1 text-sm text-muted">
                {vehicleFilter || cityName ? (
                  <Link href="/ilanlar" className="font-semibold underline underline-offset-4">
                    Tüm ilanlara bak
                  </Link>
                ) : (
                  'Yeni ilanlar gün içinde düşüyor; birazdan tekrar bak.'
                )}
              </p>
            </div>
          ) : (
            <>
              {mapListings.length > 0 && (
                <div className="mt-10">
                  <ListingsMap listings={mapListings} />
                </div>
              )}

              <ul className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {listings.map((l) => (
                  <li
                    key={l.id}
                    id={`ilan-${l.id}`}
                    // Haritadan gelen bağlantı kartı yapışkan başlığın altına sokmasın
                    className="scroll-mt-24 flex flex-col rounded-card border border-line bg-surface p-5"
                  >
                    <p className="flex items-start gap-2 font-bold">
                      <span aria-hidden className="mt-0.5 shrink-0 text-[var(--route-deep)]">
                        <Icon name="route" size={20} />
                      </span>
                      <span className="min-w-0">
                        {l.fromCity}, {l.fromDistrict}
                        <span className="text-muted"> → </span>
                        {l.toCity}, {l.toDistrict}
                      </span>
                    </p>

                    <p className="label-mono mt-3 text-muted">
                      {vehicleName(active, l.vehicleTypeCode)} · {l.distanceKm} km ·{' '}
                      {l.pieceCount} parça
                      {l.volumeM3 > 0 && ` · ${l.volumeM3.toLocaleString('tr-TR')} m³`}
                    </p>

                    <p className="mt-3 text-sm text-muted">
                      tarife tahmini{' '}
                      <span className="stat text-ink">{formatPrice(String(l.estimatedAmount))}</span>
                    </p>

                    <p className="label-mono mt-1 text-muted">
                      {l.offerCount} teklif · {shortDateTime(l.expiresAt)} tarihine kadar açık
                    </p>

                    <Link
                      href={detailHref(l.id)}
                      className="mt-4 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-field border border-line px-4 text-sm font-semibold transition hover:border-route hover:bg-surface-2"
                    >
                      {signedInDriver ? 'Yükü gör ve teklif ver' : 'Teklif vermek için araç sahibi ol'}
                      <Icon name="arrowRight" size={16} />
                    </Link>
                  </li>
                ))}
              </ul>

              {!signedInDriver && (
                <div className="mt-10 rounded-card border border-line bg-surface p-6 md:p-8">
                  <h2 className="text-lg font-bold">Bu yükleri taşımak istiyorsan</h2>
                  <p className="mt-2 max-w-xl text-sm text-muted">
                    Araç sahibi başvurusu onaylandığında yükün fotoğrafını, kalem listesini,
                    kat ve asansör bilgisini görür ve teklif verebilirsin. Belgeler yüklenip
                    onaylanana kadar teklif açılmıyor.
                  </p>
                  <Link
                    href="/sofor-ol"
                    className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-field bg-route px-5 text-sm font-bold text-[var(--route-ink)] transition hover:bg-[var(--route-hover)] active:translate-y-px"
                  >
                    Araç sahibi ol
                    <Icon name="arrowRight" size={16} />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function FilterChip({ href, label, selected }: { href: string; label: string; selected: boolean }) {
  return (
    <Link
      href={href}
      aria-current={selected ? 'true' : undefined}
      className={[
        'inline-flex min-h-11 items-center rounded-field border px-4 text-sm font-semibold transition',
        selected
          ? 'border-[var(--route-deep)] bg-[var(--route-soft)] text-ink'
          : 'border-line text-muted hover:border-muted hover:text-ink',
      ].join(' ')}
    >
      {label}
    </Link>
  );
}

/** Araç süzgeci değişirken il süzgeci düşmesin; ikisi birlikte çalışıyor. */
function withCity(href: string, cityCode: string): string {
  if (!cityCode) return href;
  return `${href}${href.includes('?') ? '&' : '?'}il=${cityCode}`;
}

/** Katalogda karşılığı yoksa kodun kendisi — boş bırakmaktan iyi. */
function vehicleName(vehicles: VehicleType[], code: string): string {
  return vehicles.find((v) => v.code === code)?.displayName ?? code;
}

function shortDateTime(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
}
