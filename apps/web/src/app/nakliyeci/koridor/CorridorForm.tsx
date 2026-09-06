'use client';

import type { District, VehicleType } from '@tasiyoruz/contracts';
import { useActionState, useState } from 'react';
import { createCorridor, type ActionState } from './actions';

const FIELD =
  'min-h-11 w-full rounded-field border border-line bg-surface-2 px-3 py-2.5 text-[15px] outline-none transition hover:border-muted focus:border-amber focus:ring-2 focus:ring-amber/25';

/** Bugünden itibaren, datetime-local'ın beklediği yerel biçim. */
function localInput(offsetHours: number): string {
  const d = new Date(Date.now() + offsetHours * 3600_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Boş dönüş koridoru tanımlama formu.
 *
 * <p>Kalkış ve varış il merkezi düzeyinde seçiliyor: koridor şehirlerarası bir dönüş
 * rotası, ilçe hassasiyeti eşleştirmeye bir şey katmıyor.
 */
export function CorridorForm({ cities, vehicles }: { cities: District[]; vehicles: VehicleType[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createCorridor, {});
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');

  const sameEnds = origin !== '' && origin === destination;

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm">
        <span className="label-mono block text-muted">Nereden dönüyorsun</span>
        <select name="originDistrictId" required value={origin} onChange={(e) => setOrigin(e.target.value)} className={FIELD}>
          <option value="" disabled>İl seç</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.cityName}</option>)}
        </select>
      </label>

      <label className="text-sm">
        <span className="label-mono block text-muted">Nereye dönüyorsun</span>
        <select name="destinationDistrictId" required value={destination} onChange={(e) => setDestination(e.target.value)} className={FIELD}>
          <option value="" disabled>İl seç</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.cityName}</option>)}
        </select>
        {sameEnds && <span className="mt-1 block text-xs text-[#8a2a1f]">Kalkış ve varış aynı olamaz.</span>}
      </label>

      <label className="text-sm">
        <span className="label-mono block text-muted">Aracın</span>
        <select name="vehicleTypeCode" required defaultValue="" className={FIELD}>
          <option value="" disabled>Araç seç</option>
          {vehicles.map((v) => <option key={v.code} value={v.code}>{v.displayName}</option>)}
        </select>
      </label>

      <label className="text-sm">
        <span className="label-mono block text-muted">Rotandan en fazla sapma (km)</span>
        <input name="detourToleranceKm" type="number" min={0} max={500} step={10} required defaultValue={80} className={`${FIELD} tabular-nums`} />
        <span className="mt-1 block text-xs text-muted">Yükü almak için yolundan ne kadar ayrılabilirsin.</span>
      </label>

      <label className="text-sm">
        <span className="label-mono block text-muted">Kalkış — en erken</span>
        <input name="departureFrom" type="datetime-local" required defaultValue={localInput(2)} className={FIELD} />
      </label>

      <label className="text-sm">
        <span className="label-mono block text-muted">Kalkış — en geç</span>
        <input name="departureTo" type="datetime-local" required defaultValue={localInput(26)} className={FIELD} />
      </label>

      <label className="text-sm sm:col-span-2">
        <span className="label-mono block text-muted">Alt sınır (₺, isteğe bağlı)</span>
        <input name="minAmount" inputMode="decimal" placeholder="Örn. 4000" className={`${FIELD} tabular-nums sm:max-w-48`} />
        <span className="mt-1 block text-xs text-muted">Tarife tahmini bunun altındaki ilanlar sana hiç gösterilmez.</span>
      </label>

      <div className="sm:col-span-2">
        <button type="submit" disabled={pending || sameEnds}
          className="min-h-11 rounded-field bg-amber px-5 py-2.5 text-sm font-bold text-[var(--amber-ink)] transition hover:bg-[var(--amber-hover)] hover:shadow-[0_6px_18px_rgb(244_159_44_/_0.30)] active:translate-y-px disabled:opacity-60">
          {pending ? 'Kaydediliyor…' : 'Koridoru kaydet'}
        </button>
        {state.error && <p className="mt-2 text-sm text-[#8a2a1f]">{state.error}</p>}
        {state.ok && <p className="label-mono mt-2 text-[#1f6b45]">Koridor kaydedildi</p>}
      </div>
    </form>
  );
}
