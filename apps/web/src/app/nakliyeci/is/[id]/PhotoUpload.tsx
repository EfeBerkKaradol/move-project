'use client';

import type { TripPhotoKind, TripPhotoView } from '@tasiyoruz/contracts';
import { useActionState, useRef, useState } from 'react';
import { uploadTripPhoto, type ActionState } from '../../actions';

/**
 * Taşıma fotoğrafı yükleme.
 *
 * <p>Dosya alanı {@code capture="environment"} taşıyor: sürücü telefonda arka kamerayı
 * doğrudan açıyor, galeriden dosya aramıyor. Araç içinde tek elle kullanım hedefi
 * (docs/03) bunu gerektiriyor.
 */
export function PhotoUpload({
  tripId,
  kind,
  label,
  photos,
  hint,
}: {
  tripId: string;
  kind: TripPhotoKind;
  label: string;
  photos: TripPhotoView[];
  hint?: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(uploadTripPhoto, {});
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="label-mono text-muted">{label}</span>
        <span className="label-mono text-muted">{photos.length} kare</span>
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}

      {photos.length > 0 && (
        <ul className="mt-2 space-y-1">
          {photos.map((p) => (
            <li key={p.id} className="text-xs text-muted">
              {new Date(p.uploadedAt).toLocaleString('tr-TR')} ·{' '}
              {p.uploadedByRole === 'DRIVER' ? 'sen' : 'yük veren'} ·{' '}
              {(p.sizeBytes / 1024).toFixed(0)} KB
            </li>
          ))}
        </ul>
      )}

      <form action={action} className="mt-2 flex flex-wrap items-center gap-2">
        <input type="hidden" name="tripId" value={tripId} />
        <input type="hidden" name="kind" value={kind} />
        {/* Görsel olarak gizli; erişilebilir adı olmadan ekran okuyucuda sessiz kalıyordu */}
        <input ref={inputRef} type="file" name="file" required accept="image/*" capture="environment"
          className="sr-only" aria-label={`${label} çek ya da seç`}
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />
        <button type="button" onClick={() => inputRef.current?.click()}
          className="min-h-11 rounded-field border border-line px-4 py-2.5 text-sm font-semibold transition hover:border-amber hover:bg-surface-2">
          Fotoğraf çek
        </button>
        <button type="submit" disabled={pending || !fileName}
          className="min-h-11 rounded-field bg-amber px-4 py-2.5 text-sm font-bold text-[var(--amber-ink)] transition hover:bg-[var(--amber-hover)] hover:shadow-[0_6px_18px_rgb(244_159_44_/_0.30)] active:translate-y-px disabled:opacity-60">
          {pending ? 'Yükleniyor…' : 'Yükle'}
        </button>
        {fileName && <span className="max-w-40 truncate text-xs text-muted">{fileName}</span>}
        {state.error && <p className="basis-full text-sm text-[#8a2a1f]">{state.error}</p>}
      </form>
    </div>
  );
}
