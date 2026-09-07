'use client';

import { useEffect, useState, type RefObject } from 'react';

/**
 * Bir sarmalayıcının ekrandan geçişini 0–1 ilerlemeye çevirir.
 *
 * <p>React state'i bilerek kullanılmıyor: kare başına setState, scroll sırasında
 * bütün ağacı yeniden render eder ve animasyon takılır. Bunun yerine geri çağrı
 * doğrudan DOM'a yazar (CSS değişkeni / transform) ve React hiç uyanmaz.
 *
 * <p>Okuma requestAnimationFrame'e sıkıştırılır; tarayıcı boyamadan önce bir kez
 * ölçüm yapılır, ardışık scroll olayları tek kareye toplanır.
 */
export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  onProgress: (p: number) => void,
  enabled = true,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!enabled) {
      // Hareket azaltılmışsa sahne, anlatının tamamlandığı duruma sabitlenir:
      // kullanıcı yüklü dönüşü ve kapanış mesajını hareketsiz görür.
      onProgress(1);
      return;
    }

    let frame = 0;
    let last = -1;

    const measure = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const p = travel <= 0 ? 0 : Math.min(1, Math.max(0, -rect.top / travel));
      // Aynı değeri tekrar yazmak boş iş; eşik altındaki oynamalar da göze görünmez
      if (Math.abs(p - last) < 0.0004) return;
      last = p;
      onProgress(p);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [ref, onProgress, enabled]);
}

/**
 * Medya sorgusu. Sunucuda ve ilk karede `null` döner: boolean varsayılan verilseydi
 * ya hidrasyon uyuşmazlığı çıkar ya da bir kare yanlış kompozisyon boyanırdı.
 * Çağıran taraf `null` durumunda kararsız kalmalı, varsayım yapmamalı.
 */
export function useMedia(query: string): boolean | null {
  const [matches, setMatches] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Kullanıcı hareket istemiyorsa sahne durur, anlatı sabit durumda gösterilir. */
export const usePrefersReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)');
