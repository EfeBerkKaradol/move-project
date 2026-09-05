import type { ListingView, OfferView, TripView } from '@tasiyoruz/contracts';
import { TRIP_STAGE_LABELS } from '@tasiyoruz/contracts';
import { formatPrice } from '@tasiyoruz/shared';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { auth, isCustomer } from '@/auth';
import { RouteLine } from '@/components/app/RouteLine';
import { Shell } from '@/components/app/Shell';
import { StatusPill } from '@/components/app/StatusPill';
import { TripTimeline } from '@/components/app/TripTimeline';
import { ApiError, apiFetch } from '@/lib/api-server';
import { acceptOffer, cancelListing, confirmDelivery } from '../../actions';

export const metadata: Metadata = { title: 'İlan' };
export const dynamic = 'force-dynamic';

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const [session, { id }] = await Promise.all([auth(), params]);
  if (!session || !isCustomer(session.roles)) redirect('/nakliyeci');

  let listing: ListingView; let offers: OfferView[];
  try {
    [listing, offers] = await Promise.all([
      apiFetch<ListingView>(`/listings/${id}`), apiFetch<OfferView[]>(`/listings/${id}/offers`),
    ]);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 403)) notFound();
    throw e;
  }
  const open = listing.status === 'OPEN';
  const pending = offers.filter((o) => o.status === 'SUBMITTED');
  // İş, kabul olayından hemen sonra async açılır; birkaç yüz ms gecikebilir
  const trip = listing.status === 'AWARDED'
    ? await apiFetch<TripView>(`/trips/by-listing/${listing.id}`).catch(() => null)
    : null;

  return (
    <Shell eyebrow={listing.listingNumber} title={open ? 'Teklifler toplanıyor' : 'İlan'}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section>
          <div className="flex flex-wrap items-center gap-3">
            <RouteLine l={listing} /><StatusPill status={listing.status} />
          </div>
          <p className="label-mono mt-2 text-muted">
            {listing.vehicleTypeCode} · {(listing.estimate.distanceMeters / 1000).toFixed(0)} km · tarife tahmini {formatPrice(listing.estimatedAmount.amount)}
          </p>
          {listing.cargoDescription && <p className="mt-4 text-sm">{listing.cargoDescription}</p>}

          <h2 className="mt-8 text-lg">Teklifler ({offers.length})</h2>
          {offers.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Henüz teklif yok. Araç sahipleri ilanı görüyor; ilk teklifler genelde dakikalar içinde gelir.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {[...offers].sort((a, b) => Number(a.amount.amount) - Number(b.amount.amount)).map((o) => (
                <li key={o.id} className={`rounded-card border p-4 ${o.id === listing.awardedOfferId ? 'border-amber bg-[var(--amber-soft)]' : 'border-line bg-surface'}`}>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="font-bold">{o.carrierDisplayName ?? 'Araç sahibi'}</span>
                    <span className="label-mono text-muted">{o.rating == null ? 'puan yok' : `★ ${o.rating}`} · {o.completedJobs == null ? 'iş geçmişi yok' : `${o.completedJobs} iş`}</span>
                    <span className="stat ml-auto text-lg">{formatPrice(o.amount.amount)}</span>
                    <StatusPill status={o.status} />
                  </div>
                  {o.note && <p className="mt-2 text-sm text-muted">“{o.note}”</p>}
                  {open && o.status === 'SUBMITTED' && (
                    <form action={async () => { 'use server'; await acceptOffer(listing.id, o.id); }} className="mt-3">
                      <button type="submit" className="rounded-field bg-amber px-4 py-2.5 text-sm font-bold text-[var(--amber-ink)]">Bu teklifi kabul et</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="h-fit rounded-card border border-line bg-surface p-5 text-sm">
          <p className="label-mono text-muted">Durum</p>
          {open ? (
            <p className="mt-2">{pending.length} teklif bekliyor. İlan {new Date(listing.expiresAt).toLocaleString('tr-TR')} tarihine kadar açık.</p>
          ) : listing.status === 'AWARDED' && trip ? (
            <>
              <p className="mt-2">
                <span className="font-bold">{trip.carrierDisplayName ?? 'Taşıyıcı'}</span> · {TRIP_STAGE_LABELS[trip.stage]}
              </p>
              <div className="mt-4"><TripTimeline trip={trip} /></div>
              {trip.stage === 'DELIVERED' && (
                <div className="mt-4 rounded-field bg-[var(--amber-soft)] p-3">
                  <p className="text-sm">Taşıyıcı teslimi bildirdi{trip.proofOfDelivery ? ` — teslim alan: ${trip.proofOfDelivery.receivedByName.replace(/\.$/, '')}` : ''}. Yükünüzü aldıysanız onaylayın.</p>
                  <form action={async () => { 'use server'; await confirmDelivery(trip.id, listing.id); }} className="mt-3">
                    <button type="submit" className="rounded-field bg-amber px-4 py-2.5 text-sm font-bold text-[var(--amber-ink)]">Teslimatı onayla</button>
                  </form>
                </div>
              )}
              {trip.stage === 'COMPLETED' && <p className="mt-3 text-sm font-semibold text-[#1f6b45]">Taşıma tamamlandı. Teşekkürler.</p>}
            </>
          ) : listing.status === 'AWARDED' ? (
            <p className="mt-2">Taşıyıcı seçildi, iş açılıyor… Sayfayı yenileyin.</p>
          ) : (
            <p className="mt-2 text-muted">Bu ilan kapalı.</p>
          )}
          {open && (
            <form action={async () => { 'use server'; await cancelListing(listing.id); }} className="mt-4">
              <button type="submit" className="rounded-field border border-line px-4 py-2.5 text-sm font-semibold">İlanı iptal et</button>
            </form>
          )}
        </aside>
      </div>
    </Shell>
  );
}
