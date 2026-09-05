import Link from 'next/link';

const NAV = [
  { href: '/#nasil-calisir', label: 'Nasıl çalışır' },
  { href: '/fiyat-hesapla', label: 'Fiyat hesapla' },
  { href: '/sofor-ol', label: 'Şoför ol' },
  { href: '/kurumsal', label: 'Kurumsal' },
  { href: '/rotalar', label: 'Rotalar' },
];

export function Header() {
  return (
    <header className="theme-dark border-b border-line bg-bg">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5 py-3 text-lg font-extrabold text-ink">
          <span className="grid size-8 place-items-center rounded-lg bg-amber" aria-hidden>
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="var(--amber-ink)"
              strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 16 L9 8 L15 16 L21 8" />
            </svg>
          </span>
          Taşıyoruz
        </Link>

        {/* Mobilde gezinme yok: alt sayfalara footer'dan gidiliyor */}
        <nav aria-label="Ana gezinme" className="ml-6 hidden items-center gap-6 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="py-3.5 text-sm text-muted transition hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <span className="label-mono hidden text-muted sm:inline">TR · Türkçe</span>
          <Link href="/giris" className="py-3.5 text-sm font-semibold text-ink">
            Giriş yap
          </Link>
          <Link
            href="/fiyat-hesapla"
            className="rounded-field bg-amber px-4 py-3.5 text-sm font-bold text-[var(--amber-ink)] transition hover:brightness-105"
          >
            Yük ver
          </Link>
        </div>
      </div>
    </header>
  );
}
