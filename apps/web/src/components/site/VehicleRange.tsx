import type { VehicleType } from '@tasiyoruz/contracts';
import { Reveal } from './Reveal';
import { VehicleGlyph } from './VehicleGlyph';

/**
 * Aracın tipik kullanıldığı mesafe. Katalogda böyle bir alan yok; bu editoryal
 * bir açıklama, veri değil. Bilinmeyen bir kod gelirse satır boş bırakılır —
 * uydurma bir rota yazmaktansa hiç yazmamak doğru.
 */
const IDEAL_ROUTE: Record<string, string> = {
  MOTOR: 'Şehir içi · aynı gün',
  MINI_PANELVAN: 'Şehir içi ve komşu il',
  PANELVAN: 'Şehir içi · 300 km’ye kadar',
  MINIVAN: 'Şehirlerarası · tek adres',
  KAMYONET: 'Şehirlerarası · ev ve ofis',
  KAMYON: 'Uzun yol · paletli sevkiyat',
  TIR: 'Uzun yol · komple yük',
};

/**
 * Araç yelpazesi, kart ızgarası değil bir ölçek dizisi.
 *
 * <p>Araçlar küçükten büyüğe tek bir hat üzerinde sıralanıyor: kullanıcı kendi
 * yükünün bu dizide nereye düştüğünü görüyor. Kapasite tonaj yerine gerçek
 * örneklerle anlatılıyor — kimse yükünün kaç m³ olduğunu bilmiyor.
 */
export function VehicleRange({ vehicles }: { vehicles: VehicleType[] }) {
  if (vehicles.length === 0) return null;

  return (
    <section id="araclar" className="theme-cream bg-bg pb-20 md:pb-28">
      <div className="mx-auto max-w-[76rem] px-6">
        <Reveal className="lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-end lg:gap-14">
          <div>
            <p className="label-mono text-muted">Araç yelpazesi</p>
            <h2 className="mt-3 text-[clamp(1.9rem,4vw,3.1rem)] leading-[1.05]">
              Zarftan komple yüke.
            </h2>
          </div>
          <p className="mt-5 max-w-md text-muted lg:mt-0 lg:pb-2">
            Kapasiteyi tonaj yerine gerçek örneklerle gösteriyoruz — çünkü kimse yükünün
            kaç m³ olduğunu bilmiyor.
          </p>
        </Reveal>

        <ol className="relative mt-14">
          {/* Araçları birbirine bağlayan ölçek hattı */}
          <span aria-hidden className="absolute left-[7px] top-3 h-[calc(100%-2rem)] w-px bg-line" />

          {vehicles.map((vehicle, i) => {
            const soon = !vehicle.active;
            return (
              <Reveal key={vehicle.code} delay={Math.min(i, 4) * 60}>
                <li
                  className={`relative grid items-baseline gap-x-6 gap-y-1 border-b border-line py-6 pl-10 sm:grid-cols-[13rem_minmax(0,1fr)_11rem] ${
                    soon ? 'text-muted' : ''
                  }`}
                >
                  <span
                    aria-hidden
                    className={`absolute left-0 top-8 size-[15px] rounded-full border-2 bg-bg ${
                      soon ? 'border-line' : 'border-route'
                    }`}
                  />

                  <span className="flex items-center gap-3">
                    <VehicleGlyph code={vehicle.code} className="size-7 shrink-0" />
                    <span className="text-lg font-bold text-ink">{vehicle.displayName}</span>
                  </span>

                  <span className="text-sm leading-relaxed text-muted">
                    {soon ? 'Hizmete yakında açılıyor.' : vehicle.exampleLoads}
                  </span>

                  <span className="label-mono text-muted sm:text-right">
                    {soon ? 'Yakında' : capacity(vehicle)}
                    {!soon && IDEAL_ROUTE[vehicle.code] && (
                      <span className="mt-1 block normal-case tracking-normal opacity-80">
                        {IDEAL_ROUTE[vehicle.code]}
                      </span>
                    )}
                  </span>
                </li>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function capacity(v: VehicleType) {
  const weight =
    v.payloadKg >= 1000
      ? `${(v.payloadKg / 1000).toLocaleString('tr-TR')} ton`
      : `${v.payloadKg} kg`;
  return v.volumeM3 >= 1 ? `${weight} · ${v.volumeM3.toLocaleString('tr-TR')} m³` : weight;
}
