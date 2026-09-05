'use client';

import { useActionState } from 'react';
import { submitOffer, type ActionState } from './actions';

export function OfferForm({ listingId, suggested }: { listingId: string; suggested: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(submitOffer, {});
  if (state.ok) return <p className="label-mono text-[#1f6b45]">Teklifin iletildi</p>;
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="listingId" value={listingId} />
      <label className="text-sm">
        <span className="label-mono block text-muted">Teklifin (₺)</span>
        <input name="amount" inputMode="decimal" required defaultValue={suggested}
          className="mt-1 w-32 rounded-field border border-line bg-surface-2 px-3 py-2.5 tabular-nums outline-none" />
      </label>
      <label className="min-w-0 flex-1 text-sm">
        <span className="label-mono block text-muted">Not (isteğe bağlı)</span>
        <input name="note" maxLength={500} placeholder="Örn. Hamaliye dahil, sabah alırım"
          className="mt-1 w-full rounded-field border border-line bg-surface-2 px-3 py-2.5 outline-none placeholder:text-muted" />
      </label>
      <button type="submit" disabled={pending}
        className="rounded-field bg-amber px-4 py-2.5 text-sm font-bold text-[var(--amber-ink)] disabled:opacity-60">
        {pending ? 'Gönderiliyor…' : 'Teklif ver'}
      </button>
      {state.error && <p className="basis-full text-sm text-[#8a2a1f]">{state.error}</p>}
    </form>
  );
}
