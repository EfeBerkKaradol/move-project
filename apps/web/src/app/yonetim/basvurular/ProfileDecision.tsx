'use client';

import { useActionState, useState } from 'react';
import { reviewProfile, suspendCarrier, type ActionState } from '../actions';

/** Başvuruyu sonuçlandırma ve onaylı taşıyıcıyı askıya alma. */
export function ProfileDecision({
  carrierId,
  mode,
}: {
  carrierId: string;
  /** review: incelemedeki başvuru · suspend: onaylı taşıyıcı */
  mode: 'review' | 'suspend';
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    mode === 'review' ? reviewProfile : suspendCarrier, {});
  const [reasonOpen, setReasonOpen] = useState(mode === 'suspend');

  return (
    <form action={action} className="mt-5 flex flex-wrap items-end gap-3 border-t border-line pt-5">
      <input type="hidden" name="carrierId" value={carrierId} />
      {mode === 'review' && <input type="hidden" name="approved" value={reasonOpen ? 'false' : 'true'} />}

      {reasonOpen && (
        <label className="min-w-0 flex-1 text-sm">
          <span className="label-mono block text-muted">
            {mode === 'review' ? 'Red gerekçesi' : 'Askıya alma gerekçesi'}
          </span>
          <input name="reason" required maxLength={500}
            placeholder={mode === 'review' ? 'Örn. Ruhsat ile plaka uyuşmuyor' : 'Örn. Belgeler doğrulanamadı'}
            className="mt-2 min-h-11 w-full rounded-field border border-line bg-surface-2 px-3 py-2.5 outline-none transition hover:border-muted focus:border-amber focus:ring-2 focus:ring-amber/25" />
        </label>
      )}

      {mode === 'review' && (
        <button type="submit" disabled={pending} onClick={() => setReasonOpen(false)}
          className="min-h-11 rounded-field bg-amber px-5 py-2.5 text-sm font-bold text-[var(--amber-ink)] transition hover:bg-[var(--amber-hover)] hover:shadow-[0_6px_18px_rgb(244_159_44_/_0.30)] active:translate-y-px disabled:opacity-60">
          Başvuruyu onayla
        </button>
      )}

      <button
        type={mode === 'suspend' || reasonOpen ? 'submit' : 'button'}
        disabled={pending}
        onClick={() => { if (mode === 'review' && !reasonOpen) setReasonOpen(true); }}
        className="min-h-11 rounded-field border border-line px-4 py-2.5 text-sm font-semibold transition hover:border-[#8a2a1f] hover:text-[#8a2a1f]">
        {mode === 'suspend' ? 'Askıya al' : reasonOpen ? 'Reddi gönder' : 'Başvuruyu reddet'}
      </button>

      {mode === 'review' && reasonOpen && (
        <button type="button" onClick={() => setReasonOpen(false)}
          className="min-h-11 rounded-field px-3 text-sm font-semibold text-muted transition hover:text-ink">
          Vazgeç
        </button>
      )}
      {state.error && <p className="basis-full text-sm text-[#8a2a1f]">{state.error}</p>}
    </form>
  );
}
