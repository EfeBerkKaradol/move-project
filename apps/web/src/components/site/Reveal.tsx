'use client';

import { useEffect, useRef } from 'react';

/** İçerik hiçbir koşulda bu süreden fazla gizli kalmaz. */
const SAFETY_NET_MS = 1200;

/**
 * Görünür alana girince açılan bölüm.
 *
 * <p>Animasyon viewport'a girene kadar başlamıyor — açılışta ekran dışındaki
 * onlarca öğeyi oynatmak ilk boyamayı geciktirir.
 *
 * <p>İçeriği görünür kılmak <strong>hiçbir zaman</strong> yalnızca gözlemciye
 * bırakılmıyor: sayfa boyanmadığında (arka plan sekmesi, bazı gömülü görünümler)
 * IntersectionObserver geri çağrısı hiç çalışmıyor ve bölüm sonsuza kadar boş
 * kalıyordu. Bu yüzden hem ilk karede görünürlük elle kontrol ediliyor hem de
 * bir zamanlayıcı güvenlik ağı var.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const show = () => {
      el.dataset.visible = 'true';
    };

    // Zaten ekrandaysa gözlemciyi beklemeden aç
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      show();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          show();
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(el);

    // Gözlemci hiç ateşlenmezse içerik yine de görünür olur
    const safetyNet = setTimeout(() => {
      show();
      observer.disconnect();
    }, SAFETY_NET_MS + delay);

    return () => {
      observer.disconnect();
      clearTimeout(safetyNet);
    };
  }, [delay]);

  return (
    <div ref={ref} data-reveal className={className} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
