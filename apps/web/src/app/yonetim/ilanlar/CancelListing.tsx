'use client';

import { useActionState, useState } from 'react';
import { cancelListing, type ActionState } from '../actions';

/** Operasyon bir ilanı kapatır. Gerekçe zorunlu; kayıt tutulmayan karar denetlenemez. */
export function CancelListing({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(cancelListing, {});
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="min-h-11 rounded-field border border-line px-3 py-2.5 text-sm font-semibold text-muted transition hover:border-[#8a2a1f] hover:text-[#8a2a1f]">
        İlanı kapat
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="listingId" value={listingId} />
      <label className="min-w-0 flex-1 text-sm">
        <span className="label-mono block text-muted">Kapatma gerekçesi</span>
        <input name="reason" required maxLength={500} autoFocus placeholder="Örn. Yük tarifi kurallara aykırı"
          className="mt-2 min-h-11 w-full rounded-field border border-line bg-surface-2 px-3 py-2.5 outline-none transition hover:border-muted focus:border-amber focus:ring-2 focus:ring-amber/25" />
      </label>
      <button type="submit" disabled={pending}
        className="min-h-11 rounded-field border border-[#8a2a1f] px-4 py-2.5 text-sm font-bold text-[#8a2a1f] transition hover:bg-[#f7e0dd]">
        {pending ? 'Kapatılıyor…' : 'Kapat'}
      </button>
      <button type="button" onClick={() => setOpen(false)}
        className="min-h-11 rounded-field px-3 text-sm font-semibold text-muted transition hover:text-ink">
        Vazgeç
      </button>
      {state.error && <p className="basis-full text-sm text-[#8a2a1f]">{state.error}</p>}
    </form>
  );
}
