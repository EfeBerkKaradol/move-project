import type { ListingView, OfferView } from '@tasiyoruz/contracts';
import { formatPrice } from '@tasiyoruz/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth, canCallApi, homeFor, isDriver } from '@/auth';
import { CargoPanel } from '@/components/app/CargoPanel';
import { RouteLine } from '@/components/app/RouteLine';
import { Shell } from '@/components/app/Shell';
import { StatusPill } from '@/components/app/StatusPill';
import { ApiError, apiFetch } from '@/lib/api-server';
import { withdrawOffer } from '../../actions';
import { OfferForm } from '../../OfferForm';

export const metadata: Metadata = { title: 'İlan detayı' };
export const dynamic = 'force-dynamic';

/**
 * Araç sahibinin ilan ekranı.
 *
 * <p>Liste teklif vermeye yetmiyordu: yükün ne olduğu tek satır serbest metindeydi ve
 * fotoğrafa hiç yer yoktu. Teklif, görülmemiş bir yüke veriliyordu. Bu sayfa teklif
 * için gereken her şeyi bir arada gösteriyor — beyan, kareler, kat ve asansör, tarife
 * tahmini.
 *
 * <p>Adres ve kişi bilgisi burada da yok; onlar iş verildikten sonra açılıyor.
 */
export default async function CarrierListingPage({ params }: { params: Promise<{ id: string }> }) {
  const [session, { id }] = await Promise.all([auth(), params]);
  if (!canCallApi(session)) redirect('/giris');
  if (!isDriver(session.roles)) redirect(homeFor(session.roles));

  let listing: ListingView;
  try {
    listing = await apiFetch<ListingView>(`/driver/listings/${id}`);
  } catch (e) {
    // Kapanmış ya da başkasına verilmiş ilan da 404: "yetkin yok" demek bile o ilanın
    // var olduğunu söylerdi
    if (e instanceof ApiError && (e.status === 404 || e.status === 403)) notFound();
    throw e;
  }

  const myOffers = await apiFetch<OfferView[]>('/driver/offers');
  const mine = myOffers.find((o) => o.listingId === listing.id && o.status === 'SUBMITTED');
  const stop = (p: ListingView['pickup']) =>
    `${p.floor ?? 0}. kat · ${p.hasElevator ? 'asansör var' : 'asansör yok'}`;

  return (
    <Shell eyebrow="Araç sahibi" title={listing.listingNumber}>
      <Link href="/nakliyeci" className="label-mono text-muted underline-offset-4 transition hover:text-ink hover:underline">
        ← Açık ilanlar
      </Link>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
        <div className="grid gap-4">
          <section className="rounded-card border border-line bg-surface p-5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <RouteLine l={listing} />
              <span className="label-mono text-muted">
                {listing.vehicleTypeCode} · {(listing.estimate.distanceMeters / 1000).toFixed(0)} km
              </span>
              <StatusPill status={listing.status} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="label-mono text-muted">Alış</dt><dd>{stop(listing.pickup)}</dd></div>
              <div><dt className="label-mono text-muted">Teslim</dt><dd>{stop(listing.dropoff)}</dd></div>
              <div><dt className="label-mono text-muted">Ne zaman</dt><dd>{listing.serviceModel === 'INSTANT' ? 'Anlık' : 'Planlı'}</dd></div>
              <div>
                <dt className="label-mono text-muted">Açık kalma</dt>
                <dd>{new Date(listing.expiresAt).toLocaleString('tr-TR')}</dd>
              </div>
            </dl>
            {listing.extraServices.length > 0 && (
              <p className="label-mono mt-4 text-muted">Ek hizmet · {listing.extraServices.join(' · ')}</p>
            )}
          </section>

          <CargoPanel listing={listing} />
        </div>

        <aside className="h-fit rounded-card border border-line bg-surface p-5 lg:sticky lg:top-24">
          <p className="label-mono text-muted">Tarife tahmini</p>
          <p className="stat mt-1 text-2xl">{formatPrice(listing.estimatedAmount.amount)}</p>
          <p className="label-mono mt-1 text-muted">{listing.offerCount} teklif verildi</p>

          <div className="mt-4 border-t border-line pt-4">
            {mine ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm">Teklifin: <span className="stat">{formatPrice(mine.amount.amount)}</span></span>
                <StatusPill status="SUBMITTED" />
                <form action={async () => { 'use server'; await withdrawOffer(mine.id); }}>
                  <button type="submit" className="rounded-field border border-line px-3 py-2 text-sm font-semibold transition hover:border-route hover:bg-surface-2">
                    Geri çek
                  </button>
                </form>
              </div>
            ) : listing.status === 'OPEN' ? (
              <OfferForm listingId={listing.id} suggested={Number(listing.estimatedAmount.amount).toFixed(0)} />
            ) : (
              <p className="text-sm text-muted">Bu ilan artık teklif almıyor.</p>
            )}
          </div>

          <p className="mt-4 text-xs text-muted">
            Adres ve iletişim bilgisi işi üstlendiğinde açılır.
          </p>
        </aside>
      </div>
    </Shell>
  );
}
