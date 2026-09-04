import type { VehicleType } from '@turmove/contracts';
import Link from 'next/link';
import { CITIES } from '@turmove/shared';
import { FleetLineup } from './FleetLineup';

/**
 * Tam genişlik, açık hava hissi veren hero. Referans ürünlerin fotoğraflı
 * kahramanının karşılığı: gökyüzü gradyanı üzerinde gerçek oranlı filo dizilimi.
 * "Her yüke uygun araç" iddiasını tek bakışta kanıtlıyor.
 */
export function Hero({ vehicles }: { vehicles: VehicleType[] }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[var(--sky-top)] to-[var(--sky-bottom)]">
      <div className="mx-auto max-w-6xl px-6 pt-14 text-center sm:pt-20">
        <span className="inline-flex items-center gap-2 rounded-pill bg-surface/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-brand-ink shadow-card backdrop-blur">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full rounded-full bg-brand animate-ring" />
            <span className="relative inline-flex size-2 rounded-full bg-brand" />
          </span>
          Komisyonsuz dönem · 2027 ilk çeyreğine kadar
        </span>

        <h1 className="mx-auto mt-6 max-w-3xl text-[clamp(2.5rem,6.5vw,4.5rem)] font-extrabold leading-[1.03]">
          Ne taşıyacağını söyle,
          <br />
          <span className="text-brand-ink">aracı biz bulalım</span>
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-lg text-ink-muted">
          Hangi aracın gerektiğini bilmenize gerek yok. Yükünüzü tarif edin; uygun aracı,
          net fiyatı ve neden o araç olduğunu tek ekranda görün.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/fiyat-hesapla"
            className="rounded-pill bg-primary px-8 py-4 text-lg font-semibold text-primary-fg shadow-lift transition hover:opacity-90"
          >
            Fiyat hesapla
          </Link>
          <Link
            href="#nasil-calisir"
            className="rounded-pill border border-line bg-surface px-8 py-4 text-lg font-semibold transition hover:border-brand"
          >
            Nasıl çalışır?
          </Link>
        </div>

        <p className="mt-4 text-sm text-ink-muted">
          Kayıt gerekmez · {CITIES.map((c) => c.name).join(' · ')}
        </p>
      </div>

      {vehicles.length > 0 && (
        <div className="mx-auto mt-10 max-w-6xl px-6 pb-16">
          <FleetLineup vehicles={vehicles} />
          <p className="mt-3 text-center text-sm text-ink-muted">
            Motordan tıra {vehicles.length} araç tipi — gerçek kasa boyu oranlarıyla
          </p>
        </div>
      )}
    </section>
  );
}
