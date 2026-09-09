'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { fotograflariOku, fotograflariTemizle } from '@/lib/photo-store';
import { EN_FAZLA_FOTOGRAF, fotografSorunu } from '@/lib/uploads';
import { removeListingPhoto, uploadListingPhoto } from '../../actions';

type Frame = { id: string; previewUrl: string; name: string };

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
 *
 * <p>Fiyat adımında seçilenler tarayıcıda bekliyordu (bkz. photo-store); kimlik
 * ancak burada belli olduğu için sunucuya <em>burada</em> gidiyorlar. Devralma
 * bittiğinde yerel kopya siliniyor: tampon olarak duruyor, ikinci bir depo
 * olarak değil.
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
  const [devralma, setDevralma] = useState(true);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  /*
   * Fiyat adımından gelen kareler. Kullanıcı bunları zaten seçti; yeniden
   * seçtirmek, girişten önce yaptığı işi çöpe atmak olurdu.
   */
  useEffect(() => {
    let iptal = false;
    (async () => {
      const bekleyenler = await fotograflariOku();
      if (iptal || bekleyenler.length === 0) {
        if (!iptal) setDevralma(false);
        return;
      }

      const alinanlar: Frame[] = [];
      const kalanlar: string[] = [];
      for (const kayit of bekleyenler.slice(0, EN_FAZLA_FOTOGRAF)) {
        const form = new FormData();
        form.append('file', new File([kayit.blob], kayit.name, { type: kayit.type }));
        const sonuc = await uploadListingPhoto(form);
        if (sonuc.error || !sonuc.id) {
          kalanlar.push(kayit.name);
          continue;
        }
        alinanlar.push({
          id: sonuc.id,
          previewUrl: URL.createObjectURL(kayit.blob),
          name: kayit.name,
        });
      }
      if (iptal) return;

      if (alinanlar.length > 0) {
        setFrames(alinanlar);
        onChange(alinanlar.map((f) => f.id));
      }
      if (kalanlar.length > 0) {
        setError(`Şu fotoğraflar yüklenemedi, tekrar ekleyebilirsin: ${kalanlar.join(', ')}`);
      }
      // Tampon boşaltılıyor: aynı kareler bir sonraki ilanda tekrar yüklenmesin
      await fotograflariTemizle();
      setDevralma(false);
    })();
    return () => {
      iptal = true;
    };
    // Yalnızca ilk açılışta; sonrasını ekleme ve silme yönetiyor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const add = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    const room = EN_FAZLA_FOTOGRAF - photoIds.length;
    if (room <= 0) {
      setError(`En fazla ${EN_FAZLA_FOTOGRAF} fotoğraf yükleyebilirsin.`);
      return;
    }

    const chosen = [...files].slice(0, room);
    startTransition(async () => {
      const accepted: Frame[] = [];
      for (const file of chosen) {
        const sorun = fotografSorunu(file);
        if (sorun) {
          setError(sorun);
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
          {photoIds.length}/{EN_FAZLA_FOTOGRAF}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">
        En az bir kare gerekiyor. Eşyanın kendisini çek — kimlik, adres ya da yüz
        görünmesin; bu kareleri teklif veren araç sahipleri görüyor.
      </p>

      {devralma && photoIds.length === 0 && (
        <p className="mt-3 text-sm text-muted">Fiyat adımındaki fotoğrafların yükleniyor…</p>
      )}

      {frames.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {frames.map((frame) => (
            <li key={frame.id} className="relative overflow-hidden rounded-field border border-line bg-surface-2">
              {/* next/image yok: dosya yerel bir blob, optimizasyon katmanı okuyamaz */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={frame.previewUrl} alt={frame.name} className="aspect-square w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(frame.id)}
                aria-label={`${frame.name} fotoğrafını kaldır`}
                className="absolute top-1 right-1 grid size-11 place-items-center rounded-full bg-ink/70 text-lg leading-none font-bold text-white transition hover:bg-ink sm:size-9 sm:text-base"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* capture yok: kamerayı zorlamak, eşyasını zaten fotoğraflamış kullanıcıyı
          galerisine erişemez hâlde bırakıyordu. accept="image/*" telefonda yine
          "Fotoğraf Çek" seçeneğini sunuyor, seçme hakkını da bırakıyor. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-label="Yük fotoğrafı çek ya da seç"
        onChange={(e) => add(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending || devralma || photoIds.length >= EN_FAZLA_FOTOGRAF}
        className="mt-3 min-h-11 rounded-field border border-line px-4 py-2.5 text-sm font-semibold transition hover:border-route hover:bg-surface-2 disabled:opacity-60"
      >
        {pending ? 'Yükleniyor…' : photoIds.length === 0 ? 'Fotoğraf ekle' : 'Bir kare daha ekle'}
      </button>

      {error && <p className="mt-2 text-sm text-[#8a2a1f]">{error}</p>}
    </div>
  );
}
