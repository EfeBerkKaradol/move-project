'use client';

import type { District, ExtraService } from '@turmove/contracts';
import { useMemo } from 'react';

export type StopInput = { districtId: string; floor: number; hasElevator: boolean };

/**
 * Adres adımı. Google Maps anahtarı gelene kadar adres, il/ilçe seçimiyle alınıyor
 * ve mesafe ilçe merkezlerinden tahmin ediliyor (ANAHTARLAR.md #1). Autocomplete
 * ve harita üzerinden pin devreye girdiğinde bu bileşen değişecek; fiyat motoru değil.
 */
export function AddressStep({
  districts,
  extraServices,
  pickup,
  dropoff,
  selectedExtras,
  onPickup,
  onDropoff,
  onToggleExtra,
}: {
  districts: District[];
  extraServices: ExtraService[];
  pickup: StopInput;
  dropoff: StopInput;
  selectedExtras: string[];
  onPickup: (next: StopInput) => void;
  onDropoff: (next: StopInput) => void;
  onToggleExtra: (code: string) => void;
}) {
  const byCity = useMemo(() => {
    const map = new Map<string, District[]>();
    for (const d of districts) {
      const list = map.get(d.cityName) ?? [];
      list.push(d);
      map.set(d.cityName, list);
    }
    return [...map.entries()];
  }, [districts]);

  const pickupCity = districts.find((d) => d.id === pickup.districtId)?.cityName;

  // Şehirler arası taşıma MVP kapsamında değil — teslim listesini alış iliyle sınırla
  const dropoffOptions = pickupCity
    ? byCity.filter(([city]) => city === pickupCity)
    : byCity;

  // Otomatik uygulanan ek hizmetler listede seçenek olarak gösterilmez
  const selectableExtras = extraServices.filter(
    (e) => !['NO_ELEVATOR', 'WAITING', 'EXTRA_STOP'].includes(e.code),
  );

  return (
    <div className="space-y-6">
      <StopFields
        legend="Alış adresi"
        options={byCity}
        value={pickup}
        onChange={onPickup}
      />
      <StopFields
        legend="Teslim adresi"
        options={dropoffOptions}
        value={dropoff}
        onChange={onDropoff}
        hint={pickupCity ? `${pickupCity} içinde` : undefined}
      />

      <fieldset className="rounded-card border border-line bg-surface px-4 py-4">
        <legend className="text-sm font-medium">Ek hizmetler</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {selectableExtras.map((e) => {
            const on = selectedExtras.includes(e.code);
            return (
              <button
                key={e.code}
                type="button"
                aria-pressed={on}
                onClick={() => onToggleExtra(e.code)}
                title={e.description ?? undefined}
                className={[
                  'rounded-lg border px-3 py-2 text-sm transition',
                  on ? 'border-accent bg-accent-soft ring-1 ring-accent' : 'border-line',
                ].join(' ')}
              >
                {e.displayName}
                <span className="ml-2 tabular-nums text-xs text-ink-muted">
                  {e.pricingType === 'PERCENT'
                    ? `%${e.rate}`
                    : `+${e.rate.toLocaleString('tr-TR')} ₺`}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

function StopFields({
  legend,
  options,
  value,
  onChange,
  hint,
}: {
  legend: string;
  options: [string, District[]][];
  value: StopInput;
  onChange: (next: StopInput) => void;
  hint?: string;
}) {
  const id = legend.replace(/\s/g, '-').toLowerCase();
  return (
    <fieldset className="rounded-card border border-line bg-surface px-4 py-4">
      <legend className="text-sm font-medium">
        {legend}
        {hint && <span className="ml-2 font-normal text-ink-muted">· {hint}</span>}
      </legend>

      <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-3">
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-ilce`}>
          İlçe
          <select
            id={`${id}-ilce`}
            value={value.districtId}
            onChange={(e) => onChange({ ...value, districtId: e.target.value })}
            className="min-w-52 rounded-lg border border-line bg-ground px-3 py-2"
          >
            <option value="">Seçin…</option>
            {options.map(([city, list]) => (
              <optgroup key={city} label={city}>
                {list.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-kat`}>
          Kat
          <input
            id={`${id}-kat`}
            type="number"
            min={0}
            max={50}
            value={value.floor}
            onChange={(e) => onChange({ ...value, floor: Number(e.target.value) })}
            className="w-20 rounded-lg border border-line bg-ground px-3 py-2 tabular-nums"
          />
        </label>

        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={value.hasElevator}
            onChange={(e) => onChange({ ...value, hasElevator: e.target.checked })}
            className="size-4 accent-[var(--accent)]"
          />
          Asansör var
        </label>
      </div>
    </fieldset>
  );
}
