import type { VehicleType } from '@tasiyoruz/contracts';
import { MobileClamp } from './MobileClamp';
import { Reveal } from './Reveal';
import { VehicleGlyph } from './VehicleGlyph';

/**
 * Aracın tipik kullanıldığı mesafe. Katalogda böyle bir alan yok; bu editoryal
 * bir açıklama, veri değil. Bilinmeyen bir kod gelirse satır boş bırakılır —
 * uydurma bir rota yazmaktansa hiç yazmamak doğru.
 */
const IDEAL_ROUTE: Record<string, string> = {
  MOTOR: 'Şehir içi · aynı saat',
  OTOMOBIL: 'Şehir içi · aynı gün',
  MINI_PANELVAN: 'Şehir içi ve komşu il',
  PANELVAN: 'Şehirlerarası · tek adres',
  KAMYONET: 'Şehirlerarası · ev ve ofis',
  KAMYON: 'Uzun yol · paletli sevkiyat',
  TIR: 'Uzun yol · komple yük',
};

/**
 * Araç yelpazesi. Kapasite tonaj yerine <strong>gerçek örneklerle</strong>
 * anlatılıyor — kimse yükünün kaç m³ olduğunu bilmiyor, ama "1+1 ev eşyası"nı
 * herkes biliyor.
 *
 * <p>Kart ızgarası: yedi aracın adı, örneği ve kapasitesi yan yana okunuyor.
 * Tek sütunlu ölçek listesi denenmişti; satırlar ekran genişliğine yayılınca
 * araç adı ile kapasitesi arasında yüzlerce piksel boşluk kalıyor ve sağdaki
 * metinler ikinci satıra düşüyordu.
 */
export function VehicleRange({ vehicles }: { vehicles: VehicleType[] }) {
  if (vehicles.length === 0) return null;

  return (
    <section id="araclar" className="theme-cream bg-bg pb-14 md:pb-20">
      <div className="mx-auto max-w-[76rem] px-6">
        <Reveal className="lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-end lg:gap-14">
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

        <MobileClamp maxHeight="27rem" moreLabel="Yedi aracın hepsini gör">
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {vehicles.map((vehicle, i) => {
            const soon = !vehicle.active;
            return (
              <Reveal key={vehicle.code} delay={Math.min(i, 5) * 60}>
                <article
                  className={[
                    'h-full rounded-card p-4 sm:p-5',
                    soon
                      ? 'border border-dashed border-line text-muted'
                      : 'border border-line bg-surface',
                  ].join(' ')}
                >
                  <VehicleGlyph code={vehicle.code} className="size-6" />
                  <h3 className="mt-3 text-base font-bold text-ink">{vehicle.displayName}</h3>
                  <p className="mt-1 text-sm text-muted">
                    {soon ? 'Hizmete yakında açılıyor.' : vehicle.exampleLoads}
                  </p>

                  {soon ? (
                    <span className="label-mono mt-4 inline-block rounded bg-surface-2 px-2 py-1 text-muted">
                      Yakında
                    </span>
                  ) : (
                    <p className="label-mono mt-4 text-muted">
                      {capacity(vehicle)}
                      {IDEAL_ROUTE[vehicle.code] && (
                        <span className="mt-1 block normal-case tracking-normal opacity-80">
                          {IDEAL_ROUTE[vehicle.code]}
                        </span>
                      )}
                    </p>
                  )}
                </article>
              </Reveal>
            );
          })}
        </div>
        </MobileClamp>
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
