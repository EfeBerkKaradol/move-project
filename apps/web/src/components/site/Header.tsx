import Link from 'next/link';

const NAV = [
  { href: '/fiyat-hesapla', label: 'Fiyat hesapla' },
  { href: '/#nasil-calisir', label: 'Nasıl çalışır' },
  { href: '/#filo', label: 'Araçlar' },
  { href: '/#pano', label: 'Güven panosu' },
];

/**
 * Mobil menü <details> ile kuruluyor: JS gerektirmiyor, klavyeyle açılıp
 * kapanıyor ve ekran okuyucular açılır/kapanır durumunu kendiliğinden bildiriyor.
 * Nav'ı mobilde tamamen gizlemek, bağlantıları erişilemez bırakıyordu.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/60 bg-ground/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-2.5">
        <Link
          href="/"
          className="flex items-center gap-2.5 py-2 font-display text-lg font-extrabold"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-primary" aria-hidden>
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="var(--primary-fg)"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 17V7h9v10" />
              <path d="M13 10h4l3 3.5V17" />
              <circle cx="7.5" cy="17.5" r="1.8" />
              <circle cx="16.5" cy="17.5" r="1.8" />
            </svg>
          </span>
          TurMove
        </Link>

        <nav aria-label="Ana menü" className="ml-auto hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-3 text-sm text-ink-muted transition hover:bg-surface hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/fiyat-hesapla"
          className="ml-auto rounded-pill bg-primary px-4 py-3 text-sm font-medium text-primary-fg transition hover:opacity-90 md:ml-0"
        >
          Fiyat al
        </Link>

        <details className="group relative md:hidden">
          <summary
            aria-label="Menüyü aç"
            className="grid size-11 cursor-pointer list-none place-items-center rounded-pill border border-line [&::-webkit-details-marker]:hidden"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" className="group-open:hidden" />
              <path d="M6 6l12 12M18 6L6 18" className="hidden group-open:block" />
            </svg>
          </summary>
          <nav
            aria-label="Ana menü"
            className="absolute right-0 top-14 w-56 rounded-card border border-line bg-surface p-2 shadow-lift"
          >
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-3 py-3 text-sm transition hover:bg-surface-2"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </details>
      </div>
    </header>
  );
}
