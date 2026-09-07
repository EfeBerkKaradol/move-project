'use client';

import { useEffect, useRef, useState } from 'react';
import { TRUCK_ASSET } from '@/lib/brand';

/**
 * Sahnedeki araç.
 *
 * <p>Fotogerçekçi bir render {@link TRUCK_ASSET} yoluna konur ve burası kendiliğinden
 * onu kullanır. Dosya yoksa kırık görsel bırakmak yerine çizgisel bir siluete
 * düşülüyor: nihai tasarım gibi görünmemeli ama sahneyi de bozmamalı.
 */
export function TruckAsset({ className }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    // Hidrasyondan önce tamamlanan başarısız yükleme onError'ı hiç tetiklemez:
    // olay, React dinleyicisi bağlanmadan geçip gitmiş olur. Görsel gerçekten
    // yokken kırık bir <img> (yükseklik 0) sahnede sessizce kalıyordu — bağlanır
    // bağlanmaz sonucu bir kez elle yokluyoruz.
    if (img?.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (!failed) {
    return (
      // Sahnede tek bir görsel var ve ilk ekranda görünüyor: next/image'in
      // tembel yükleme ve boyut hesabı burada kazanç sağlamıyor, sade <img> yeterli.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={imgRef}
        src={TRUCK_ASSET}
        alt=""
        className={className}
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }

  return <TruckSilhouette className={className} />;
}

/** Görsel gelene kadarki yedek: yan profil, tek ton, karikatür değil. */
function TruckSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 96" className={className} aria-hidden>
      {/* Zemine oturtan gölge, aracın altında kalsın diye önce çiziliyor */}
      <ellipse cx="118" cy="88" rx="102" ry="5.5" fill="#000" opacity="0.3" />
      <g fill="#eef0ed">
        {/* Dorse */}
        <path d="M6 16h136v54H6z" />
        {/* Çekici: kaput öne doğru alçalıyor, dorseyle aynı gövdede okunuyor */}
        <path d="M146 32h28l20 20v18h-48z" />
      </g>
      {/* Şasi: dorseyle çekiciyi birbirine bağlayan koyu bant */}
      <path d="M6 70h188v6H6z" fill="#3a403a" />
      {/* Cam — kabinin tamamını kaplamıyor, çevresinde gövde payı var */}
      <path d="M152 38h18l13 14h-31z" fill="#20241f" />
      <g fill="#20241f">
        <circle cx="42" cy="76" r="12" />
        <circle cx="104" cy="76" r="12" />
        <circle cx="176" cy="76" r="12" />
      </g>
      <g fill="#8d9389">
        <circle cx="42" cy="76" r="4.5" />
        <circle cx="104" cy="76" r="4.5" />
        <circle cx="176" cy="76" r="4.5" />
      </g>
    </svg>
  );
}
