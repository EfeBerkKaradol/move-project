import type { TripView } from '@tasiyoruz/contracts';
import { TRIP_STAGE_LABELS } from '@tasiyoruz/contracts';
import { formatPrice } from '@tasiyoruz/shared';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth, canCallApi, homeFor, isOps } from '@/auth';
import { OpsNav } from '@/components/app/OpsNav';
import { Shell } from '@/components/app/Shell';
import { apiFetch } from '@/lib/api-server';

export const metadata: Metadata = { title: 'İşler' };
export const dynamic = 'force-dynamic';

export default async function OpsTripsPage() {
  const session = await auth();
  if (!canCallApi(session)) redirect('/giris');
  if (!isOps(session.roles)) redirect(homeFor(session.roles));

  const trips = await apiFetch<TripView[]>('/admin/trips');
  const active = trips.filter((t) => t.stage !== 'COMPLETED');
  const done = trips.filter((t) => t.stage === 'COMPLETED');

  return (
    <Shell eyebrow="Operasyon" title="İşler">
      <OpsNav active="/yonetim/isler" />

      <h2 className="mt-6 text-lg font-bold">Devam eden ({active.length})</h2>
      {active.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Devam eden iş yok.</p>
      ) : (
        <ul className="mt-3 space-y-3">{active.map((t) => <TripRow key={t.id} t={t} />)}</ul>
      )}

      <h2 className="mt-8 text-lg font-bold">Tamamlanan ({done.length})</h2>
      {done.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Henüz tamamlanan iş yok.</p>
      ) : (
        <ul className="mt-3 space-y-3">{done.map((t) => <TripRow key={t.id} t={t} />)}</ul>
      )}
    </Shell>
  );
}

function TripRow({ t }: { t: TripView }) {
  return (
    <li className="rounded-card border border-line bg-surface px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="font-semibold">{t.carrierDisplayName ?? 'Taşıyıcı'}</span>
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold">
          {TRIP_STAGE_LABELS[t.stage]}
        </span>
        <span className="label-mono text-muted">{t.photos.length} kare</span>
        <span className="ml-auto stat">{formatPrice(t.agreedAmount.amount)}</span>
      </div>
      <p className="label-mono mt-1 text-muted">
        başlangıç {new Date(t.startedAt).toLocaleString('tr-TR')}
        {t.deliveredAt ? ` · teslim ${new Date(t.deliveredAt).toLocaleString('tr-TR')}` : ''}
        {t.proofOfDelivery ? ` · teslim alan ${t.proofOfDelivery.receivedByName}` : ''}
      </p>
    </li>
  );
}
