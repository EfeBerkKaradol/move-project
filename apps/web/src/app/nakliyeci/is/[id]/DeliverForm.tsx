'use client';

import { useActionState } from 'react';
import { deliverTrip, type ActionState } from '../../actions';

export function DeliverForm({ tripId, hasDeliveryPhoto }: { tripId: string; hasDeliveryPhoto: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(deliverTrip, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="tripId" value={tripId} />
      <label className="block text-sm">
        <span className="label-mono block text-muted">Teslim alan kişi</span>
        <input name="receivedByName" required maxLength={120} placeholder="Ad Soyad"
          className="mt-1 w-full rounded-field border border-line bg-surface-2 px-3 py-3 outline-none placeholder:text-muted transition hover:border-muted focus:border-route focus:ring-2 focus:ring-route/25" />
      </label>
      <label className="block text-sm">
        <span className="label-mono block text-muted">Not (isteğe bağlı)</span>
        <input name="note" maxLength={500} placeholder="Kapıda teslim edildi"
          className="mt-1 w-full rounded-field border border-line bg-surface-2 px-3 py-3 outline-none placeholder:text-muted transition hover:border-muted focus:border-route focus:ring-2 focus:ring-route/25" />
      </label>
      {!hasDeliveryPhoto && (
        <p className="rounded-field bg-surface-2 px-3 py-2 text-xs text-muted">
          Teslimi bildirmeden önce en az bir teslim fotoğrafı yükle.
        </p>
      )}
      {state.error && <p className="text-sm text-[#8a2a1f]">{state.error}</p>}
      <button type="submit" disabled={pending || !hasDeliveryPhoto}
        className="w-full rounded-field bg-route px-6 py-4 font-bold text-[var(--route-ink)] disabled:opacity-60 transition hover:bg-[var(--route-hover)] hover:shadow-[0_6px_18px_rgb(244_159_44_/_0.30)] active:translate-y-px">
        {pending ? 'Bildiriliyor…' : 'Teslim ettim'}
      </button>
    </form>
  );
}
