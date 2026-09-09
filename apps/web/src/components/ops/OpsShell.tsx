import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signOutEverywhere } from '@/auth';
import { BRAND } from '@/lib/brand';
import { Logo } from '@/components/site/Logo';

export const OPS_NAV: { href: string; label: string; icon: React.ReactNode; badgeKey?: string }[] = [
  { href: '/yonetim', label: 'Pano', icon: <path d="M3 12h7V3H3zM14 21h7v-9h-7zM14 3h7v6h-7zM3 21h7v-6H3z" /> },
  { href: '/yonetim/basvurular', label: 'Başvurular', icon: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></> },
  { href: '/yonetim/belgeler', label: 'Belge süreleri', icon: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M9 15h6M9 11h3" /></> },
  { href: '/yonetim/ilanlar', label: 'İlanlar', icon: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9h10M7 13h6" /></> },
  { href: '/yonetim/isler', label: 'İşler', icon: <><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></> },
  { href: '/yonetim/bildirimler', label: 'Bildirimler', icon: <><path d="M4 6h16v12H4z" /><path d="m4 7 8 6 8-6" /></> },
];

/**
 * Operasyon panelinin iskeleti.
 *
 * <p>Pazarlama başlığı ve alt bilgisi burada yok; operasyon ekibi günde yüzlerce kez
 * sayfa değiştiriyor, her seferinde kampanya menüsünü görmesi gürültü. Kenar çubuğu
 * koyu tema (marka), içerik krem (okunurluk) — sitenin geri kalanıyla aynı ikili.
 *
 * <p>Dar ekranda kenar çubuğu {@code <details>} ile açılıp kapanıyor: JS gerekmiyor
 * ve klavyeyle erişilebilir.
 */
export function OpsShell({
  active,
  user,
  badges = {},
  children,
}: {
  active: string;
  user: { name: string; role: string };
  /** Menü rozetleri: işlem bekleyen sayılar (örn. başvurular: 3). */
  badges?: Record<string, number>;
  children: React.ReactNode;
}) {
  const nav = (
    <nav aria-label="Operasyon menüsü" className="flex flex-col gap-2">
      {OPS_NAV.map((item) => {
        const isActive = active === item.href || (item.href !== '/yonetim' && active.startsWith(item.href));
        const badge = badges[item.href];
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            title={item.label}
            className={`relative flex min-h-12 items-center gap-3 rounded-field px-3.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-route md:justify-center xl:justify-start xl:px-4 ${
              isActive ? 'bg-route text-[var(--route-ink)]' : 'text-muted hover:bg-surface-2 hover:text-ink'
            }`}
          >
            <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {item.icon}
            </svg>
            {/* Dar masaüstünde etiket gizli, ad title'da; ekran okuyucu için sr-only */}
            <span className="flex-1 md:sr-only xl:not-sr-only">{item.label}</span>
            {badge ? (
              <span className={`stat rounded-full px-2 py-0.5 text-xs md:absolute md:right-1.5 md:top-1.5 md:px-1.5 md:py-0 xl:static xl:px-2 xl:py-0.5 ${
                isActive ? 'bg-[var(--route-ink)] text-route' : 'bg-route text-[var(--route-ink)]'
              }`}>
                {badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  const initials = user.name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toLocaleUpperCase('tr');
  const identity = (
    <div className="border-t border-line pt-5">
      <div className="flex items-center gap-3 md:justify-center xl:justify-start">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-bold text-ink" aria-hidden>
          {initials}
        </span>
        <div className="min-w-0 md:sr-only xl:not-sr-only">
          <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
          <p className="label-mono mt-0.5 text-muted">{user.role}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2.5">
        <Link href="/" title="Siteye dön"
          className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-field border border-line px-2 text-sm font-semibold text-ink transition hover:border-route hover:bg-surface-2">
          <svg viewBox="0 0 24 24" className="size-4.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 11 12 4l9 7M5 10v10h14V10" />
          </svg>
          <span className="md:sr-only xl:not-sr-only">Siteye dön</span>
        </Link>
        <form action={async () => { 'use server'; redirect(await signOutEverywhere('/')); }}>
          <button type="submit" title="Çıkış"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-field border border-line px-2 text-sm font-semibold text-ink transition hover:border-route hover:bg-surface-2">
            <svg viewBox="0 0 24 24" className="size-4.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9" />
            </svg>
            <span className="md:sr-only xl:not-sr-only">Çıkış</span>
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="theme-cream min-h-screen bg-bg text-ink md:grid md:grid-cols-[5rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)]">
      {/* Masaüstü kenar çubuğu */}
      <aside className="theme-dark sticky top-0 hidden h-screen flex-col gap-8 overflow-y-auto border-r border-line bg-bg p-3 md:flex xl:p-6">
        <Brand />
        <div className="flex-1">{nav}</div>
        {identity}
      </aside>

      {/* Dar ekran: üst çubuk + açılır menü */}
      <details className="theme-dark group border-b border-line bg-bg md:hidden">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-5 text-ink [&::-webkit-details-marker]:hidden">
          <Brand />
          <span className="inline-flex min-h-11 items-center gap-2 rounded-field border border-line px-3 text-sm font-semibold">
            Menü
            <svg viewBox="0 0 16 16" className="size-3.5 transition group-open:rotate-180" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <path d="m3 6 5 5 5-5" />
            </svg>
          </span>
        </summary>
        <div className="space-y-6 border-t border-line p-6">
          {nav}
          {identity}
        </div>
      </details>

      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Brand() {
  return (
    <Link href="/yonetim" title="Pano" className="flex min-h-11 items-center gap-2.5 text-base font-extrabold text-ink md:justify-center xl:justify-start">
      <Logo className="size-7 shrink-0" />
      <span className="md:sr-only xl:not-sr-only">{BRAND.name} <span className="label-mono ml-1 text-route">ops</span></span>
    </Link>
  );
}

/** Sayfa başlığı: kırıntı, başlık, sağda eylem alanı. */
export function OpsPage({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-7xl px-5 py-10 md:px-10 lg:px-14 lg:py-14">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          {eyebrow && <p className="label-mono text-[var(--route-deep)]">{eyebrow}</p>}
          <h1 className="mt-3 text-[clamp(1.7rem,3vw,2.4rem)] leading-[1.08]">{title}</h1>
          {description && <p className="mt-3 max-w-2xl text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div className="mt-10">{children}</div>
    </main>
  );
}
