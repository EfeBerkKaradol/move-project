'use client';

import { useActionState, useState } from 'react';
import { rateCarrier, type ActionState } from '../../actions';

/**
 * Yıldızla puanlama. Radyo düğmeleri görsel olarak gizli, yıldızlar etiket:
 * klavye ve ekran okuyucu radyo grubunu görür, göz yıldızı.
 */
export function RatingForm({ tripId, listingId }: { tripId: string; listingId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(rateCarrier, {});
  const [hover, setHover] = useState(0);
  const [picked, setPicked] = useState(0);
  const shown = hover || picked;
  const LABELS = ['', 'Kötü', 'Zayıf', 'İdare eder', 'İyi', 'Mükemmel'];

  if (state.ok) return <p className="label-mono text-[#1f6b45]">Puanın kaydedildi, teşekkürler.</p>;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="tripId" value={tripId} />
      <input type="hidden" name="listingId" value={listingId} />
      <fieldset>
        <legend className="label-mono text-muted">Taşıyıcıyı puanla</legend>
        <div className="mt-2 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer" onMouseEnter={() => setHover(n)}>
              <input type="radio" name="score" value={n} required className="sr-only"
                onChange={() => setPicked(n)} />
              <span aria-hidden className={`grid size-11 place-items-center text-2xl transition ${n <= shown ? 'text-[var(--route-deep)]' : 'text-line'}`}>★</span>
              <span className="sr-only">{n} yıldız · {LABELS[n]}</span>
            </label>
          ))}
          <span className="ml-2 text-sm text-muted">{shown ? LABELS[shown] : ''}</span>
        </div>
      </fieldset>
      <label className="block text-sm">
        <span className="label-mono block text-muted">Yorum (isteğe bağlı)</span>
        <input name="comment" maxLength={500} placeholder="Örn. Zamanında geldi, yükü özenle taşıdı"
          className="mt-2 min-h-11 w-full rounded-field border border-line bg-surface-2 px-3 py-2.5 outline-none placeholder:text-muted transition hover:border-muted focus:border-route focus:ring-2 focus:ring-route/25" />
      </label>
      {state.error && <p className="text-sm text-[#8a2a1f]">{state.error}</p>}
      <button type="submit" disabled={pending || !picked}
        className="min-h-11 rounded-field bg-route px-4 py-2.5 text-sm font-bold text-[var(--route-ink)] transition hover:bg-[var(--route-hover)] hover:shadow-[0_6px_18px_rgb(244_159_44_/_0.30)] active:translate-y-px disabled:opacity-60">
        {pending ? 'Kaydediliyor…' : 'Puanı gönder'}
      </button>
    </form>
  );
}
