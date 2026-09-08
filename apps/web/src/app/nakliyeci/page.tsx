import type { District, ListingView, OfferView } from '@tasiyoruz/contracts';
import { formatPrice } from '@tasiyoruz/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, canCallApi, homeFor, isDriver } from '@/auth';
import { ListingsMap, type MapListing } from '@/components/app/ListingsMap';
import { RouteLine } from '@/components/app/RouteLine';
import { Shell } from '@/components/app/Shell';
import { SubNav } from '@/components/app/SubNav';
import { apiFetch } from '@/lib/api-server';
import { getDistricts } from '@/lib/api';
import { StatusPill } from '@/components/app/StatusPill';
import { withdrawOffer } from './actions';
import { OfferForm } from './OfferForm';

export const metadata: Metadata = { title: 'Açık ilanlar' };
export const dynamic = 'force-dynamic';

/**
 * Yükün tek satırlık özeti.
 *
 * <p>Listede kalem kalem dökmek kartı bir ekran boyuna çıkarıyordu; ilk üç kalem ve
 * kalanın sayısı, "bu bana göre mi?" sorusuna yetiyor. Tamamı detay sayfasında.
 */
function cargoSummary(l: ListingView): string {
  if (l.cargoItems.length === 0) return l.cargoDescription ?? 'Beyan yok';
  const shown = l.cargoItems.slice(0, 3).map((i) => `${i.quantity}× ${i.displayName}`).join(', ');
  const rest = l.cargoItems.length - 3;
  return rest > 0 ? `${shown} ve ${rest} kalem daha` : shown;
}

export default async function DriverPage() {
  const session = await auth();
  if (!canCallApi(session)) redirect('/giris');
  if (!isDriver(session.roles)) redirect(homeFor(session.roles));
  // Taşıyıcının kendi teklifleri kartta gösterilir; aksi hâlde form yeniden çıkar ve
  // ikinci gönderim "zaten teklif verdiniz" ile döner.
  const [listings, myOffers, districts] = await Promise.all([
    apiFetch<ListingView[]>('/driver/listings/open'),
    apiFetch<OfferView[]>('/driver/offers'),
    // Harita için ilçe koordinatları. İlan görünümü yalnızca ilçe kimliği
    // taşıyor; enlem/boylam katalogdan geliyor.
    getDistricts(),
  ]);
  const mine = new Map(myOffers.filter((o) => o.status === 'SUBMITTED').map((o) => [o.listingId, o]));

  const byId = new Map((districts ?? []).map((d: District) => [d.id, d]));
  const place = (id: string) => byId.get(id);
  // Koordinatı bulunamayan ilan haritada çizilmiyor ama listede duruyor:
  // eksik bir katalog kaydı yüzünden iş gizlenmemeli.
  const mapListings: MapListing[] = listings.flatMap((l) => {
    const from = place(l.pickup.districtId);
    const to = place(l.dropoff.districtId);
    if (!from || !to) return [];
    return [{
      id: l.id,
      listingNumber: l.listingNumber,
      vehicleTypeCode: l.vehicleTypeCode,
      fromLabel: `${from.cityName}, ${from.name}`,
      toLabel: `${to.cityName}, ${to.name}`,
      from: { lat: from.lat, lng: from.lng },
      to: { lat: to.lat, lng: to.lng },
      km: Math.round(l.estimate.distanceMeters / 1000),
    }];
  });

  return (
    <Shell eyebrow="Araç sahibi" title="Açık ilanlar">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted">{session.user?.name ?? session.user?.email}</p>
        <SubNav
          items={[
            { href: '/nakliyeci/koridor', label: 'Boş dönüş' },
            { href: '/nakliyeci/isler', label: 'İşlerim' },
            { href: '/nakliyeci/teklifler', label: 'Tekliflerim' },
          ]}
          className="-mr-3"
        />
      </div>

      {listings.length === 0 ? (
        <div className="mt-6 rounded-card border border-dashed border-line p-8 text-center">
          <p className="font-semibold">Şu an açık ilan yok.</p>
          <p className="mt-1 text-sm text-muted">Dönüş rotanı <a href="/nakliyeci/koridor" className="font-semibold underline underline-offset-4 transition hover:text-ink">boş dönüş</a> sayfasında kaydet; o rotaya düşen yükler sana getirilsin.</p>
        </div>
      ) : (
        <>
          {mapListings.length > 0 && (
            <div className="mt-6">
              <ListingsMap listings={mapListings} />
            </div>
          )}
        <ul className="mt-6 space-y-4">
          {listings.map((l) => (
            <li
              key={l.id}
              id={`ilan-${l.id}`}
              // Haritadan gelen bağlantı kartı sabit menünün altına sokmasın
              className="scroll-mt-24 rounded-card border border-line bg-surface p-5"
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="label-mono text-muted">{l.listingNumber}</span>
                <RouteLine l={l} />
                <span className="label-mono text-muted">{l.vehicleTypeCode} · {(l.estimate.distanceMeters / 1000).toFixed(0)} km</span>
                <span className="ml-auto text-sm text-muted">tarife tahmini <span className="stat text-ink">{formatPrice(l.estimatedAmount.amount)}</span></span>
              </div>
              <p className="mt-2 text-sm">{cargoSummary(l)}</p>
              <p className="label-mono mt-1 text-muted">
                {l.offerCount} teklif · {new Date(l.expiresAt).toLocaleString('tr-TR')} tarihine kadar açık
              </p>
              {/* Detay teklif düğmesinin üstünde: fotoğrafa bakmadan fiyat vermek tam
                  olarak düzeltmeye çalıştığımız alışkanlık */}
              <Link href={`/nakliyeci/ilan/${l.id}`}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4 transition hover:text-route-deep">
                Yükü gör
                {l.photos.length > 0 && (
                  <span className="label-mono font-normal text-muted">{l.photos.length} fotoğraf</span>
                )}
              </Link>
              <div className="mt-4 border-t border-line pt-4">
                {mine.get(l.id) ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm">Teklifin: <span className="stat">{formatPrice(mine.get(l.id)!.amount.amount)}</span></span>
                    <StatusPill status="SUBMITTED" />
                    <form action={async () => { 'use server'; await withdrawOffer(mine.get(l.id)!.id); }}>
                      <button type="submit" className="rounded-field border border-line px-3 py-2 text-sm font-semibold transition hover:border-route hover:bg-surface-2">Geri çek</button>
                    </form>
                  </div>
                ) : (
                  <OfferForm listingId={l.id} suggested={Number(l.estimatedAmount.amount).toFixed(0)} />
                )}
              </div>
            </li>
          ))}
        </ul>
        </>
      )}
    </Shell>
  );
}
