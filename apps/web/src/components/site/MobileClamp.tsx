'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';

/**
 * Dar ekranda uzun listeleri kırpar.
 *
 * <p>Telefonda bölümler düz bir duvar hâline geliyordu: yedi araç kartı, beş güven
 * maddesi, hepsi alt alta. Kırpma ilk satırları bırakıyor, gerisini isteyen açıyor.
 * {@code sm} ve üstünde hiçbir şey gizlenmiyor — orada yer var, kırpmak yalnızca
 * fazladan bir tık olurdu.
 *
 * <p>{@code focus-within} ile kırpma kendiliğinden kalkıyor: klavyeyle gezen biri
 * görünmeyen bir karta sekme ile girdiğinde odak kaybolmasın. Kırpılan içerik DOM'da
 * duruyor, yani arama motoru ve ekran okuyucu için eksilen bir şey yok.
 */
export function MobileClamp({
  children,
  maxHeight,
  moreLabel,
  lessLabel = 'Daha az göster',
}: {
  children: React.ReactNode;
  /** Kapalıyken görünen yükseklik; iki satır kart gösterecek kadar. */
  maxHeight: string;
  moreLabel: string;
  lessLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="relative">
        {/* Yükseklik satır içi DEĞİL bir değişkenle veriliyor: satır içi stil sınıf
            tabanlı kuralı hep yener ve sm:max-h-none hiçbir zaman devreye girmezdi. */}
        <div
          className={open ? '' : 'max-h-[var(--clamp-h)] overflow-hidden focus-within:max-h-none sm:max-h-none'}
          style={open ? undefined : ({ ['--clamp-h' as string]: maxHeight } as React.CSSProperties)}
        >
          {children}
        </div>
        {/* Kesme çizgisi yerine solma: içeriğin devam ettiğini söylüyor, bittiğini değil */}
        {!open && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-bg to-transparent sm:hidden"
          />
        )}
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-field border border-line px-4 text-sm font-semibold transition hover:border-route hover:bg-surface-2 sm:hidden"
      >
        {open ? lessLabel : moreLabel}
        <span aria-hidden className={open ? 'rotate-180' : undefined}>
          <Icon name="arrowDown" size={16} />
        </span>
      </button>
    </>
  );
}
