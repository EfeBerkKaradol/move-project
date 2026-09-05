import Link from 'next/link';
import { Reveal } from './Reveal';

const SHIPPER = {
  eyebrow: 'Yük veren için',
  title: 'Fiyatı görmek için üye olmanız gerekmiyor.',
  steps: [
    ['Rotanızı ve yükünüzü girin', 'Fotoğraf çekin, sistem araç tipini önersin.'],
    ['Teklifleri karşılaştırın', 'Puan, tamamlanan iş ve araç bilgisi yan yana.'],
    ['Takip edin, teslimatta onaylayın', 'Canlı konum, teslim fotoğrafı ve e-irsaliye.'],
  ],
  cta: { href: '/fiyat-hesapla', label: 'Ücretsiz fiyat al' },
};

const CARRIER = {
  eyebrow: 'Araç sahibi için',
  title: 'İşi almak için pazarlığa girmenize gerek yok.',
  steps: [
    ['Belgelerini bir kez yükle', 'Ruhsat, ehliyet, K belgesi ve SRC — kamerayla.'],
    ['Rotanı gir, yükler sana gelsin', 'Boş dönüşünü kaydet, koridorundaki ilanlar düşsün.'],
    ['Net kazancını gör, gününde al', 'Komisyon düşülmüş tutar ve ödeme tarihi ekranda.'],
  ],
  cta: { href: '/sofor-ol', label: 'Şoför olarak katıl' },
};

export function TwoSidedMarket() {
  return (
    <section id="nasil-calisir" className="theme-cream bg-bg pb-20">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <h2 className="text-[clamp(1.9rem,4vw,3.25rem)]">Tek pazar, iki taraf.</h2>
        </Reveal>

        <div className="mt-7 grid gap-4 lg:grid-cols-2">
          <Reveal delay={80}>
            <SideCard {...SHIPPER} variant="light" />
          </Reveal>

          <Reveal delay={140}>
            <SideCard {...CARRIER} variant="dark" />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function SideCard({
  eyebrow,
  title,
  steps,
  cta,
  variant,
}: {
  eyebrow: string;
  title: string;
  steps: string[][];
  cta: { href: string; label: string };
  variant: 'light' | 'dark';
}) {
  const dark = variant === 'dark';
  return (
    <div
      className={[
        'h-full rounded-card p-6 sm:p-8',
        dark ? 'theme-dark bg-bg' : 'border border-line bg-surface',
      ].join(' ')}
    >
      <p className={`label-mono ${dark ? 'text-amber' : 'text-[#8a5c10]'}`}>{eyebrow}</p>
      <h3 className="mt-3 max-w-sm text-[clamp(1.35rem,3.4vw,1.6rem)] leading-[1.15]">{title}</h3>

      <ol className="mt-6 space-y-4">
        {steps.map(([heading, body], i) => (
          <li key={heading} className="flex gap-3.5">
            <span
              className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md text-xs font-bold ${
                dark ? 'bg-surface text-ink' : 'bg-surface-2 text-ink'
              }`}
            >
              {i + 1}
            </span>
            <span>
              <span className="block text-sm font-bold">{heading}</span>
              <span className="mt-0.5 block text-sm text-muted">{body}</span>
            </span>
          </li>
        ))}
      </ol>

      <Link
        href={cta.href}
        className={[
          'mt-7 inline-block rounded-field px-5 py-3 text-sm font-bold transition hover:brightness-105',
          dark ? 'bg-surface text-ink' : 'bg-amber text-[var(--amber-ink)]',
        ].join(' ')}
        style={dark ? { background: '#ffffff', color: '#0d1015' } : undefined}
      >
        {cta.label}
      </Link>
    </div>
  );
}
