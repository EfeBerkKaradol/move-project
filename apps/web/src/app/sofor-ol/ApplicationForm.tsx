'use client';

import type { CarrierProfileView, VehicleType } from '@tasiyoruz/contracts';
import { useActionState, useState } from 'react';
import { PhoneInput } from '@/components/form/PhoneInput';
import { PlateInput } from '@/components/form/PlateInput';
import { saveApplication, type ActionState } from './actions';

const FIELD =
  'min-h-11 w-full rounded-field border border-line bg-surface-2 px-3 py-2.5 text-[15px] outline-none transition hover:border-muted focus:border-route focus:ring-2 focus:ring-route/25';

/** Başvuru formu. Kurumsal alanlar yalnızca firma adına başvuruluyorsa açılır. */
export function ApplicationForm({
  profile,
  vehicles,
  editable,
}: {
  profile: CarrierProfileView | null;
  vehicles: VehicleType[];
  editable: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveApplication, {});
  const [company, setCompany] = useState(Boolean(profile?.companyName));

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm">
        <span className="label-mono block text-muted">Ad soyad</span>
        <input name="displayName" required maxLength={120} defaultValue={profile?.displayName ?? ''}
          disabled={!editable} className={FIELD} />
      </label>

      <label className="text-sm">
        <span className="label-mono block text-muted">Telefon</span>
        <PhoneInput name="phone" defaultValue={profile?.phone ?? ''} disabled={!editable} className={FIELD} />
      </label>

      <label className="text-sm">
        <span className="label-mono block text-muted">Aracın</span>
        <select name="vehicleTypeCode" required defaultValue={profile?.vehicleTypeCode ?? ''}
          disabled={!editable} className={FIELD}>
          <option value="" disabled>Araç seç</option>
          {vehicles.map((v) => <option key={v.code} value={v.code}>{v.displayName}</option>)}
        </select>
      </label>

      <label className="text-sm">
        <span className="label-mono block text-muted">Plaka</span>
        <PlateInput name="plate" required defaultValue={profile?.plate ?? ''}
          disabled={!editable} className={FIELD} />
      </label>

      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" checked={company} disabled={!editable}
          onChange={(e) => setCompany(e.target.checked)}
          className="size-5 cursor-pointer accent-[var(--route)]" />
        Firma adına başvuruyorum
      </label>

      {company && (
        <>
          <label className="text-sm">
            <span className="label-mono block text-muted">Firma unvanı</span>
            <input name="companyName" required maxLength={160} defaultValue={profile?.companyName ?? ''}
              disabled={!editable} className={FIELD} />
          </label>
          <label className="text-sm">
            <span className="label-mono block text-muted">Vergi numarası</span>
            <input name="taxId" required inputMode="numeric" pattern="\d{10,11}"
              defaultValue={profile?.taxId ?? ''} disabled={!editable} className={`${FIELD} tabular-nums`} />
            <span className="mt-1 block text-xs text-muted">Şahıs şirketinde TCKN, sermaye şirketinde vergi no.</span>
          </label>
        </>
      )}

      {editable && (
        <div className="sm:col-span-2">
          <button type="submit" disabled={pending}
            className="min-h-11 rounded-field bg-route px-5 py-2.5 text-sm font-bold text-[var(--route-ink)] transition hover:bg-[var(--route-hover)] hover:shadow-[0_6px_18px_rgb(244_159_44_/_0.30)] active:translate-y-px disabled:opacity-60">
            {pending ? 'Kaydediliyor…' : profile ? 'Bilgileri güncelle' : 'Başvuruyu başlat'}
          </button>
          {state.error && <p className="mt-2 text-sm text-[#8a2a1f]">{state.error}</p>}
          {state.ok && <p className="label-mono mt-2 text-[#1f6b45]">Kaydedildi</p>}
        </div>
      )}
    </form>
  );
}
