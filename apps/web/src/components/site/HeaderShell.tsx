'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Navbar'ın kaydırma durumu.
 *
 * <p>Hero'lu sayfada navbar saydam başlar ve koyu sahnenin üzerinde yüzer; sayfa
 * kayınca açık zemine ve ince bir çizgiye geçer. Böylece hem koyu hem açık
 * bölümlerde okunur kalır.
 *
 * <p>Hero'suz sayfalarda (fiyat sayfası, paneller) üste yapışık ve opak durur —
 * saydam olsaydı içerik altından geçerdi.
 */
export function HeaderShell({
  children,
  overlay = false,
}: {
  children: React.ReactNode;
  overlay?: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);
  const frame = useRef(0);

  useEffect(() => {
    if (!overlay) return;
    const read = () => {
      frame.current = 0;
      setScrolled(window.scrollY > 24);
    };
    const schedule = () => {
      if (!frame.current) frame.current = requestAnimationFrame(read);
    };
    read();
    window.addEventListener('scroll', schedule, { passive: true });
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      window.removeEventListener('scroll', schedule);
    };
  }, [overlay]);

  return (
    <header
      data-scrolled={scrolled}
      className={[
        'inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-200',
        // Saydam hâlde hero'nun üstünde yüzmesi için akıştan çıkması gerekiyor;
        // hero'suz sayfalarda akışta kalıp üste yapışır. İkisi aynı anda verilirse
        // hangi position kazanacağı CSS sırasına kalır — biri seçilmeli.
        overlay ? 'fixed' : 'sticky',
        !overlay || scrolled
          ? 'theme-cream border-b border-line bg-[rgb(244_242_236/0.86)] backdrop-blur-md'
          : 'theme-dark border-b border-transparent bg-transparent',
      ].join(' ')}
    >
      <div className="mx-auto flex max-w-[76rem] items-center gap-4 px-6 py-3">{children}</div>
    </header>
  );
}
