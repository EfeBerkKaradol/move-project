import Link from 'next/link';

export type SubNavItem = { href: string; label: string };

/**
 * Panel içi sekme bağlantıları. Dokunma hedefi en az 44px (docs/01),
 * hover ve klavye odağı belirgin.
 */
export function SubNav({ items, className = '' }: { items: SubNavItem[]; className?: string }) {
  return (
    <nav className={`flex flex-wrap items-center gap-1 ${className}`}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="inline-flex min-h-11 items-center rounded-field px-3 text-sm font-semibold underline underline-offset-4 transition hover:bg-surface-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
