import Link from 'next/link';
import { Reveal } from './Reveal';

/**
 * Hero'nun altına taşan hedef kitle kartları — referans ürünlerin ana sayfada
 * kullandığı kalıp. Ziyaretçi kendini üç yoldan birinde bulup doğrudan
 * ilgili akışa giriyor.
 */
const AUDIENCES = [
  {
    href: '/fiyat-hesapla',
    title: 'Bireysel',
    body: 'Tek eşya, koli ya da ev taşıma. Fiyatı önce gör, sonra sipariş ver.',
    cta: 'Fiyat al',
    tone: 'brand' as const,
  },
  {
    href: '/fiyat-hesapla',
    title: 'Kurumsal',
    body: 'Mağaza teslimatı, palet sevkiyatı ve düzenli gönderi için tek panel.',
    cta: 'Çözümleri gör',
    tone: 'dark' as const,
  },
  {
    href: '/nakliyeci-ol',
    title: 'Nakliyeci',
    body: 'Kendi aracınla çalış. 2027 ilk çeyreğine kadar komisyon yok.',
    cta: 'Başvur',
    tone: 'light' as const,
  },
];

const TONE = {
  brand: 'bg-primary text-primary-fg',
  dark: 'bg-ink text-ground',
  light: 'bg-surface text-ink border border-line',
};

export function AudienceCards() {
  return (
    <section className="relative z-10 -mt-8 pb-20">
      <div className="mx-auto grid max-w-6xl gap-4 px-6 sm:grid-cols-3">
        {AUDIENCES.map((a, i) => (
          <Reveal key={a.title} delay={i * 90}>
            <Link
              href={a.href}
              className={`flex h-full flex-col rounded-card p-6 shadow-lift transition hover:-translate-y-1 ${TONE[a.tone]}`}
            >
              <h2 className="text-2xl font-bold">{a.title}</h2>
              <p className="mt-2 flex-1 text-sm opacity-85">{a.body}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold">
                {a.cta}
                <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
