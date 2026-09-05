import type { OfferView } from '@tasiyoruz/contracts';
import { formatPrice } from '@tasiyoruz/shared';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth, isDriver } from '@/auth';
import { Shell } from '@/components/app/Shell';
import { StatusPill } from '@/components/app/StatusPill';
import { apiFetch } from '@/lib/api-server';
import { withdrawOffer } from '../actions';

export const metadata: Metadata = { title: 'Tekliflerim' };
export const dynamic = 'force-dynamic';

export default async function MyOffersPage() {
  const session = await auth();
  if (!session || !isDriver(session.roles)) redirect('/panel');
  const offers = await apiFetch<OfferView[]>('/driver/offers');

  return (
    <Shell eyebrow="Araç sahibi" title="Tekliflerim">
      {offers.length === 0 ? (
        <p className="text-muted">Henüz teklif vermedin.</p>
      ) : (
        <ul className="divide-y divide-line rounded-card border border-line bg-surface">
          {offers.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4">
              <span className="stat text-base">{formatPrice(o.amount.amount)}</span>
              <span className="text-sm text-muted">{o.note ?? ''}</span>
              <span className="label-mono ml-auto text-muted">{new Date(o.submittedAt).toLocaleString('tr-TR')}</span>
              <StatusPill status={o.status} />
              {o.status === 'SUBMITTED' && (
                <form action={async () => { 'use server'; await withdrawOffer(o.id); }}>
                  <button type="submit" className="rounded-field border border-line px-3 py-2 text-sm font-semibold">Geri çek</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
