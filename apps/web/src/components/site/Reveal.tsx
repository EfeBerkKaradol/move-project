'use client';

import { useEffect, useRef } from 'react';

/** İçerik hiçbir koşulda bu süreden fazla gizli kalmaz. */
const SAFETY_NET_MS = 1200;

/**
 * Tüm bölümler için tek gözlemci.
 *
 * <p>Her Reveal kendi IntersectionObserver'ını kurduğunda sayfada yirmiden fazla
 * gözlemci oluyordu; hepsi aynı eşiği aynı kökle izliyor. Telefonda kaydırma
 * sırasında bu, yapılacak işin gereksiz yere çoğalması demek. Tek gözlemci
 * paylaşılıyor, öğe görününce kaydı düşürülüyor.
 */
let observer: IntersectionObserver | null = null;

function show(el: HTMLElement) {
  el.dataset.visible = 'true';
}

function watch(el: HTMLElement): () => void {
  if (typeof IntersectionObserver === 'undefined') {
    show(el);
    return () => {};
  }

  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          show(entry.target as HTMLElement);
          observer!.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
  );

  observer.observe(el);
  return () => observer?.unobserve(el);
}

/**
 * Görünür alana girince açılan bölüm.
 *
 * <p>Animasyon viewport'a girene kadar başlamıyor — açılışta ekran dışındaki
 * onlarca öğeyi oynatmak ilk boyamayı geciktirir.
 *
 * <p>İçeriği görünür kılmak <strong>hiçbir zaman</strong> yalnızca gözlemciye
 * bırakılmıyor: sayfa boyanmadığında (arka plan sekmesi, bazı gömülü görünümler)
 * geri çağrı hiç çalışmıyor ve bölüm sonsuza kadar boş kalıyordu. Bu yüzden hem
 * ilk karede görünürlük elle kontrol ediliyor hem de bir zamanlayıcı güvenlik ağı var.
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

    // Zaten ekrandaysa gözlemciyi beklemeden aç
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      show(el);
      return;
    }

    const unwatch = watch(el);

    // Gözlemci hiç ateşlenmezse içerik yine de görünür olur
    const safetyNet = setTimeout(() => {
      show(el);
      unwatch();
    }, SAFETY_NET_MS + delay);

    return () => {
      clearTimeout(safetyNet);
      unwatch();
    };
  }, [delay]);

  return (
    <div ref={ref} data-reveal className={className} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
