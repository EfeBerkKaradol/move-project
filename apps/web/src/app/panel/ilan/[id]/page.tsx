import type { CarrierRatingView, ListingView, OfferView, RatingView, TripView } from '@tasiyoruz/contracts';
import { TRIP_STAGE_LABELS } from '@tasiyoruz/contracts';
import { formatPrice } from '@tasiyoruz/shared';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { auth, canCallApi, homeFor, isCustomer } from '@/auth';
import { RouteLine } from '@/components/app/RouteLine';
import { Shell } from '@/components/app/Shell';
import { StatusPill } from '@/components/app/StatusPill';
import { TripPhotos } from '@/components/app/TripPhotos';
import { TripTimeline } from '@/components/app/TripTimeline';
import { ApiError, apiFetch } from '@/lib/api-server';
import { acceptOffer, cancelListing, confirmDelivery } from '../../actions';
import { RatingForm } from './RatingForm';

export const metadata: Metadata = { title: 'İlan' };
export const dynamic = 'force-dynamic';

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const [session, { id }] = await Promise.all([auth(), params]);
  if (!canCallApi(session)) redirect('/giris');
  if (!isCustomer(session.roles)) redirect(homeFor(session.roles));

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
  // Puanlar ayrı uçtan: pazar yeri puanlamaya bağımlı olsaydı modüller döngüye girerdi
  const ratingById = new Map<string, CarrierRatingView>();
  if (offers.length > 0) {
    const ids = [...new Set(offers.map((o) => o.carrierId))].join(',');
    const ratings = await apiFetch<CarrierRatingView[]>(`/carriers/ratings?ids=${ids}`).catch(() => [] as CarrierRatingView[]);
    for (const r of ratings) ratingById.set(r.carrierId, r);
  }
  const myRating = trip?.stage === 'COMPLETED'
    ? await apiFetch<RatingView>(`/trips/${trip.id}/rating`).catch(() => null)
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
                <li key={o.id} className={`rounded-card border p-4 ${o.id === listing.awardedOfferId ? 'border-route bg-[var(--route-soft)]' : 'border-line bg-surface'}`}>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="font-bold">{o.carrierDisplayName ?? 'Araç sahibi'}</span>
                    {o.verified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#dff0e5] px-2.5 py-1 text-xs font-semibold text-[#1f6b45]">
                        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m3.5 8.5 3 3 6-7" /></svg>
                        Doğrulanmış
                      </span>
                    )}
                    <span className="stat ml-auto text-lg">{formatPrice(o.amount.amount)}</span>
                    <StatusPill status={o.status} />
                  </div>
                  <p className="label-mono mt-2 text-muted">
                    {o.vehicleTypeCode ? `${o.vehicleTypeCode} · ${o.plate}` : 'araç bilgisi yok'}
                    {' · '}
                    {(() => {
                      const r = ratingById.get(o.carrierId);
                      if (!r) return 'puan yok';
                      const puan = r.averageScore == null ? 'puan yok' : `★ ${r.averageScore.toFixed(1)} (${r.ratingCount})`;
                      return `${puan} · ${r.completedJobs} iş`;
                    })()}
                  </p>
                  {o.note && <p className="mt-2 text-sm text-muted">“{o.note}”</p>}
                  {open && o.status === 'SUBMITTED' && (
                    <form action={async () => { 'use server'; await acceptOffer(listing.id, o.id); }} className="mt-3">
                      <button type="submit" className="min-h-11 rounded-field bg-route px-4 py-2.5 text-sm font-bold text-[var(--route-ink)] transition hover:bg-[var(--route-hover)] hover:shadow-[0_6px_18px_rgb(244_159_44_/_0.30)] active:translate-y-px">Bu teklifi kabul et</button>
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
              {trip.photos.length > 0 && (
                <div className="mt-5">
                  <p className="label-mono text-muted">Taşıma kareleri</p>
                  <TripPhotos tripId={trip.id} photos={trip.photos} />
                </div>
              )}
              {trip.stage === 'DELIVERED' && (
                <div className="mt-4 rounded-field bg-[var(--route-soft)] p-3">
                  <p className="text-sm">Taşıyıcı teslimi bildirdi{trip.proofOfDelivery ? ` — teslim alan: ${trip.proofOfDelivery.receivedByName.replace(/\.$/, '')}` : ''}. Yükünüzü aldıysanız onaylayın.</p>
                  <form action={async () => { 'use server'; await confirmDelivery(trip.id, listing.id); }} className="mt-3">
                    <button type="submit" className="min-h-11 rounded-field bg-route px-4 py-2.5 text-sm font-bold text-[var(--route-ink)] transition hover:bg-[var(--route-hover)] hover:shadow-[0_6px_18px_rgb(244_159_44_/_0.30)] active:translate-y-px">Teslimatı onayla</button>
                  </form>
                </div>
              )}
              {trip.stage === 'COMPLETED' && (
                <div className="mt-4 border-t border-line pt-4">
                  <p className="text-sm font-semibold text-[#1f6b45]">Taşıma tamamlandı. Teşekkürler.</p>
                  <div className="mt-4">
                    {myRating ? (
                      <p className="text-sm text-muted">
                        Puanın: <span className="text-[var(--route-deep)]">{'★'.repeat(myRating.score)}</span>
                        {myRating.comment ? ` · “${myRating.comment}”` : ''}
                      </p>
                    ) : (
                      <RatingForm tripId={trip.id} listingId={listing.id} />
                    )}
                  </div>
                </div>
              )}
            </>
          ) : listing.status === 'AWARDED' ? (
            <p className="mt-2">Taşıyıcı seçildi, iş açılıyor… Sayfayı yenileyin.</p>
          ) : (
            <p className="mt-2 text-muted">Bu ilan kapalı.</p>
          )}
          {open && (
            <form action={async () => { 'use server'; await cancelListing(listing.id); }} className="mt-4">
              <button type="submit" className="min-h-11 rounded-field border border-line px-4 py-2.5 text-sm font-semibold transition hover:border-route hover:bg-surface-2">İlanı iptal et</button>
            </form>
          )}
        </aside>
      </div>
    </Shell>
  );
}
