import type { VehicleType } from '@turmove/contracts';
import { formatVolume } from '@turmove/shared';
import { Reveal } from './Reveal';

/**
 * "Bu araca ne sığar?" sorusu, araç seçiminde en çok tereddüt yaratan yer.
 * Kartlar somut örnek yüklerle, alttaki şerit ise kasa boylarını gerçek oranla
 * yan yana koyarak yanıtlıyor — ölçek doğrusal, çarpıtma yok.
 */
export function FleetShowcase({ vehicles }: { vehicles: VehicleType[] }) {
  const longest = Math.max(...vehicles.map((v) => v.innerLengthCm));

  return (
    <section id="filo" className="border-b border-line py-20">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Araç filosu
          </p>
          <h2 className="mt-2 max-w-2xl font-display text-3xl font-bold sm:text-4xl">
            Motordan tıra, her yüke uygun araç
          </h2>
          <p className="mt-3 max-w-xl text-ink-muted">
            Türkiye&apos;de herkesin bildiği isimlerle. &ldquo;Orta panelvan&rdquo; değil,
            transporter.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v, i) => (
            <Reveal key={v.code} delay={i * 60}>
              <article className="h-full rounded-card border border-line bg-surface p-5 transition hover:shadow-lift">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-lg font-bold">{v.displayName}</h3>
                  <span className="tabular-nums text-sm font-medium text-accent">
                    {formatVolume(v.volumeM3)}
                  </span>
                </div>

                <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-muted">
                  <div className="flex gap-1.5">
                    <dt>Kapasite</dt>
                    <dd className="tabular-nums font-medium text-ink">
                      {v.payloadKg.toLocaleString('tr-TR')} kg
                    </dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt>Kasa boyu</dt>
                    <dd className="tabular-nums font-medium text-ink">
                      {v.innerLengthCm.toLocaleString('tr-TR')} cm
                    </dd>
                  </div>
                </dl>

                {v.exampleLoads && (
                  <p className="mt-4 border-t border-line pt-3 text-sm text-ink-muted">
                    <span className="font-medium text-ink">Sığar:</span> {v.exampleLoads}
                  </p>
                )}
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-12">
          <div className="rounded-card border border-line bg-surface p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Kasa boyu karşılaştırması
            </p>
            <ul className="mt-4 space-y-2.5">
              {vehicles.map((v) => (
                <li key={v.code} className="flex items-center gap-4">
                  <span className="w-28 shrink-0 text-sm font-medium">{v.displayName}</span>
                  <span className="flex-1">
                    <span
                      className="block h-3 rounded-full bg-accent"
                      style={{ width: `${Math.max((v.innerLengthCm / longest) * 100, 1.5)}%` }}
                    />
                  </span>
                  <span className="w-20 shrink-0 text-right tabular-nums text-sm text-ink-muted">
                    {v.innerLengthCm.toLocaleString('tr-TR')} cm
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-ink-muted">
              200 cm&apos;lik bir yatak, hacim olarak Doblo&apos;ya sığsa bile 170 cm&apos;lik
              kasaya girmez. Öneri motoru bunu hesaba katıyor.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
