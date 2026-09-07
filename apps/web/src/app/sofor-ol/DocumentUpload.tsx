'use client';

import type { CarrierDocumentView, DocumentKind } from '@tasiyoruz/contracts';
import { DOCUMENT_KIND_HINTS, DOCUMENT_STATUS_LABELS } from '@tasiyoruz/contracts';
import { useActionState, useRef, useState } from 'react';
import { uploadDocument, type ActionState } from './actions';

/** 1 KB altındaki dosya "0 KB" görünmesin. */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const STATUS_TONE: Record<string, string> = {
  PENDING: 'bg-surface-2 text-muted',
  APPROVED: 'bg-[#dff0e5] text-[#1f6b45]',
  REJECTED: 'bg-[#f7e0dd] text-[#8a2a1f]',
  EXPIRED: 'bg-[#f7e0dd] text-[#8a2a1f]',
};

/**
 * Tek bir belge türünün yükleme kartı.
 *
 * <p>Dosya alanı {@code capture="environment"} taşıyor: telefonda doğrudan arka kamera
 * açılıyor, kullanıcı önce fotoğraf çekip sonra galeriden aramak zorunda kalmıyor
 * (docs/11 "kamerayla tek seferde yükleme"). Masaüstünde alan normal dosya seçici.
 */
export function DocumentUpload({
  kind,
  displayName,
  document,
  required,
  editable,
  wantsExpiry,
}: {
  kind: DocumentKind;
  displayName: string;
  document: CarrierDocumentView | null;
  required: boolean;
  editable: boolean;
  wantsExpiry: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(uploadDocument, {});
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-semibold">{displayName}</span>
        {required && !document && <span className="label-mono text-[var(--route-deep)]">zorunlu</span>}
        {document && (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[document.status]}`}>
            {DOCUMENT_STATUS_LABELS[document.status]}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">{DOCUMENT_KIND_HINTS[kind]}</p>

      {document?.rejectionReason && (
        <p className="mt-2 rounded-field bg-[#f7e0dd] px-3 py-2 text-sm text-[#8a2a1f]">
          Red gerekçesi: {document.rejectionReason}
        </p>
      )}
      {document && (
        <p className="label-mono mt-2 text-muted">
          {document.originalFilename ?? 'dosya'} · {formatSize(document.sizeBytes)}
          {document.expiresOn ? ` · geçerlilik ${new Date(document.expiresOn).toLocaleDateString('tr-TR')}` : ''}
        </p>
      )}

      {editable && (
        <form action={action} className="mt-3 flex flex-wrap items-end gap-3">
          <input type="hidden" name="kind" value={kind} />
          <div>
            {/* Alan görsel olarak gizli, tetikleyici aşağıdaki buton. Erişilebilir ad
                olmadan ekran okuyucu buraya sekince ne olduğunu söyleyemiyordu. */}
            <input ref={inputRef} type="file" name="file" required accept="image/*,application/pdf"
              capture="environment" className="sr-only"
              aria-label={`${displayName} dosyası seç`}
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />
            <button type="button" onClick={() => inputRef.current?.click()}
              className="min-h-11 rounded-field border border-line px-4 py-2.5 text-sm font-semibold transition hover:border-route hover:bg-surface-2">
              {document ? 'Yeniden yükle' : 'Fotoğraf çek ya da dosya seç'}
            </button>
            {fileName && <span className="mt-1 block max-w-56 truncate text-xs text-muted">{fileName}</span>}
          </div>

          {wantsExpiry && (
            <label className="text-sm">
              <span className="label-mono block text-muted">Son geçerlilik</span>
              <input type="date" name="expiresOn" defaultValue={document?.expiresOn ?? ''}
                className="min-h-11 rounded-field border border-line bg-surface-2 px-3 py-2.5 outline-none transition hover:border-muted focus:border-route focus:ring-2 focus:ring-route/25" />
            </label>
          )}

          <button type="submit" disabled={pending || !fileName}
            className="min-h-11 rounded-field bg-route px-4 py-2.5 text-sm font-bold text-[var(--route-ink)] transition hover:bg-[var(--route-hover)] hover:shadow-[0_6px_18px_rgb(244_159_44_/_0.30)] active:translate-y-px disabled:opacity-60">
            {pending ? 'Yükleniyor…' : 'Yükle'}
          </button>
          {state.error && <p className="basis-full text-sm text-[#8a2a1f]">{state.error}</p>}
        </form>
      )}
    </div>
  );
}
