import { TRIP_STAGE_LABELS, type TripView } from '@tasiyoruz/contracts';
import { formatPrice } from '@tasiyoruz/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, homeFor, isDriver } from '@/auth';
import { Shell } from '@/components/app/Shell';
import { SubNav } from '@/components/app/SubNav';
import { apiFetch } from '@/lib/api-server';

export const metadata: Metadata = { title: 'İşlerim' };
export const dynamic = 'force-dynamic';

export default async function DriverTripsPage() {
  const session = await auth();
  if (!session || !isDriver(session.roles)) redirect(homeFor(session?.roles ?? []));
  const trips = await apiFetch<TripView[]>('/driver/trips');
  const active = trips.filter((t) => t.stage !== 'COMPLETED');
  const done = trips.filter((t) => t.stage === 'COMPLETED');

  const Row = ({ t }: { t: TripView }) => (
    <li>
      <Link href={`/nakliyeci/is/${t.id}`} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 hover:bg-surface-2">
        <span className="font-bold">{TRIP_STAGE_LABELS[t.stage]}</span>
        <span className="label-mono text-muted">{new Date(t.startedAt).toLocaleDateString('tr-TR')}</span>
        <span className="stat ml-auto text-base">{formatPrice(t.agreedAmount.amount)}</span>
      </Link>
    </li>
  );

  return (
    <Shell eyebrow="Araç sahibi" title="İşlerim">
      <SubNav
        items={[
          { href: '/nakliyeci', label: 'Açık ilanlar' },
          { href: '/nakliyeci/koridor', label: 'Boş dönüş' },
          { href: '/nakliyeci/teklifler', label: 'Tekliflerim' },
        ]}
        className="-ml-3"
      />
      <h2 className="mt-6 text-lg">Devam eden ({active.length})</h2>
      {active.length === 0 ? <p className="mt-2 text-sm text-muted">Devam eden iş yok. Teklifin kabul edilince iş burada açılır.</p>
        : <ul className="mt-3 divide-y divide-line rounded-card border border-line bg-surface">{active.map((t) => <Row key={t.id} t={t} />)}</ul>}
      {done.length > 0 && (<>
        <h2 className="mt-8 text-lg">Tamamlanan ({done.length})</h2>
        <ul className="mt-3 divide-y divide-line rounded-card border border-line bg-surface">{done.map((t) => <Row key={t.id} t={t} />)}</ul>
      </>)}
    </Shell>
  );
}
