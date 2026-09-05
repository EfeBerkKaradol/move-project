import { TRIP_STAGE_LABELS, type TripView } from '@tasiyoruz/contracts';
import { formatPrice } from '@tasiyoruz/shared';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { auth, isDriver } from '@/auth';
import { Shell } from '@/components/app/Shell';
import { TripTimeline } from '@/components/app/TripTimeline';
import { ApiError, apiFetch } from '@/lib/api-server';
import { advanceTrip } from '../../actions';
import { DeliverForm } from './DeliverForm';

export const metadata: Metadata = { title: 'İş' };
export const dynamic = 'force-dynamic';

/** Araç içinde tek elle kullanım: tek büyük buton, sıradaki aşama (docs/03 sürücü UI). */
export default async function DriverTripPage({ params }: { params: Promise<{ id: string }> }) {
  const [session, { id }] = await Promise.all([auth(), params]);
  if (!session || !isDriver(session.roles)) redirect('/panel');
  let trip: TripView;
  try { trip = await apiFetch<TripView>(`/driver/trips/${id}`); }
  catch (e) { if (e instanceof ApiError && (e.status === 404 || e.status === 403)) notFound(); throw e; }

  const canAdvance = trip.nextStage !== null && trip.nextStage !== 'DELIVERED';
  const canDeliver = trip.stage === 'ARRIVED_AT_DROPOFF' || trip.stage === 'UNLOADING';

  return (
    <Shell eyebrow={`İş · ${formatPrice(trip.agreedAmount.amount)}`} title={TRIP_STAGE_LABELS[trip.stage]}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="rounded-card border border-line bg-surface p-5">
          <p className="label-mono text-muted">Zaman çizelgesi</p>
          <div className="mt-3"><TripTimeline trip={trip} /></div>
        </section>
        <aside className="h-fit rounded-card border border-line bg-surface p-5">
          {canAdvance && (
            <form action={async () => { 'use server'; await advanceTrip(trip.id, trip.nextStage!); }}>
              <p className="label-mono text-muted">Sıradaki aşama</p>
              <button type="submit" className="mt-2 w-full rounded-field bg-amber px-6 py-5 text-lg font-bold text-[var(--amber-ink)]">
                {TRIP_STAGE_LABELS[trip.nextStage!]}
              </button>
            </form>
          )}
          {canDeliver && (<div className={canAdvance ? 'mt-6 border-t border-line pt-5' : ''}>
            <p className="label-mono text-muted">Teslim kanıtı</p>
            <div className="mt-2"><DeliverForm tripId={trip.id} /></div>
          </div>)}
          {trip.stage === 'DELIVERED' && <p className="text-sm">Teslimi bildirdin. Müşteri onaylayınca iş tamamlanır.</p>}
          {trip.stage === 'COMPLETED' && <p className="text-sm font-semibold text-[#1f6b45]">Tamamlandı. Ödeme akışı sırada.</p>}
        </aside>
      </div>
    </Shell>
  );
}
