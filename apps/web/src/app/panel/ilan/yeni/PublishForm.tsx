'use client';

import type { District, ExtraService, VehicleType } from '@tasiyoruz/contracts';
import { useActionState } from 'react';
import { publishListing, type ActionState } from '../../actions';

export function PublishForm({
  pickup, dropoff, vehicle, extras, initial,
}: {
  pickup: District;
  dropoff: District;
  vehicle: VehicleType;
  extras: ExtraService[];
  initial: {
    serviceModel: 'INSTANT' | 'SCHEDULED';
    pickupFloor: number; pickupHasElevator: boolean;
    dropoffFloor: number; dropoffHasElevator: boolean;
    extraServices: string[];
  };
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(publishListing, {});
  const chosenExtras = extras.filter((e) => initial.extraServices.includes(e.code));

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <input type="hidden" name="serviceModel" value={initial.serviceModel} />
      <input type="hidden" name="vehicleTypeCode" value={vehicle.code} />
      <input type="hidden" name="pickupDistrictId" value={pickup.id} />
      <input type="hidden" name="dropoffDistrictId" value={dropoff.id} />
      <input type="hidden" name="pickupFloor" value={initial.pickupFloor} />
      <input type="hidden" name="dropoffFloor" value={initial.dropoffFloor} />
      {initial.pickupHasElevator && <input type="hidden" name="pickupHasElevator" value="on" />}
      {initial.dropoffHasElevator && <input type="hidden" name="dropoffHasElevator" value="on" />}
      <input type="hidden" name="extraServices" value={initial.extraServices.join(',')} />

      <div className="rounded-card border border-line bg-surface p-6">
        <p className="label-mono text-muted">Rota ve araç</p>
        <p className="mt-2 text-lg font-bold">
          {pickup.cityName}, {pickup.name} <span className="text-muted">→</span> {dropoff.cityName}, {dropoff.name}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div><dt className="label-mono text-muted">Araç</dt><dd className="font-semibold">{vehicle.displayName}</dd></div>
          <div><dt className="label-mono text-muted">Ne zaman</dt><dd className="font-semibold">{initial.serviceModel === 'INSTANT' ? 'Anlık' : 'Planlı'}</dd></div>
          <div><dt className="label-mono text-muted">Alış</dt><dd>{initial.pickupFloor}. kat · {initial.pickupHasElevator ? 'asansör var' : 'asansör yok'}</dd></div>
          <div><dt className="label-mono text-muted">Teslim</dt><dd>{initial.dropoffFloor}. kat · {initial.dropoffHasElevator ? 'asansör var' : 'asansör yok'}</dd></div>
        </dl>
        {chosenExtras.length > 0 && (
          <p className="mt-4 text-sm"><span className="label-mono text-muted">Ek hizmet </span>{chosenExtras.map((e) => e.displayName).join(' · ')}</p>
        )}

        <label htmlFor="cargo" className="label-mono mt-6 block text-muted">Yükünüzü tarif edin</label>
        <textarea id="cargo" name="cargoDescription" rows={4} maxLength={1000}
          placeholder="Örn. Buzdolabı, çamaşır makinesi ve 8 koli. Kırılacak eşya var."
          className="mt-1.5 w-full rounded-field border border-line bg-surface-2 px-3.5 py-3 text-[15px] outline-none placeholder:text-muted" />
        <p className="mt-1 text-xs text-muted">Araç sahipleri teklif verirken bunu görür; ne kadar netse teklif o kadar isabetli.</p>
      </div>

      <aside className="h-fit rounded-card border border-line bg-surface p-6">
        <p className="label-mono text-muted">Yayınlayınca ne olur</p>
        <ol className="mt-3 space-y-2 text-sm text-muted">
          <li>1. Tarife tahmini ilana referans olarak yazılır.</li>
          <li>2. Doğrulanmış araç sahipleri {initial.serviceModel === 'INSTANT' ? '6 saat' : 'alış tarihine kadar'} teklif verir.</li>
          <li>3. Teklifleri karşılaştırır, birini seçersin. Ödeme teslimatta.</li>
        </ol>
        {state.error && <p className="mt-4 rounded-field bg-[#fbe9e7] px-3 py-2 text-sm text-[#8a2a1f]">{state.error}</p>}
        <button type="submit" disabled={pending}
          className="mt-5 w-full rounded-field bg-amber px-6 py-4 font-bold text-[var(--amber-ink)] transition hover:brightness-105 disabled:opacity-60">
          {pending ? 'Yayınlanıyor…' : 'İlanı yayınla'}
        </button>
        <p className="label-mono mt-3 text-center text-muted">Komisyon dahil · Teslimatta ödeme</p>
      </aside>
    </form>
  );
}
