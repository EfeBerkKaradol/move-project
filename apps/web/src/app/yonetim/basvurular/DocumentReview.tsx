'use client';

import type { CarrierDocumentView } from '@tasiyoruz/contracts';
import { DOCUMENT_STATUS_LABELS } from '@tasiyoruz/contracts';
import { useActionState, useState } from 'react';
import { reviewDocument, type ActionState } from '../actions';

const TONE: Record<string, string> = {
  PENDING: 'bg-surface-2 text-muted',
  APPROVED: 'bg-[#dff0e5] text-[#1f6b45]',
  REJECTED: 'bg-[#f7e0dd] text-[#8a2a1f]',
  EXPIRED: 'bg-[#f7e0dd] text-[#8a2a1f]',
};

/**
 * Tek belgenin incelemesi: dosyayı göster, onayla ya da gerekçeyle reddet.
 *
 * <p>Red gerekçesi alanı yalnızca "Reddet" seçilince açılıyor; sunucu da gerekçesiz
 * reddi kabul etmiyor — taşıyıcı neyi düzelteceğini bilmeden reddedilirse başvuru
 * döngüsü kilitlenir.
 */
export function DocumentReview({ document: doc }: { document: CarrierDocumentView }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(reviewDocument, {});
  const [rejecting, setRejecting] = useState(false);
  const src = `/api/yonetim/belge/${doc.id}`;
  const isPdf = doc.contentType === 'application/pdf';

  return (
    <li className="rounded-card border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-semibold">{doc.kindDisplayName}</span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[doc.status]}`}>
          {DOCUMENT_STATUS_LABELS[doc.status]}
        </span>
        {doc.expiresOn && (
          <span className="label-mono text-muted">
            geçerlilik {new Date(doc.expiresOn).toLocaleDateString('tr-TR')}
          </span>
        )}
      </div>

      <div className="mt-3 overflow-hidden rounded-field border border-line bg-surface-2">
        {isPdf ? (
          <a href={src} target="_blank" rel="noreferrer"
            className="flex min-h-11 items-center px-3 text-sm font-semibold underline underline-offset-4">
            PDF belgeyi aç
          </a>
        ) : (
          <a href={src} target="_blank" rel="noreferrer" className="block transition hover:opacity-90">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`${doc.kindDisplayName} belgesi`} loading="lazy"
              className="max-h-72 w-full object-contain" />
          </a>
        )}
      </div>

      {doc.rejectionReason && (
        <p className="mt-2 rounded-field bg-[#f7e0dd] px-3 py-2 text-sm text-[#8a2a1f]">
          Red gerekçesi: {doc.rejectionReason}
        </p>
      )}

      <form action={action} className="mt-3 flex flex-wrap items-end gap-2">
        <input type="hidden" name="documentId" value={doc.id} />
        <input type="hidden" name="approved" value={rejecting ? 'false' : 'true'} />
        {rejecting && (
          <label className="min-w-0 flex-1 text-sm">
            <span className="label-mono block text-muted">Red gerekçesi</span>
            <input name="reason" required maxLength={500} autoFocus
              placeholder="Örn. Belge okunmuyor, yeniden çekin"
              className="mt-1 min-h-11 w-full rounded-field border border-line bg-surface-2 px-3 py-2.5 outline-none transition hover:border-muted focus:border-amber focus:ring-2 focus:ring-amber/25" />
          </label>
        )}
        <button type="submit" disabled={pending}
          onClick={() => setRejecting(false)}
          className="min-h-11 rounded-field bg-amber px-4 py-2.5 text-sm font-bold text-[var(--amber-ink)] transition hover:bg-[var(--amber-hover)] hover:shadow-[0_6px_18px_rgb(244_159_44_/_0.30)] active:translate-y-px disabled:opacity-60">
          Onayla
        </button>
        <button type={rejecting ? 'submit' : 'button'} disabled={pending}
          onClick={() => { if (!rejecting) setRejecting(true); }}
          className="min-h-11 rounded-field border border-line px-4 py-2.5 text-sm font-semibold transition hover:border-[#8a2a1f] hover:text-[#8a2a1f]">
          {rejecting ? 'Reddi gönder' : 'Reddet'}
        </button>
        {rejecting && (
          <button type="button" onClick={() => setRejecting(false)}
            className="min-h-11 rounded-field px-3 text-sm font-semibold text-muted transition hover:text-ink">
            Vazgeç
          </button>
        )}
        {state.error && <p className="basis-full text-sm text-[#8a2a1f]">{state.error}</p>}
      </form>
    </li>
  );
}
