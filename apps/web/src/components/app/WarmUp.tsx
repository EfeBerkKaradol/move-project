'use client';

import { useEffect } from 'react';

/**
 * Arka plandaki servisleri ziyaretçi henüz okurken uyandırır.
 *
 * <p>API ve kimlik servisi ücretsiz katmanda 15 dakika istek almayınca uyuyor;
 * ilk istek 30–90 saniye sürüyor. Ziyaretçi ana sayfayı okurken sessizce
 * birer istek atılıyor ki "Yüküm var" ya da "Giriş yap" dediğinde servisler
 * çoktan ayakta olsun.
 *
 * <p>Yalnızca oturum başına bir kez (sessionStorage); her sayfa geçişinde
 * tekrarlamak boş trafik olurdu. İstekler <code>no-cors</code>: yanıt
 * okunmuyor, kişisel veri taşınmıyor, yalnızca sunucuya dokunuluyor.
 */
export function WarmUp({ targets }: { targets: string[] }) {
  const key = targets.join('|');

  useEffect(() => {
    if (!key) return;
    try {
      if (sessionStorage.getItem('karinca.warm') === key) return;
      sessionStorage.setItem('karinca.warm', key);
    } catch {
      // Gizli sekme vb.: depolama yoksa her sayfada bir kez atılır, zararsız
    }
    const ping = () => {
      for (const url of key.split('|')) {
        fetch(url, { mode: 'no-cors', cache: 'no-store', credentials: 'omit' }).catch(() => {});
      }
    };
    // İlk boyamayı yavaşlatmasın: tarayıcı boşa düşünce, en geç 3 sn içinde
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(ping, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(ping, 1500);
    return () => window.clearTimeout(id);
  }, [key]);

  return null;
}
