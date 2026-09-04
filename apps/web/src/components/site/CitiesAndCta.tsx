import Link from 'next/link';
import { CITIES } from '@turmove/shared';
import { Reveal } from './Reveal';

export function CitiesAndCta({ districtCount }: { districtCount: number }) {
  return (
    <>
      <section id="sehirler" className="border-b border-line py-20">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Hizmet bölgeleri
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
              Üç şehirde başlıyoruz
            </h2>
            <p className="mt-3 max-w-xl text-ink-muted">
              Toplam {districtCount} ilçe. Arz ve talebi bir bölgede yoğunlaştırmak, geniş
              alana yayılmaktan daha hızlı araç bulmayı sağlıyor.
            </p>
          </Reveal>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {CITIES.map((city, i) => (
              <Reveal key={city.code} delay={i * 80}>
                <div className="rounded-card border border-line bg-surface p-6">
                  <p className="font-display text-2xl font-bold">{city.name}</p>
                  <p className="mt-1 text-sm text-ink-muted">Plaka {city.code}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="nakliyeci" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <div className="grid gap-8 rounded-card border border-line bg-surface p-8 lg:grid-cols-2 lg:items-center lg:p-12">
              <div>
                <h2 className="font-display text-3xl font-bold">
                  Nakliyeciyseniz: komisyon yok
                </h2>
                <p className="mt-3 text-ink-muted">
                  2027 ilk çeyreğine kadar taşıma ücretinden komisyon almıyoruz. Müşterinin
                  ödediği tutarın tamamı size gidiyor. Firmalarla birim fiyat görüşmelerimiz
                  sürüyor.
                </p>
                <Link
                  href="/nakliyeci-ol"
                  className="mt-6 inline-block rounded-pill bg-primary px-6 py-3.5 font-medium text-primary-fg transition hover:opacity-90"
                >
                  Başvuru yap
                </Link>
              </div>

              <dl className="grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2">
                {[
                  ['%0', 'Komisyon oranı'],
                  ['%100', 'Size kalan tutar'],
                  ['Pazarlık', 'Fiyatı siz belirleyin'],
                  ['Şeffaf', 'Rakip sayısını görün'],
                ].map(([value, label]) => (
                  <div key={label} className="bg-surface px-5 py-4">
                    <dt className="sr-only">{label}</dt>
                    <dd>
                      <span className="block font-display text-xl font-bold">{value}</span>
                      <span className="text-xs text-ink-muted">{label}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
