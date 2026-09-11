'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isPageNavigation } from '@/lib/navigation';

/**
 * Sayfa geçişi sırasında üstte akan ince çubuk.
 *
 * <p>App Router'da bir bağlantıya dokunulduğunda yeni sayfa sunucudan gelene
 * kadar ekranda <em>hiçbir şey</em> değişmiyor. Sunucu tarafındaki API ya da
 * kimlik servisi uykudan uyanıyorsa (Render ücretsiz katman) bu bekleme 6–90
 * saniyeyi buluyor ve telefonda dokunuş "ölü düğme" gibi görünüyordu —
 * kullanıcı aynı düğmeye üst üste basıyor, sonra vazgeçiyordu.
 *
 * <p>Tıklama yakalama aşamasında dinleniyor: Link'in kendi işleyicisi
 * geçişi başlatmadan önce çubuk açılıyor. Kapanış yol ya da sorgu değişince;
 * aynı sayfa içindeki çapalar hiç açmıyor (bkz. isPageNavigation).
 *
 * <p>Görünüm 120 ms gecikmeli: önbellekten anında gelen geçişlerde çubuk
 * yanıp sönmesin.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [active, setActive] = useState(false);

  // Yol ya da sorgu değişti: geçiş bitti
  useEffect(() => {
    setActive(false);
  }, [pathname, search]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!isPageNavigation(anchor, new URL(window.location.href))) return;
      setActive(true);
    };
    // Geri/ileri tuşu: tarayıcı geçişi kendisi başlatıyor, çubuk yol değişince kapanır
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  if (!active) return null;
  return (
    <div
      role="progressbar"
      aria-label="Sayfa yükleniyor"
      aria-valuetext="Yükleniyor"
      className="nav-progress pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px] overflow-hidden"
    >
      <div className="nav-progress__bar h-full w-2/5 rounded-r-full bg-route shadow-[0_0_8px_var(--route)]" />
    </div>
  );
}
