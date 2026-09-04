import { Reveal } from './Reveal';

/** Adımlar gerçek bir sıra — numaralandırma burada bilgi taşıyor, süs değil. */
const STEPS = [
  {
    title: 'Yükünü tarif et',
    body: 'Sekiz kategoriden birini seç, eşyalarını işaretle. Araç sorulmuyor.',
  },
  {
    title: 'Aracı biz önerelim',
    body: 'Hacim, ağırlık ve en uzun parça hesaplanır; uygun araç gerekçesiyle çıkar.',
  },
  {
    title: 'Fiyatı gör',
    body: 'Kalem kalem döküm. Gizli kalem yok, komisyon satırı sıfır olsa bile görünür.',
  },
  {
    title: 'Sipariş ver ya da pazarlık et',
    body: 'Acelesi olan hemen sipariş verir; fiyata duyarlı olan nakliyeciyle pazarlığa girer.',
  },
];

export function HowItWorks() {
  return (
    <section id="nasil-calisir" className="border-b border-line py-20">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Nasıl çalışır
          </p>
          <h2 className="mt-2 max-w-2xl font-display text-3xl font-bold sm:text-4xl">
            Dört adım, tek ekran
          </h2>
        </Reveal>

        <ol className="mt-10 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="bg-surface">
              <Reveal delay={i * 90} className="h-full p-6">
                <span className="font-display text-sm font-bold tabular-nums text-brand-ink">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-3 font-display text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-sm text-ink-muted">{step.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
