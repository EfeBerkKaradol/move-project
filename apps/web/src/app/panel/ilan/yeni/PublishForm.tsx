'use client';

import type { CargoCategory, CargoItem, District, ExtraService, VehicleType } from '@tasiyoruz/contracts';
import { useActionState, useState } from 'react';
import { publishListing, type ActionState } from '../../actions';
import { CargoDeclaration, summarize } from './CargoDeclaration';
import { CargoPhotos } from './CargoPhotos';

export function PublishForm({
  pickup, dropoff, vehicle, extras, cargoItems, cargoCategories, initial,
}: {
  pickup: District;
  dropoff: District;
  vehicle: VehicleType;
  extras: ExtraService[];
  cargoItems: CargoItem[];
  cargoCategories: CargoCategory[];
  initial: {
    serviceModel: 'INSTANT' | 'SCHEDULED';
    pickupFloor: number; pickupHasElevator: boolean;
    dropoffFloor: number; dropoffHasElevator: boolean;
    extraServices: string[];
  };
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(publishListing, {});
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const chosenExtras = extras.filter((e) => initial.extraServices.includes(e.code));

  const totals = summarize(cargoItems, selected);
  const missing = [
    totals.pieces === 0 ? 'yükünü seç' : null,
    photoIds.length === 0 ? 'en az bir fotoğraf ekle' : null,
  ].filter(Boolean);

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
      <input
        type="hidden"
        name="cargoItems"
        value={Object.entries(selected).map(([code, quantity]) => `${code}:${quantity}`).join(',')}
      />
      <input type="hidden" name="photoIds" value={photoIds.join(',')} />

      <div className="grid gap-6">
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
        </div>

        <div className="rounded-card border border-line bg-surface p-6">
          <CargoDeclaration
            items={cargoItems}
            categories={cargoCategories}
            vehicle={vehicle}
            selected={selected}
            onChange={setSelected}
          />

          <div className="mt-6 border-t border-line pt-6">
            <CargoPhotos photoIds={photoIds} onChange={setPhotoIds} />
          </div>

          <div className="mt-6 border-t border-line pt-6">
            <label htmlFor="cargo" className="label-mono block text-muted">Eklemek istediğin bir şey var mı?</label>
            <textarea id="cargo" name="cargoDescription" rows={3} maxLength={1000}
              placeholder="Örn. Kırılacak eşya var. Bina girişi dar, araç kapıya yanaşamıyor."
              className="mt-1.5 w-full rounded-field border border-line bg-surface-2 px-3.5 py-3 text-[15px] outline-none placeholder:text-muted transition hover:border-muted focus:border-route focus:ring-2 focus:ring-route/25" />
            <p className="mt-1 text-xs text-muted">İsteğe bağlı. Kalem listesinin anlatmadığı şeyler için.</p>
          </div>
        </div>
      </div>

      <aside className="h-fit rounded-card border border-line bg-surface p-6 lg:sticky lg:top-24">
        <p className="label-mono text-muted">Yayınlayınca ne olur</p>
        <ol className="mt-3 space-y-2 text-sm text-muted">
          <li>1. Tarife tahmini ilana referans olarak yazılır.</li>
          <li>2. Doğrulanmış araç sahipleri {initial.serviceModel === 'INSTANT' ? '6 saat' : 'alış tarihine kadar'} teklif verir.</li>
          <li>3. Teklifleri karşılaştırır, birini seçersin. Ödeme teslimatta.</li>
        </ol>

        {totals.pieces > 0 && (
          <p className="label-mono mt-4 border-t border-line pt-4 text-muted">
            Beyanın: {totals.pieces} parça ·{' '}
            {totals.volumeM3.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} m³ ·{' '}
            {totals.weightKg.toLocaleString('tr-TR')} kg
          </p>
        )}

        {state.error && <p className="mt-4 rounded-field bg-[#fbe9e7] px-3 py-2 text-sm text-[#8a2a1f]">{state.error}</p>}
        <button type="submit" disabled={pending || missing.length > 0}
          className="mt-5 w-full rounded-field bg-route px-6 py-4 font-bold text-[var(--route-ink)] transition hover:bg-[var(--route-hover)] hover:shadow-[0_6px_18px_rgb(244_159_44_/_0.30)] active:translate-y-px disabled:opacity-60">
          {pending ? 'Yayınlanıyor…' : 'İlanı yayınla'}
        </button>
        {/* Devre dışı düğmeyi açıklamak şart: sebebi yazmayan gri bir düğme, kullanıcıyı
            neyi eksik bıraktığını arayarak sayfada dolaştırıyor */}
        {missing.length > 0 && (
          <p className="mt-2 text-center text-xs text-muted">
            Yayınlamak için {missing.join(' ve ')}.
          </p>
        )}
        <p className="label-mono mt-3 text-center text-muted">Komisyon dahil · Teslimatta ödeme</p>
      </aside>
    </form>
  );
}
