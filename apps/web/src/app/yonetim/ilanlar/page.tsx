import type { ListingStatus, ListingView } from '@tasiyoruz/contracts';
import { formatPrice } from '@tasiyoruz/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, canCallApi, homeFor, isOps } from '@/auth';
import { OpsNav } from '@/components/app/OpsNav';
import { RouteLine } from '@/components/app/RouteLine';
import { Shell } from '@/components/app/Shell';
import { StatusPill } from '@/components/app/StatusPill';
import { apiFetch } from '@/lib/api-server';
import { CancelListing } from './CancelListing';

export const metadata: Metadata = { title: 'İlanlar' };
export const dynamic = 'force-dynamic';

const FILTERS: { value: ListingStatus | 'HEPSI'; label: string }[] = [
  { value: 'OPEN', label: 'Açık' },
  { value: 'AWARDED', label: 'Taşıyıcı seçildi' },
  { value: 'EXPIRED', label: 'Süresi doldu' },
  { value: 'CANCELLED', label: 'İptal' },
  { value: 'HEPSI', label: 'Hepsi' },
];

export default async function OpsListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string }>;
}) {
  const [session, params] = await Promise.all([auth(), searchParams]);
  if (!canCallApi(session)) redirect('/giris');
  if (!isOps(session.roles)) redirect(homeFor(session.roles));

  const selected = FILTERS.find((f) => f.value === params.durum)?.value ?? 'OPEN';
  const query = selected === 'HEPSI' ? '' : `?status=${selected}`;
  const listings = await apiFetch<ListingView[]>(`/admin/listings${query}`);

  return (
    <Shell eyebrow="Operasyon" title="İlanlar">
      <OpsNav active="/yonetim/ilanlar" />

      <nav aria-label="Durum süzgeci" className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f.value} href={`/yonetim/ilanlar?durum=${f.value}`}
            aria-current={f.value === selected ? 'true' : undefined}
            className={`inline-flex min-h-11 items-center rounded-field border px-3.5 text-sm font-semibold transition ${
              f.value === selected
                ? 'border-amber bg-[var(--amber-soft)] text-[#8a5c10]'
                : 'border-line text-muted hover:border-muted hover:text-ink'
            }`}>
            {f.label}
          </Link>
        ))}
      </nav>

      {listings.length === 0 ? (
        <div className="mt-6 rounded-card border border-dashed border-line p-8 text-center">
          <p className="font-semibold">Bu durumda ilan yok.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {listings.map((l) => (
            <li key={l.id} className="rounded-card border border-line bg-surface p-5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="label-mono text-muted">{l.listingNumber}</span>
                <RouteLine l={l} />
                <StatusPill status={l.status} />
                <span className="label-mono text-muted">
                  {l.vehicleTypeCode} · {(l.estimate.distanceMeters / 1000).toFixed(0)} km · {l.offerCount} teklif
                </span>
                <span className="ml-auto text-sm text-muted">
                  tarife tahmini <span className="stat text-ink">{formatPrice(l.estimatedAmount.amount)}</span>
                </span>
              </div>
              {l.cargoDescription && <p className="mt-2 text-sm">{l.cargoDescription}</p>}
              <p className="label-mono mt-1 text-muted">
                {new Date(l.publishedAt).toLocaleString('tr-TR')} · son {new Date(l.expiresAt).toLocaleString('tr-TR')}
              </p>
              {l.status === 'OPEN' && (
                <div className="mt-4 border-t border-line pt-4">
                  <CancelListing listingId={l.id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
