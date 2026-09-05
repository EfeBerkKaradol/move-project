import type { VehicleType } from '@tasiyoruz/contracts';
import { Reveal } from './Reveal';
import { VehicleGlyph } from './VehicleGlyph';

/**
 * Araç yelpazesi. Kapasite tonaj yerine <strong>gerçek örneklerle</strong>
 * anlatılıyor — kimse yükünün kaç m³ olduğunu bilmiyor, ama "1+1 ev eşyası"nı
 * herkes biliyor.
 */
export function VehicleRange({ vehicles }: { vehicles: VehicleType[] }) {
  return (
    <section id="araclar" className="theme-cream bg-bg py-20">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-end lg:gap-14">
          <div>
            <p className="label-mono text-[#8a5c10]">Araç yelpazesi</p>
            <h2 className="mt-3 text-[clamp(1.9rem,4vw,3.25rem)] leading-[1.06]">
              Zarftan 10 tona. Yükünüze göre araç, aracınıza göre yük.
            </h2>
          </div>
          <p className="mt-5 max-w-md text-muted lg:mt-0 lg:pb-2">
            Kapasiteyi tonaj yerine gerçek örneklerle gösteriyoruz — çünkü kimse yükünün
            kaç m³ olduğunu bilmiyor.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v, i) => {
            const soon = !v.active;
            return (
              <Reveal key={v.code} delay={i * 60}>
                <article
                  className={[
                    'h-full rounded-card p-5',
                    soon
                      ? 'border border-dashed border-line text-muted'
                      : 'border border-line bg-surface',
                  ].join(' ')}
                >
                  <VehicleGlyph code={v.code} className="size-8" />
                  <h3 className="mt-3 text-base font-bold">{v.displayName}</h3>
                  <p className="mt-1 text-sm text-muted">{v.exampleLoads}</p>
                  {soon ? (
                    <span className="label-mono mt-4 inline-block rounded bg-surface-2 px-2 py-1 text-muted">
                      Yakında
                    </span>
                  ) : (
                    <p className="label-mono mt-4 text-muted">{capacity(v)}</p>
                  )}
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function capacity(v: VehicleType) {
  const weight =
    v.payloadKg >= 1000
      ? `${(v.payloadKg / 1000).toLocaleString('tr-TR')} ton`
      : `${v.payloadKg} kg'a kadar`;
  return v.volumeM3 >= 1 ? `${weight} · ${v.volumeM3.toLocaleString('tr-TR')} m³` : weight;
}
