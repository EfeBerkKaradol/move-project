import { TRIP_STAGE_LABELS, type TripPhotoKind, type TripView } from '@tasiyoruz/contracts';
import { formatPrice } from '@tasiyoruz/shared';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { auth, canCallApi, homeFor, isDriver } from '@/auth';
import { Shell } from '@/components/app/Shell';
import { LocationShare } from './LocationShare';
import { TripPhotos } from '@/components/app/TripPhotos';
import { TripTimeline } from '@/components/app/TripTimeline';
import { ApiError, apiFetch } from '@/lib/api-server';
import { advanceTrip } from '../../actions';
import { DeliverForm } from './DeliverForm';
import { PhotoUpload } from './PhotoUpload';

export const metadata: Metadata = { title: 'İş' };
export const dynamic = 'force-dynamic';

/** Araç içinde tek elle kullanım: tek büyük buton, sıradaki aşama (docs/03 sürücü UI). */
export default async function DriverTripPage({ params }: { params: Promise<{ id: string }> }) {
  const [session, { id }] = await Promise.all([auth(), params]);
  if (!canCallApi(session)) redirect('/giris');
  if (!isDriver(session.roles)) redirect(homeFor(session.roles));
  let trip: TripView;
  try { trip = await apiFetch<TripView>(`/driver/trips/${id}`); }
  catch (e) { if (e instanceof ApiError && (e.status === 404 || e.status === 403)) notFound(); throw e; }

  const canAdvance = trip.nextStage !== null && trip.nextStage !== 'DELIVERED';
  const canDeliver = trip.stage === 'ARRIVED_AT_DROPOFF' || trip.stage === 'UNLOADING';
  const photosOf = (kind: TripPhotoKind) => trip.photos.filter((p) => p.kind === kind);
  // Tamamlanan işte yükleme kapalı; kanıt geriye dönük değiştirilemez
  const canUploadPhoto = trip.stage !== 'COMPLETED';

  return (
    <Shell eyebrow={`İş · ${formatPrice(trip.agreedAmount.amount)}`} title={TRIP_STAGE_LABELS[trip.stage]}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="rounded-card border border-line bg-surface p-5">
          <p className="label-mono text-muted">Zaman çizelgesi</p>
          <div className="mt-3"><TripTimeline trip={trip} /></div>
          {trip.photos.length > 0 && (
            <div className="mt-5 border-t border-line pt-4">
              <p className="label-mono text-muted">Kareler</p>
              <TripPhotos tripId={trip.id} photos={trip.photos} />
            </div>
          )}
        </section>
        <aside className="h-fit rounded-card border border-line bg-surface p-5">
          {canAdvance && (
            <form action={async () => { 'use server'; await advanceTrip(trip.id, trip.nextStage!); }}>
              <p className="label-mono text-muted">Sıradaki aşama</p>
              <button type="submit" className="mt-2 w-full rounded-field bg-route px-6 py-5 text-lg font-bold text-[var(--route-ink)] transition hover:bg-[var(--route-hover)] hover:shadow-[0_6px_18px_rgb(244_159_44_/_0.30)] active:translate-y-px">
                {TRIP_STAGE_LABELS[trip.nextStage!]}
              </button>
            </form>
          )}
          {canUploadPhoto && (
            <div className={`space-y-5 ${canAdvance ? 'mt-6 border-t border-line pt-5' : ''}`}>
              <PhotoUpload tripId={trip.id} kind="PICKUP" label="Yükleme fotoğrafı"
                photos={photosOf('PICKUP')}
                hint="Yükü hangi durumda aldığını gösterir." />
              <PhotoUpload tripId={trip.id} kind="DELIVERY" label="Teslim fotoğrafı"
                photos={photosOf('DELIVERY')}
                hint="Teslimi bildirmek için en az bir kare gerekiyor." />
              <PhotoUpload tripId={trip.id} kind="DAMAGE" label="Hasar kaydı"
                photos={photosOf('DAMAGE')}
                hint="Bir sorun varsa burada belgeleyin." />
            </div>
          )}
          {canDeliver && (<div className="mt-6 border-t border-line pt-5">
            <p className="label-mono text-muted">Teslim kanıtı</p>
            <div className="mt-2">
              <DeliverForm tripId={trip.id} hasDeliveryPhoto={photosOf('DELIVERY').length > 0} />
            </div>
          </div>)}
          {/* Konum yalnızca iş sürerken paylaşılıyor; sunucu da teslimden
              sonrasını reddediyor (bkz. TripService.recordLocation). */}
          <LocationShare tripId={trip.id} aktifMi={trip.stage !== 'DELIVERED' && trip.stage !== 'COMPLETED'} />

          {trip.stage === 'DELIVERED' && (
            <p className="text-sm">
              Teslimi bildirdin. Müşteri onaylayınca iş tamamlanır; 24 saat içinde cevap
              gelmezse sistem otomatik onaylıyor.
            </p>
          )}
          {trip.stage === 'COMPLETED' && <p className="text-sm font-semibold text-[#1f6b45]">Tamamlandı. Ödeme akışı sırada.</p>}
        </aside>
      </div>
    </Shell>
  );
}
