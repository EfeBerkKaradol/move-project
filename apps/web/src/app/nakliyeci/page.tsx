import type { ListingView, OfferView } from '@tasiyoruz/contracts';
import { formatPrice } from '@tasiyoruz/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, isDriver } from '@/auth';
import { RouteLine } from '@/components/app/RouteLine';
import { Shell } from '@/components/app/Shell';
import { apiFetch } from '@/lib/api-server';
import { StatusPill } from '@/components/app/StatusPill';
import { withdrawOffer } from './actions';
import { OfferForm } from './OfferForm';

export const metadata: Metadata = { title: 'Açık ilanlar' };
export const dynamic = 'force-dynamic';

export default async function DriverPage() {
  const session = await auth();
  if (!session || !isDriver(session.roles)) redirect('/panel');
  // Taşıyıcının kendi teklifleri kartta gösterilir; aksi hâlde form yeniden çıkar ve
  // ikinci gönderim "zaten teklif verdiniz" ile döner.
  const [listings, myOffers] = await Promise.all([
    apiFetch<ListingView[]>('/driver/listings/open'),
    apiFetch<OfferView[]>('/driver/offers'),
  ]);
  const mine = new Map(myOffers.filter((o) => o.status === 'SUBMITTED').map((o) => [o.listingId, o]));

  return (
    <Shell eyebrow="Araç sahibi" title="Açık ilanlar">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted">{session.user?.name ?? session.user?.email}</p>
        <span className="flex gap-4 text-sm font-semibold underline underline-offset-4">
          <Link href="/nakliyeci/isler">İşlerim</Link>
          <Link href="/nakliyeci/teklifler">Tekliflerim</Link>
        </span>
      </div>

      {listings.length === 0 ? (
        <div className="mt-6 rounded-card border border-dashed border-line p-8 text-center">
          <p className="font-semibold">Şu an açık ilan yok.</p>
          <p className="mt-1 text-sm text-muted">Koridorunu kaydettiğinde uygun yükler sana bildirilecek (boş dönüş eşleştirme sırada).</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {listings.map((l) => (
            <li key={l.id} className="rounded-card border border-line bg-surface p-5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="label-mono text-muted">{l.listingNumber}</span>
                <RouteLine l={l} />
                <span className="label-mono text-muted">{l.vehicleTypeCode} · {(l.estimate.distanceMeters / 1000).toFixed(0)} km</span>
                <span className="ml-auto text-sm text-muted">tarife tahmini <span className="stat text-ink">{formatPrice(l.estimatedAmount.amount)}</span></span>
              </div>
              {l.cargoDescription && <p className="mt-2 text-sm">{l.cargoDescription}</p>}
              <p className="label-mono mt-1 text-muted">{l.offerCount} teklif · {new Date(l.expiresAt).toLocaleString('tr-TR')} tarihine kadar açık</p>
              <div className="mt-4 border-t border-line pt-4">
                {mine.get(l.id) ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm">Teklifin: <span className="stat">{formatPrice(mine.get(l.id)!.amount.amount)}</span></span>
                    <StatusPill status="SUBMITTED" />
                    <form action={async () => { 'use server'; await withdrawOffer(mine.get(l.id)!.id); }}>
                      <button type="submit" className="rounded-field border border-line px-3 py-2 text-sm font-semibold">Geri çek</button>
                    </form>
                  </div>
                ) : (
                  <OfferForm listingId={l.id} suggested={Number(l.estimatedAmount.amount).toFixed(0)} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
