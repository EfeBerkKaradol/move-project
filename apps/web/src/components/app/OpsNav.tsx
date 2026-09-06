import Link from 'next/link';

const ITEMS: { href: string; label: string }[] = [
  { href: '/yonetim', label: 'Pano' },
  { href: '/yonetim/basvurular', label: 'Taşıyıcı başvuruları' },
  { href: '/yonetim/ilanlar', label: 'İlanlar' },
  { href: '/yonetim/isler', label: 'İşler' },
];

/** Operasyon panelinin sekmeleri. Aktif olan altı çizili ve okuyucuya bildirilir. */
export function OpsNav({ active }: { active: string }) {
  return (
    <nav aria-label="Operasyon menüsü" className="-ml-3 flex flex-wrap items-center gap-1">
      {ITEMS.map((item) => {
        const isActive = item.href === active;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center rounded-field px-3 text-sm font-semibold transition hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber ${
              isActive ? 'bg-surface-2 text-ink underline underline-offset-4' : 'text-muted hover:text-ink'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
