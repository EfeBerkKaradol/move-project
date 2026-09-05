import type { ListingView } from '@tasiyoruz/contracts';
import { formatPrice } from '@tasiyoruz/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, isCustomer } from '@/auth';
import { RouteLine } from '@/components/app/RouteLine';
import { Shell } from '@/components/app/Shell';
import { StatusPill } from '@/components/app/StatusPill';
import { apiFetch } from '@/lib/api-server';

export const metadata: Metadata = { title: 'İlanlarım' };
export const dynamic = 'force-dynamic';

export default async function PanelPage() {
  const session = await auth();
  if (!session || !isCustomer(session.roles)) redirect('/nakliyeci');
  const listings = await apiFetch<ListingView[]>('/listings');

  return (
    <Shell eyebrow="Yük veren" title="İlanlarım">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted">{session.user?.name ?? session.user?.email}</p>
        <Link href="/fiyat-hesapla" className="rounded-field bg-amber px-5 py-3 text-sm font-bold text-[var(--amber-ink)]">
          Yeni ilan
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="mt-6 rounded-card border border-dashed border-line p-8 text-center">
          <p className="font-semibold">Henüz ilanınız yok.</p>
          <p className="mt-1 text-sm text-muted">Rotanı ve aracını seç, tahmini fiyatı gör, ilanı yayınla — teklifler burada toplanır.</p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-card border border-line bg-surface">
          {listings.map((l) => (
            <li key={l.id}>
              <Link href={`/panel/ilan/${l.id}`} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 hover:bg-surface-2">
                <span className="label-mono w-32 text-muted">{l.listingNumber}</span>
                <RouteLine l={l} />
                <span className="label-mono text-muted">{l.vehicleTypeCode}</span>
                <span className="ml-auto stat text-base">{formatPrice(l.estimatedAmount.amount)}</span>
                <span className="label-mono text-muted">{l.offerCount} teklif</span>
                <StatusPill status={l.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
