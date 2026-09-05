import { Reveal } from './Reveal';

/**
 * Ürünün farklılaştırıcısı: boş dönüş (koridor) eşleştirme.
 *
 * <p>Aşağıdaki koridor kartı örnek bir senaryoyu gösteriyor. Gerçek bir sefer
 * verisi değil; oran da henüz kaynaklandırılmadığı için rakam yer tutucu.
 * Doğrulanmamış bir istatistiği kesin sayı gibi yazmak, ürünün iddiasını
 * zayıflatır.
 */
export function BackhaulSection() {
  return (
    <section id="bos-donus" className="theme-dark bg-bg py-20">
      <div className="mx-auto max-w-6xl px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center lg:gap-16">
        <div>
        <Reveal>
          <p className="label-mono text-amber">Farkımız</p>
          <h2 className="mt-3 text-[clamp(2rem,4.5vw,3.5rem)]">Boş dönme.</h2>
          <p className="mt-5 max-w-lg text-muted">
            Yükünü bıraktığın şehirde geri dönüş rotanı kaydet. Koridoruna düşen yükleri
            sana biz getirelim — hem sen boş yol yakmayasın, hem yük sahibi daha uygun
            fiyat görsün.
          </p>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-8 flex flex-wrap items-baseline gap-x-5 gap-y-2">
            <p className="stat text-5xl text-amber">%[XX]</p>
            <p className="max-w-xs text-sm text-muted">
              şehirlerarası seferin boş dönüşle tamamlandığı tahmin ediliyor.
              <span className="mt-0.5 block opacity-70">[Kaynak eklenecek]</span>
            </p>
          </div>
        </Reveal>
        </div>

        <Reveal delay={140}>
          <CorridorCard />
        </Reveal>
      </div>
    </section>
  );
}

/** Bir seferin yükleme → teslimat → boş dönüş hattı ve dönüşe uyan ilanlar. */
function CorridorCard() {
  return (
    <figure className="mt-10 rounded-card border border-line bg-surface p-5 sm:p-6 lg:mt-0">
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span className="label-mono text-muted">34 ABC 123 · Kamyon</span>
        <span className="label-mono text-muted">Salı, 12 Mart</span>
      </figcaption>

      {/* Rota hattı: dolu bacak düz, boş dönüş kesikli */}
      <div className="mt-6" aria-hidden>
        <svg viewBox="0 0 560 12" className="w-full">
          <line x1="6" y1="6" x2="272" y2="6" stroke="var(--ink)" strokeWidth="2.5" />
          <line
            x1="272" y1="6" x2="548" y2="6"
            stroke="var(--muted)" strokeWidth="2.5"
            strokeDasharray="9 9" strokeLinecap="round" opacity="0.55"
          />
          <circle cx="6" cy="6" r="5" fill="var(--ink)" />
          <circle cx="272" cy="6" r="5" fill="var(--ink)" />
          <circle cx="548" cy="6" r="4.5" fill="var(--bg)" stroke="var(--muted)" strokeWidth="2" />
        </svg>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          ['İstanbul', 'Yükleme', 'left'],
          ['Ankara', 'Teslimat · 453 km', 'center'],
          ['İzmir', 'Dönüş · 588 km boş', 'right'],
        ].map(([city, meta, align]) => (
          <div key={city} className={align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : ''}>
            <p className="text-sm font-bold">{city}</p>
            <p className="label-mono mt-0.5 text-muted">{meta}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-field border border-amber/70 bg-[rgb(244_159_44_/_0.07)] p-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber" aria-hidden>
          <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="var(--amber-ink)"
            strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">Dönüşüne uygun 3 yük bulundu</span>
          <span className="label-mono mt-0.5 block text-muted">
            Ankara Ostim → İzmir Kemalpaşa · 14 ton
          </span>
        </span>
        <span className="stat text-lg text-amber">[₺ TUTAR]</span>
      </div>
    </figure>
  );
}
