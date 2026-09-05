'use client';

import { useActionState } from 'react';
import { deliverTrip, type ActionState } from '../../actions';

export function DeliverForm({ tripId }: { tripId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(deliverTrip, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="tripId" value={tripId} />
      <label className="block text-sm">
        <span className="label-mono block text-muted">Teslim alan kişi</span>
        <input name="receivedByName" required maxLength={120} placeholder="Ad Soyad"
          className="mt-1 w-full rounded-field border border-line bg-surface-2 px-3 py-3 outline-none placeholder:text-muted" />
      </label>
      <label className="block text-sm">
        <span className="label-mono block text-muted">Not (isteğe bağlı)</span>
        <input name="note" maxLength={500} placeholder="Kapıda teslim edildi"
          className="mt-1 w-full rounded-field border border-line bg-surface-2 px-3 py-3 outline-none placeholder:text-muted" />
      </label>
      <p className="text-xs text-muted">Teslim fotoğrafı, depolama bağlanınca eklenecek.</p>
      {state.error && <p className="text-sm text-[#8a2a1f]">{state.error}</p>}
      <button type="submit" disabled={pending}
        className="w-full rounded-field bg-amber px-6 py-4 font-bold text-[var(--amber-ink)] disabled:opacity-60">
        {pending ? 'Bildiriliyor…' : 'Teslim ettim'}
      </button>
    </form>
  );
}
