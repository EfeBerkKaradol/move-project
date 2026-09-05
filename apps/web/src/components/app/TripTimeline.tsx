import { TRIP_STAGE_LABELS, type TripStage, type TripView } from '@tasiyoruz/contracts';

const ORDER: TripStage[] = ['DRIVER_ASSIGNED','EN_ROUTE_TO_PICKUP','ARRIVED_AT_PICKUP','LOADING','IN_TRANSIT','ARRIVED_AT_DROPOFF','UNLOADING','DELIVERED','COMPLETED'];

/** Aşama zaman çizelgesi: geçilenler zaman damgalı, sıradaki vurgulu, kalanlar soluk. */
export function TripTimeline({ trip }: { trip: TripView }) {
  const done = new Map(trip.events.map((e) => [e.stage, e]));
  const current = ORDER.indexOf(trip.stage);
  return (
    <ol className="space-y-2">
      {ORDER.map((stage, i) => {
        const ev = done.get(stage);
        const state = i < current || ev ? 'done' : i === current + 1 ? 'next' : 'later';
        return (
          <li key={stage} className={`flex items-baseline gap-3 text-sm ${state === 'later' ? 'text-muted' : ''}`}>
            <span aria-hidden className={`mt-1 size-2.5 shrink-0 rounded-full ${ev ? 'bg-amber' : state === 'next' ? 'border-2 border-amber' : 'border border-line'}`} />
            <span className={ev && stage === trip.stage ? 'font-bold' : ''}>{TRIP_STAGE_LABELS[stage]}</span>
            {ev && <span className="label-mono ml-auto text-muted">{new Date(ev.occurredAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>}
          </li>
        );
      })}
    </ol>
  );
}
