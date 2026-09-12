import type { District, VehicleType } from '@tasiyoruz/contracts';
import { QuoteWidget } from './QuoteWidget';
import { Reveal } from './Reveal';

/**
 * Aramanın ilk adımı: nereden, nereye, hangi araç.
 *
 * <p>Kademeli açılım bilinçli — yük türü, ağırlık, tarih ve ek hizmetler burada
 * sorulmuyor. Kullanıcıyı sekiz alanla karşılamak, henüz fiyatı görmemiş birinden
 * form doldurmasını istemek demek. Kalan adımlar fiyat sayfasında, kullanıcı
 * karşılığını gördükten sonra geliyor.
 *
 * <p>Geniş ekranda gizli: orada aynı widget hero'nun sağ sütununda duruyor ve
 * anlatı boyunca ekranda kalıyor. Aynı formu iki kez göstermek kullanıcıya
 * hangisinin geçerli olduğunu sordururdu.
 */
export function SearchSection({
  vehicles,
  districts,
}: {
  vehicles: VehicleType[];
  /** Hizmet katalogu; olmadan İstanbul ve Ankara dışında yer seçilemiyor. */
  districts?: District[] | null;
}) {
  if (vehicles.length === 0) return null;

  return (
    <section className="theme-cream bg-bg pb-14 md:pb-20 lg:hidden">
      <div className="mx-auto grid max-w-[76rem] gap-6 px-6 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-16">
        <Reveal>
          <p className="label-mono text-muted">Başla</p>
          <h2 className="mt-3 text-[clamp(1.9rem,4vw,3.1rem)] leading-[1.05]">
            Nereden nereye?
          </h2>
          <p className="mt-4 max-w-md text-muted sm:mt-5">
            İki adres ve bir araç tipi yeterli. Tahmini fiyat aralığını kayıt olmadan
            görüyorsun; yük detayları ve tarih sonraki adımda.
          </p>
        </Reveal>

        <Reveal delay={90}>
          <QuoteWidget vehicles={vehicles} districts={districts} />
        </Reveal>
      </div>
    </section>
  );
}
