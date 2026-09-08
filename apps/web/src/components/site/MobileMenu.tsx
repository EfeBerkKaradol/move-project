'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

export type MenuItem = { href: string; label: string };

/**
 * Dar ekran menüsü.
 *
 * <p>Buna kadar 1024 pikselin altında <strong>hiç gezinme yoktu</strong>: başlıkta
 * yalnızca logo ve "Yük ver" duruyordu, "Yük bul", "Nasıl çalışır", "Araçlar" ve
 * hesap bağlantıları telefonda da tablette de erişilemiyordu. Menü bunları geri
 * getiriyor.
 *
 * <p>İstemci bileşeni olması şart — açık/kapalı bir durum var. Çıkış formu sunucuda
 * üretilip {@code children} olarak geçiyor; server action'ı istemciye taşımaya gerek
 * yok.
 */
export function MobileMenu({
  items,
  account,
  children,
}: {
  items: MenuItem[];
  /** Hesap bağlantıları — panel, hesabım, giriş. Boşsa bölüm çizilmiyor. */
  account: MenuItem[];
  /** Çıkış formu; yalnızca oturum açıkken veriliyor. */
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const pathname = usePathname();
  const firstOpen = useRef(true);

  // Sayfa değişince kapansın. Aksi hâlde bağlantıya basıldığında menü açık kalıyor
  // ve kullanıcı gittiği sayfayı göremiyor.
  useEffect(() => {
    if (firstOpen.current) {
      firstOpen.current = false;
      return;
    }
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    // Menü açıkken arkadaki sayfa kaymasın; kaydırılan yüzeyin hangisi olduğu
    // belirsizse kullanıcı menüyü kapatmadan sayfayı kaybediyor
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Menüyü kapat' : 'Menüyü aç'}
        // z-50: aşağıdaki tıklama yakalayıcı başlık çubuğunu da örtüyor; düğme
        // onun üstünde kalmazsa menü ikinci dokunuşta kapanmıyor
        className="relative z-50 grid size-11 place-items-center rounded-field border border-line transition hover:bg-surface-2"
      >
        <Icon name={open ? 'close' : 'menu'} size={20} />
      </button>

      {open && (
        <>
          {/* Dışarı dokunmak kapatsın: menüde "kapat"ı aramak zorunda kalmasın.
              Görünmez — karartma başlığın kendi yığın bağlamının içinde kaldığı için
              çubuğu da soldururdu; panelin gölgesi zaten ayrımı veriyor. */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          {/* top-full: panel başlığın altına yapışıyor. Sabit bir piksel değeri
              yazsaydık başlık yüksekliği değiştiğinde panel kayardı. */}
          <div
            id={panelId}
            className="theme-cream absolute inset-x-0 top-full z-40 max-h-[70svh] overflow-y-auto border-b border-line bg-bg px-6 pb-6 shadow-[0_18px_40px_rgb(20_22_21/0.12)]"
          >
            <nav aria-label="Ana menü">
              <ul>
                {items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex min-h-14 items-center justify-between border-b border-line text-[15px] font-semibold transition hover:text-[var(--route-deep)]"
                    >
                      {item.label}
                      <span aria-hidden className="text-muted">
                        <Icon name="arrowRight" size={16} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {(account.length > 0 || children) && (
              <div className="mt-5">
                <p className="label-mono text-muted">Hesap</p>
                <ul className="mt-1">
                  {account.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="flex min-h-14 items-center justify-between border-b border-line text-[15px] font-semibold transition hover:text-[var(--route-deep)]"
                      >
                        {item.label}
                        <span aria-hidden className="text-muted">
                          <Icon name="arrowRight" size={16} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {children && <div className="mt-4">{children}</div>}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
