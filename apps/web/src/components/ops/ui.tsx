import type { CarrierStatus, ListingStatus, TripStage } from '@tasiyoruz/contracts';
import Link from 'next/link';

/** Panelin küçük yapı taşları: rozet, sayı kartı, tablo, arama, boş durum. */

export type Tone = 'neutral' | 'amber' | 'green' | 'red';

export const CARRIER_TONE: Record<CarrierStatus, Tone> = {
  DRAFT: 'neutral', PENDING_REVIEW: 'amber', APPROVED: 'green', REJECTED: 'red', SUSPENDED: 'red',
};

export const LISTING_TONE: Record<ListingStatus, Tone> = {
  OPEN: 'amber', AWARDED: 'green', EXPIRED: 'neutral', CANCELLED: 'red',
};

export function tripTone(stage: TripStage): Tone {
  if (stage === 'COMPLETED') return 'green';
  if (stage === 'DELIVERED') return 'amber';
  return 'neutral';
}

const TONE: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted',
  amber: 'bg-[var(--amber-soft)] text-[#8a5c10]',
  green: 'bg-[#dff0e5] text-[#1f6b45]',
  red: 'bg-[#f7e0dd] text-[#8a2a1f]',
};

export function Pill({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${TONE[tone]}`}>
      {children}
    </span>
  );
}

/**
 * Sayı kartı. Bağlam satırı sayının ne anlama geldiğini söylüyor ("4'ü teklif
 * bekliyor"); çıplak sayı operasyona bir şey söylemiyordu.
 */
export function StatCard({
  label,
  value,
  context,
  href,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  context?: string;
  href?: string;
  tone?: Tone;
}) {
  const accent = tone === 'amber' ? 'border-amber' : tone === 'red' ? 'border-[#e6b8b2]' : 'border-line';
  const number = tone === 'amber' ? 'text-[#8a5c10]' : tone === 'red' ? 'text-[#8a2a1f]' : 'text-ink';
  const body = (
    <>
      <p className="label-mono text-muted">{label}</p>
      <p className={`stat mt-4 text-3xl leading-none ${number}`}>{value}</p>
      {context && <p className="mt-3 text-sm text-muted">{context}</p>}
    </>
  );
  const cls = `block rounded-card border bg-surface p-6 shadow-card ${accent}`;
  return href
    ? <Link href={href} className={`${cls} transition hover:-translate-y-px hover:shadow-lift`}>{body}</Link>
    : <div className={cls}>{body}</div>;
}

/** GET formu: sorgu adres çubuğunda kalır, paylaşılabilir ve geri tuşuyla korunur. */
export function SearchForm({
  placeholder,
  value,
  hidden = {},
}: {
  placeholder: string;
  value: string;
  hidden?: Record<string, string>;
}) {
  return (
    <form method="get" role="search" className="flex w-full max-w-md items-center gap-3">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <label className="relative flex-1">
        <span className="sr-only">Ara</span>
        <svg viewBox="0 0 20 20" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <circle cx="9" cy="9" r="6" /><path d="m14 14 4 4" />
        </svg>
        <input
          type="search"
          name="q"
          defaultValue={value}
          placeholder={placeholder}
          className="min-h-11 w-full rounded-field border border-line bg-surface pl-9 pr-3 text-sm outline-none transition hover:border-muted focus:border-amber focus:ring-2 focus:ring-amber/25"
        />
      </label>
      <button type="submit" className="min-h-11 rounded-field border border-line bg-surface px-4 text-sm font-semibold transition hover:border-amber hover:bg-surface-2">
        Ara
      </button>
    </form>
  );
}

/** Süzgeç sekmeleri; seçili olan işaretli. */
export function FilterTabs({
  items,
  selected,
  hrefFor,
}: {
  items: { value: string; label: string; count?: number }[];
  selected: string;
  hrefFor: (value: string) => string;
}) {
  return (
    <nav aria-label="Süzgeç" className="flex flex-wrap gap-3">
      {items.map((f) => {
        const on = f.value === selected;
        return (
          <Link key={f.value} href={hrefFor(f.value)} aria-current={on ? 'true' : undefined}
            className={`inline-flex min-h-11 items-center gap-2 rounded-field border px-4 text-sm font-semibold transition ${
              on ? 'border-amber bg-[var(--amber-soft)] text-[#8a5c10]' : 'border-line bg-surface text-muted hover:border-muted hover:text-ink'
            }`}>
            {f.label}
            {f.count !== undefined && <span className="stat text-xs opacity-70">{f.count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Sayısal sütunlar sağa yaslı. */
  align?: 'left' | 'right';
  /** Dar ekranda kartta gösterilmesin (ikincil bilgi). */
  hideOnMobile?: boolean;
  /** Dar masaüstünde (768–1024) sütun gizlensin; kartta yine görünür. */
  secondary?: boolean;
  className?: string;
};

/**
 * Veri tablosu. Masaüstünde tablo, dar ekranda satır başına kart: yatay kaydırılan
 * tablo telefonda kullanılmıyor, operasyon ekibinin yarısı sahada telefonda.
 */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  rowHref,
  empty,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string;
  empty: string;
}) {
  if (rows.length === 0) return <EmptyState>{empty}</EmptyState>;

  return (
    <>
      {/* Dar masaüstünde tablo yatay kayar; satırları dört satıra kırmaktan iyi */}
      <div className="hidden overflow-x-auto rounded-card border border-line bg-surface shadow-card md:block">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="bg-surface-2">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col"
                  className={`label-mono whitespace-nowrap px-5 py-4 font-medium text-muted ${c.align === 'right' ? 'text-right' : 'text-left'} ${c.secondary ? 'hidden lg:table-cell' : ''}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={rowKey(row)} className={rowHref ? 'group transition hover:bg-surface-2' : ''}>
                {columns.map((c, i) => (
                  <td key={c.key} className={`px-5 py-4 align-middle ${c.align === 'right' ? 'text-right' : ''} ${c.secondary ? 'hidden lg:table-cell' : ''} ${c.className ?? ''}`}>
                    {rowHref && i === 0
                      ? <Link href={rowHref(row)} className="block -m-5 p-5 min-h-11 focus-visible:outline-2 focus-visible:outline-amber">{c.cell(row)}</Link>
                      : c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-4 md:hidden">
        {rows.map((row) => {
          const visible = columns.filter((c) => !c.hideOnMobile);
          const body = (
            <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 text-sm">
              {visible.map((c) => (
                <div key={c.key} className="contents">
                  <dt className="label-mono self-center text-muted">{c.header}</dt>
                  <dd className="min-w-0">{c.cell(row)}</dd>
                </div>
              ))}
            </dl>
          );
          return (
            <li key={rowKey(row)} className="rounded-card border border-line bg-surface p-5 shadow-card">
              {rowHref ? <Link href={rowHref(row)} className="block">{body}</Link> : body}
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-line bg-surface/60 p-12 text-center">
      <p className="text-sm font-semibold text-muted">{children}</p>
    </div>
  );
}

export function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Tarih: bugünse saat, değilse gün ve saat. Operasyon "ne zaman" sorusunu hızlı okusun. */
export function when(iso: string): string {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return today
    ? d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Göreli süre: "3 sa önce", "2 gün önce". */
export function ago(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60_000);
  if (m < 1) return 'az önce';
  if (m < 60) return `${m} dk önce`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} sa önce`;
  return `${Math.round(h / 24)} gün önce`;
}
