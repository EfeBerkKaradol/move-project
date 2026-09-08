'use client';

import { useRef, useState, useTransition } from 'react';
import { removeListingPhoto, uploadListingPhoto } from '../../actions';

type Frame = { id: string; previewUrl: string; name: string };

/** Sunucu tarafındaki sınırla aynı; ikisi ayrışırsa kullanıcı reddedilen bir dosyayı yükler. */
const MAX_PHOTOS = 10;
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Yük fotoğrafları.
 *
 * <p>Zorunlu, çünkü teklifi isabetli yapan şey bu: "iki koltuk" yazan ilanla gelen
 * araç sahibi koltuğun kapıdan çıkmadığını yerinde öğreniyordu. Fotoğraf, beyanın
 * yalanlanamayan hâli.
 *
 * <p>Kareler ilandan önce yükleniyor — kullanıcı ne gönderdiğini görsün ve yanlışını
 * silebilsin diye. Önizleme yerel dosyadan üretiliyor: yayınlanmamış fotoğrafın
 * sunucudan okunabileceği bir adresi yok ve olmamalı.
 */
export function CargoPhotos({
  photoIds,
  onChange,
}: {
  photoIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    const room = MAX_PHOTOS - photoIds.length;
    if (room <= 0) {
      setError(`En fazla ${MAX_PHOTOS} fotoğraf yükleyebilirsin.`);
      return;
    }

    const chosen = [...files].slice(0, room);
    startTransition(async () => {
      const accepted: Frame[] = [];
      for (const file of chosen) {
        if (file.size > MAX_BYTES) {
          setError(`${file.name} 8 MB'tan büyük.`);
          continue;
        }
        const form = new FormData();
        form.append('file', file);
        const result = await uploadListingPhoto(form);
        if (result.error || !result.id) {
          setError(result.error ?? 'Fotoğraf yüklenemedi.');
          continue;
        }
        accepted.push({ id: result.id, previewUrl: URL.createObjectURL(file), name: file.name });
      }
      if (accepted.length > 0) {
        setFrames((current) => [...current, ...accepted]);
        onChange([...photoIds, ...accepted.map((f) => f.id)]);
      }
    });
    // Aynı dosya art arda seçilebilsin: değer sıfırlanmazsa ikinci seçim change atmıyor
    if (inputRef.current) inputRef.current.value = '';
  };

  const remove = (id: string) => {
    const frame = frames.find((f) => f.id === id);
    if (frame) URL.revokeObjectURL(frame.previewUrl);
    setFrames((current) => current.filter((f) => f.id !== id));
    onChange(photoIds.filter((p) => p !== id));
    // Sunucudaki kopya da gitsin; başarısız olursa süpürme işi 24 saat içinde alır,
    // kullanıcıyı bekletmenin anlamı yok
    startTransition(async () => {
      await removeListingPhoto(id);
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="label-mono text-muted">Yükün fotoğrafı</span>
        <span className="label-mono text-muted">
          {photoIds.length}/{MAX_PHOTOS}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">
        En az bir kare gerekiyor. Eşyanın kendisini çek — kimlik, adres ya da yüz
        görünmesin; bu kareleri teklif veren araç sahipleri görüyor.
      </p>

      {frames.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {frames.map((frame) => (
            <li key={frame.id} className="relative overflow-hidden rounded-field border border-line bg-surface-2">
              {/* next/image yok: dosya yerel bir blob, optimizasyon katmanı okuyamaz */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={frame.previewUrl} alt={frame.name} className="aspect-square w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(frame.id)}
                aria-label={`${frame.name} fotoğrafını kaldır`}
                className="absolute top-1 right-1 size-7 rounded-full bg-ink/75 text-sm leading-none font-bold text-white transition hover:bg-ink"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        className="sr-only"
        aria-label="Yük fotoğrafı çek ya da seç"
        onChange={(e) => add(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending || photoIds.length >= MAX_PHOTOS}
        className="mt-3 min-h-11 rounded-field border border-line px-4 py-2.5 text-sm font-semibold transition hover:border-route hover:bg-surface-2 disabled:opacity-60"
      >
        {pending ? 'Yükleniyor…' : photoIds.length === 0 ? 'Fotoğraf ekle' : 'Bir kare daha ekle'}
      </button>

      {error && <p className="mt-2 text-sm text-[#8a2a1f]">{error}</p>}
    </div>
  );
}
