import Link from 'next/link';
import { CITIES } from '@turmove/shared';
import { RouteAnimation } from './RouteAnimation';

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:items-center lg:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-accent-ink">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full rounded-full bg-accent animate-ring" />
              <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
            </span>
            Komisyonsuz dönem · 2027 ilk çeyreğine kadar
          </span>

          <h1 className="mt-6 font-display text-[clamp(2.4rem,6vw,4rem)] font-extrabold leading-[1.02]">
            Ne taşıyacağını söyle,
            <br />
            <span className="text-accent">aracı biz bulalım.</span>
          </h1>

          <p className="mt-5 max-w-lg text-lg text-ink-muted">
            Hangi aracın gerektiğini bilmenize gerek yok. Yükünüzü tarif edin; uygun aracı,
            net fiyatı ve neden o araç olduğunu tek ekranda görün.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/fiyat-hesapla"
              className="rounded-xl bg-primary px-6 py-3.5 font-medium text-primary-fg shadow-card transition hover:opacity-90"
            >
              Fiyat hesapla — kayıt gerekmez
            </Link>
            <Link
              href="#nasil-calisir"
              className="rounded-xl border border-line bg-surface px-6 py-3.5 font-medium transition hover:border-ink-muted"
            >
              Nasıl çalışır?
            </Link>
          </div>

          <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t border-line pt-6">
            {[
              ['7', 'araç tipi', 'Motordan tıra'],
              ['8', 'yük kategorisi', 'Zarftan ev taşımaya'],
              [String(CITIES.length), 'şehir', CITIES.map((c) => c.name).join(', ')],
            ].map(([value, unit, hint]) => (
              <div key={unit}>
                <dt className="sr-only">{unit}</dt>
                <dd>
                  <span className="font-display text-2xl font-bold tabular-nums">{value}</span>{' '}
                  <span className="text-sm text-ink-muted">{unit}</span>
                  <span className="block text-xs text-ink-muted">{hint}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-card border border-line bg-surface p-6 shadow-lift">
          <RouteAnimation />
          <div className="mt-5 flex items-center justify-between gap-4 border-t border-line pt-4 text-sm">
            <span className="text-ink-muted">Taşıma boyunca canlı konum</span>
            <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-ink">
              Faz 2&apos;de geliyor
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
